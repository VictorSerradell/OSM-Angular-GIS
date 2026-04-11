// ============================================================
// OSM Angular GIS - Tour Component
// ============================================================

import {
  Component,
  inject,
  signal,
  OnDestroy,
  AfterViewInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, NgStyle } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TourService, TourStep } from './tour.service';

const TIP_W = 340;
const TIP_H = 320; // generous estimate for clamping only
const MARGIN = 12;

function vp() {
  return {
    w: document.documentElement.clientWidth,
    h: document.documentElement.clientHeight,
  };
}

function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(val, max));
}

function hiddenSpotlight(): Record<string, string> {
  return {
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    opacity: '0',
    boxShadow: 'none',
  };
}

@Component({
  selector: 'app-tour',
  standalone: true,
  imports: [NgStyle, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './tour.component.html',
  styleUrl: './tour.component.scss',
})
export class TourComponent implements AfterViewInit, OnDestroy {
  readonly tour = inject(TourService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly tooltipStyle = signal<Record<string, string>>(this.safeCenter());
  readonly spotlightStyle = signal<Record<string, string>>(hiddenSpotlight());
  readonly arrowDir = signal<string>('none');

  private highlightEl: HTMLElement | null = null;
  private ro: ResizeObserver | null = null;
  private retryTimer: any = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.ro = new ResizeObserver(() => {
      if (this.tour.active()) this.positionTooltip();
    });
    this.ro.observe(document.documentElement);
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    clearTimeout(this.retryTimer);
    this.removeHighlight();
  }

  positionTooltip(attempt = 0): void {
    const step = this.tour.currentStep();
    if (!step) return;
    this.removeHighlight();

    if (step.targetSelector) {
      const el = this.findVisibleElement(step.targetSelector);

      if (el) {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.width > 0) {
          this.highlightEl = el;
          this.applySpotlight(el, r);
          this.placeTooltip(el, r, step);
          return;
        }
      }

      // Element not ready — retry
      if (attempt < 10) {
        this.retryTimer = setTimeout(
          () => this.positionTooltip(attempt + 1),
          80,
        );
        return;
      }
    }

    // No target or not found → safe center
    this.spotlightStyle.set(hiddenSpotlight());
    this.arrowDir.set('none');
    this.tooltipStyle.set(this.safeCenter());
  }

  private findVisibleElement(selector: string): HTMLElement | null {
    // Priority 1: inside active tab body
    const inActive = document.querySelector(
      '.mat-mdc-tab-body-active ' + selector,
    ) as HTMLElement | null;
    if (inActive && inActive.getBoundingClientRect().height > 0)
      return inActive;

    // Priority 2: any element with that selector that has dimensions
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.height > 0 && r.width > 0) return el as HTMLElement;
    }
    return null;
  }

  private applySpotlight(el: HTMLElement, r: DOMRect): void {
    const { w, h } = vp();
    const p = 4;

    // For sidebar components (wide, tall) — spotlight just the top 160px
    // so the user sees the content without the whole sidebar being highlighted
    const isSidebarComponent = r.width > w * 0.1 && r.height > h * 0.3;
    // For sidebar: show full height spotlight (user sees the whole panel highlighted)
    const spotH = r.height;

    this.spotlightStyle.set({
      top: `${r.top - p}px`,
      left: `${r.left - p}px`,
      width: `${r.width + p * 2}px`,
      height: `${spotH + p * 2}px`,
      opacity: '1',
      boxShadow:
        '0 0 0 3px #fff, 0 0 0 6px rgba(255,255,255,0.25), 0 0 0 9999px rgba(0,0,0,0.45)',
      transition: 'top .3s, left .3s, width .3s, height .3s',
    });

    // Don't modify position/zIndex for toolbar (breaks fixed layout)
    const isToolbar =
      el.classList.contains('gis-toolbar') || el.tagName === 'MAT-TOOLBAR';
    if (!isToolbar) {
      el.style.position = 'relative';
      el.style.zIndex = '10001';
    }
  }

  private placeTooltip(el: HTMLElement, r: DOMRect, step: TourStep): void {
    const { w, h } = vp();
    const W = TIP_W,
      H = TIP_H,
      MG = MARGIN;

    // For sidebar components: tooltip goes to the right of the sidebar,
    // vertically positioned at the TOP of the element (not center)
    // because these elements can be very tall
    const isSidebarComponent = r.width > w * 0.1 && r.height > h * 0.3;

    let top: number, left: number, dir: string;

    if (isSidebarComponent) {
      // Always place to the RIGHT of the sidebar, aligned to top of element
      left = r.right + MG;
      top = clamp(MG, r.top + 20, h - H - MG);
      dir = 'right';

      // If doesn't fit to the right, try left of screen (but sidebar is left so unlikely)
      if (left + W > w - MG) {
        // Sidebar takes left side, so right should always fit on most screens
        // Force it to stay on screen
        left = clamp(MG, left, w - W - MG);
      }
    } else {
      // Small element (e.g. FAB button): position precisely around it
      type Dir = 'top' | 'bottom' | 'left' | 'right';
      const fits: Record<Dir, boolean> = {
        bottom: r.bottom + H + MG <= h,
        top: r.top - H - MG >= 0,
        right: r.right + W + MG <= w,
        left: r.left - W - MG >= 0,
      };

      const prefer = (step.position as Dir | 'auto') ?? 'auto';
      const order: Dir[] = ['left', 'top', 'bottom', 'right'];
      const chosenDir: Dir =
        prefer !== 'auto' && fits[prefer]
          ? prefer
          : (order.find((d) => fits[d]) ?? 'top');

      dir = chosenDir;

      switch (chosenDir) {
        case 'bottom':
          top = r.bottom + MG;
          left = r.left + r.width / 2 - W / 2;
          break;
        case 'top':
          top = r.top - H - MG;
          left = r.left + r.width / 2 - W / 2;
          break;
        case 'right':
          top = r.top + r.height / 2 - H / 2;
          left = r.right + MG;
          break;
        case 'left':
          top = r.top + r.height / 2 - H / 2;
          left = r.left - W - MG;
          break;
      }
    }

    top = clamp(MG, top, h - H - MG);
    left = clamp(MG, left, w - W - MG);

    this.arrowDir.set(dir);
    this.tooltipStyle.set({
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    });
  }

  private safeCenter(): Record<string, string> {
    if (!isPlatformBrowser(this.platformId))
      return { top: '80px', left: '50%', transform: 'translateX(-50%)' };
    const { w, h } = vp();
    const left = clamp(MARGIN, (w - TIP_W) / 2, w - TIP_W - MARGIN);
    // Use rAF to re-clamp after actual render
    requestAnimationFrame(() => {
      const tooltip = document.querySelector(
        '.tour-tooltip',
      ) as HTMLElement | null;
      if (!tooltip) return;
      const actualH = tooltip.getBoundingClientRect().height;
      const maxTop = h - actualH - MARGIN;
      const top = clamp(MARGIN, Math.floor((h - actualH) / 2), maxTop);
      this.tooltipStyle.set({
        top: `${top}px`,
        left: `${left}px`,
        transform: 'none',
      });
    });
    return { top: '80px', left: `${left}px`, transform: 'none' };
  }

  private removeHighlight(): void {
    clearTimeout(this.retryTimer);
    if (this.highlightEl) {
      this.highlightEl.style.position = '';
      this.highlightEl.style.zIndex = '';
      this.highlightEl = null;
    }
    this.spotlightStyle.set(hiddenSpotlight());
  }

  next(): void {
    this.tour.next();
    setTimeout(() => this.positionTooltip(), 300);
  }
  prev(): void {
    this.tour.prev();
    setTimeout(() => this.positionTooltip(), 300);
  }
  goTo(i: number): void {
    this.tour.goTo(i);
    setTimeout(() => this.positionTooltip(), 300);
  }

  start(): void {
    this.tour.start();
    setTimeout(() => this.positionTooltip(), 350);
  }
  end(): void {
    this.removeHighlight();
    this.tour.end();
  }
}
