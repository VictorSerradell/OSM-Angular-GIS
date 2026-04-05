// ============================================================
// OSM Angular GIS - Tour Component
// Uses document.documentElement.clientWidth/clientHeight
// which gives the VISIBLE viewport (excludes devtools/scrollbars)
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

const TIP_W = 300;
const TIP_H = 260;
const MARGIN = 16;

/** Returns the actual visible viewport dimensions (excludes devtools panels) */
function vp() {
  return {
    w: document.documentElement.clientWidth,
    h: document.documentElement.clientHeight,
  };
}

/** Hidden spotlight: no box-shadow so white lines don't flash on the map */
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

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Reposition on any resize (including devtools open/close)
    this.ro = new ResizeObserver(() => {
      if (this.tour.active()) this.positionTooltip();
    });
    this.ro.observe(document.documentElement);
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    this.removeHighlight();
  }

  positionTooltip(): void {
    const step = this.tour.currentStep();
    if (!step) return;
    this.removeHighlight();

    if (step.targetSelector) {
      const el = document.querySelector(
        step.targetSelector,
      ) as HTMLElement | null;
      if (el) {
        this.highlightEl = el;
        this.applySpotlight(el);
        this.computePosition(el, step);
        return;
      }
    }

    this.spotlightStyle.set(hiddenSpotlight());
    this.arrowDir.set('none');
    this.tooltipStyle.set(this.safeCenter());
  }

  private safeCenter(): Record<string, string> {
    if (!isPlatformBrowser(this.platformId)) {
      return { top: '80px', left: '50%', transform: 'translateX(-50%)' };
    }
    const { w } = vp();
    // Place in upper-center area — always visible regardless of viewport height
    const left = clamp(MARGIN, (w - TIP_W) / 2, w - TIP_W - MARGIN);
    const top = 80; // fixed distance from top (below toolbar)
    return { top: `${top}px`, left: `${left}px`, transform: 'none' };
  }

  private applySpotlight(el: HTMLElement): void {
    const r = el.getBoundingClientRect();
    const p = 8;
    this.spotlightStyle.set({
      top: `${r.top - p}px`,
      left: `${r.left - p}px`,
      width: `${r.width + p * 2}px`,
      height: `${r.height + p * 2}px`,
    });
    el.style.position = 'relative';
    el.style.zIndex = '10001';
  }

  private computePosition(el: HTMLElement, step: TourStep): void {
    const r = el.getBoundingClientRect();
    const { w, h } = vp();
    const W = TIP_W;
    const H = TIP_H;
    const MG = MARGIN;
    type Dir = 'top' | 'bottom' | 'left' | 'right';

    const fits: Record<Dir, boolean> = {
      bottom: r.bottom + H + MG <= h,
      top: r.top - H - MG >= 0,
      right: r.right + W + MG <= w,
      left: r.left - W - MG >= 0,
    };

    const prefer = step.position ?? 'auto';
    const order: Dir[] = ['bottom', 'right', 'top', 'left'];
    let dir: Dir =
      prefer !== 'auto' && fits[prefer as Dir]
        ? (prefer as Dir)
        : (order.find((d) => fits[d]) ?? 'bottom');

    this.arrowDir.set(dir);
    let top = 0;
    let left = 0;

    switch (dir) {
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

    // Hard-clamp to visible viewport
    left = clamp(MG, left, w - W - MG);
    top = clamp(MG, top, h - H - MG);

    this.tooltipStyle.set({
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    });
  }

  private removeHighlight(): void {
    if (this.highlightEl) {
      this.highlightEl.style.position = '';
      this.highlightEl.style.zIndex = '';
      this.highlightEl = null;
    }
    this.spotlightStyle.set(hiddenSpotlight());
  }

  next(): void {
    this.tour.next();
    setTimeout(() => this.positionTooltip(), 180);
  }
  prev(): void {
    this.tour.prev();
    setTimeout(() => this.positionTooltip(), 180);
  }
  goTo(i: number): void {
    this.tour.goTo(i);
    setTimeout(() => this.positionTooltip(), 180);
  }

  start(): void {
    this.tour.start();
    setTimeout(() => this.positionTooltip(), 200);
  }

  end(): void {
    this.removeHighlight();
    this.tour.end();
  }
}

function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(val, max));
}
