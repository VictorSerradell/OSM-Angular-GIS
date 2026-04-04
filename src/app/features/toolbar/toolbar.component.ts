// ============================================================
// OSM Angular GIS - Toolbar Component
// ============================================================

import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';

import { ThemeService } from '../../core/services/theme.service';
import { DrawService } from '../../core/services/draw.service';
import { MeasurementService } from '../../core/services/measurement.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    MatChipsModule,
  ],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
})
export class ToolbarComponent {
  // ── Injections ─────────────────────────────────────────
  readonly themeService = inject(ThemeService);
  readonly drawService = inject(DrawService);
  readonly measurementService = inject(MeasurementService);

  // ── Inputs ─────────────────────────────────────────────
  readonly sidebarOpen = input<boolean>(true);
  readonly isFullscreen = input<boolean>(false);

  // ── Outputs ────────────────────────────────────────────
  readonly toggleSidebar = output<void>();
  readonly toggleTheme = output<void>();
  readonly toggleFullscreen = output<void>();
  readonly clearAll = output<void>();
  readonly exportGeoJSON = output<void>();
  readonly clearMeasurements = output<void>();
  readonly navigateToTab = output<number>();

  // ── Computed ───────────────────────────────────────────
  readonly featureCount = computed(() => this.drawService.features().length);
  readonly hasMeasurement = computed(() => !!this.measurementService.lastResult());
}
