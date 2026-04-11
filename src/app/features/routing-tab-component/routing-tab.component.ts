import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapService } from 'src/app/core/services/map.service';
import { RoutingService, RouteProfile } from 'src/app/core/services/routing.service';


@Component({
  selector: 'app-routing-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './routing-tab.component.html',
  styleUrl: './routing-tab.component.scss',
})
export class RoutingTabComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly routing = inject(RoutingService);
  readonly mapSvc = inject(MapService);

  @ViewChild('elevChart') chartRef!: ElementRef<HTMLCanvasElement>;

  isAddingWaypoints = false;
  private mapClickHandler: any = null;
  private animFrame = 0;
  private lastResultRef: any = null;

  ngOnInit(): void {
    this.routing.setMap(this.mapSvc.map);
  }

  ngAfterViewInit(): void {
    this.watchResult();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrame);
    this.stopAddingWaypoints();
  }

  private watchResult(): void {
    const check = () => {
      const curr = this.routing.result();
      if (curr !== this.lastResultRef) {
        this.lastResultRef = curr;
        if (curr?.elevationProfile?.length) {
          setTimeout(() => this.drawElevationChart(curr.elevationProfile), 50);
        }
      }
      this.animFrame = requestAnimationFrame(check);
    };
    this.animFrame = requestAnimationFrame(check);
  }

  toggleWaypoints(): void {
    this.isAddingWaypoints
      ? this.stopAddingWaypoints()
      : this.startAddingWaypoints();
  }

  startAddingWaypoints(): void {
    this.isAddingWaypoints = true;
    const map = this.mapSvc.map as any;
    if (!map) return;
    map.getContainer().style.cursor = 'crosshair';
    this.mapClickHandler = (e: any) => this.routing.addWaypoint(e.latlng);
    map.on('click', this.mapClickHandler);
  }

  stopAddingWaypoints(): void {
    this.isAddingWaypoints = false;
    const map = this.mapSvc.map as any;
    if (!map) return;
    map.getContainer().style.cursor = '';
    if (this.mapClickHandler) {
      map.off('click', this.mapClickHandler);
      this.mapClickHandler = null;
    }
  }

  setProfile(p: RouteProfile): void {
    this.routing.setProfile(p);
  }

  /** Draw elevation profile using pure Canvas 2D — no chart.js needed */
  private drawElevationChart(profile: { dist: number; ele: number }[]): void {
    const canvas = this.chartRef?.nativeElement;
    if (!canvas || !profile.length) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 220;
    const H = canvas.offsetHeight || 110;
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const PAD = { top: 10, right: 8, bottom: 28, left: 36 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    const eles = profile.map((p) => p.ele);
    const minE = Math.min(...eles);
    const maxE = Math.max(...eles) || minE + 1;
    const maxD = profile[profile.length - 1].dist || 1;

    const toX = (d: number) => PAD.left + (d / maxD) * cW;
    const toY = (e: number) => PAD.top + cH - ((e - minE) / (maxE - minE)) * cH;

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (cH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + cW, y);
      ctx.stroke();
    }

    // Fill area
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
    grad.addColorStop(0, 'rgba(21,101,192,0.3)');
    grad.addColorStop(1, 'rgba(21,101,192,0.02)');
    ctx.beginPath();
    ctx.moveTo(toX(profile[0].dist), toY(profile[0].ele));
    profile.forEach((p) => ctx.lineTo(toX(p.dist), toY(p.ele)));
    ctx.lineTo(toX(maxD), PAD.top + cH);
    ctx.lineTo(toX(0), PAD.top + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    profile.forEach((p, i) => {
      i === 0
        ? ctx.moveTo(toX(p.dist), toY(p.ele))
        : ctx.lineTo(toX(p.dist), toY(p.ele));
    });
    ctx.stroke();

    // Y-axis labels (elevation)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 2; i++) {
      const e = minE + ((maxE - minE) / 2) * i;
      const y = toY(e);
      ctx.fillText(`${Math.round(e)}m`, PAD.left - 3, y + 3);
    }

    // X-axis labels (distance)
    ctx.textAlign = 'center';
    const steps = Math.min(4, profile.length - 1);
    for (let i = 0; i <= steps; i++) {
      const idx = Math.floor((i / steps) * (profile.length - 1));
      const p = profile[idx];
      const km = (p.dist / 1000).toFixed(1);
      ctx.fillText(`${km}km`, toX(p.dist), H - 8);
    }

    // Axes
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top);
    ctx.lineTo(PAD.left, PAD.top + cH);
    ctx.lineTo(PAD.left + cW, PAD.top + cH);
    ctx.stroke();
  }
}
