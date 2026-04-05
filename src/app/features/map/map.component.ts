// ============================================================
// OSM Angular GIS - Map Component (orchestrator)
// ============================================================

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ToolbarComponent } from '../toolbar/toolbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { TourComponent } from '../tour/tour.component';

import { MapService } from '../../core/services/map.service';
import { LayerService } from '../../core/services/layer.service';
import { DrawService } from '../../core/services/draw.service';
import { MeasurementService } from '../../core/services/measurement.service';
import { ThemeService } from '../../core/services/theme.service';
import { TourService } from '../tour/tour.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ToolbarComponent,
    SidebarComponent,
    MapControlsComponent,
    TourComponent,
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  readonly mapService = inject(MapService);
  readonly layerService = inject(LayerService);
  readonly drawService = inject(DrawService);
  readonly measureService = inject(MeasurementService);
  readonly themeService = inject(ThemeService);
  readonly tourService = inject(TourService);
  private readonly snack = inject(MatSnackBar);

  readonly sidebarOpen = signal<boolean>(true);
  readonly selectedTabIndex = signal<number>(0);
  readonly isFullscreen = signal<boolean>(false);
  readonly loading = signal<boolean>(true);
  readonly featureCount = computed(() => this.drawService.features().length);

  ngOnInit(): void {
    document.addEventListener('fullscreenchange', () =>
      this.isFullscreen.set(!!document.fullscreenElement),
    );
  }

  async ngAfterViewInit(): Promise<void> {
    // Small delay to let Angular Material apply its CSS before Leaflet measures the container
    await new Promise((r) => setTimeout(r, 50));
    await this.initMap();
  }

  private async initMap(): Promise<void> {
    try {
      this.loading.set(true);
      await this.mapService.initMap(this.mapContainerRef.nativeElement);
      await this.layerService.initLayers();
      await this.drawService.initDraw();
      this.snack.open('✅ Mapa listo', '', { duration: 2000 });

      this.tourService.registerTabSwitcher((i) => this.navigateToTab(i));

      if (this.tourService.shouldAutoStart()) {
        setTimeout(() => this.tourService.start(), 1000);
      }
    } catch (err) {
      console.error('Map init error:', err);
      this.snack.open('❌ Error al cargar el mapa', 'Reintentar', {
        duration: 5000,
      });
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.mapService.destroy();
    this.measureService.stopTool();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
    this.mapService.invalidateSize();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
  toggleFullscreen(): void {
    this.mapService.toggleFullscreen();
  }

  clearAll(): void {
    this.drawService.clearAll();
    this.snack.open('Features eliminadas', '', { duration: 2000 });
  }

  exportGeoJSON(): void {
    const blob = new Blob(
      [JSON.stringify(this.drawService.exportGeoJSON(), null, 2)],
      { type: 'application/geo+json' },
    );
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: url,
      download: `osm-gis-${new Date().toISOString().slice(0, 10)}.geojson`,
    }).click();
    URL.revokeObjectURL(url);
    this.snack.open('✅ GeoJSON exportado', '', { duration: 2000 });
  }

  clearMeasurements(): void {
    this.measureService.stopTool();
    this.measureService.clearMeasurements();
    this.snack.open('Mediciones eliminadas', '', { duration: 1500 });
  }

  navigateToTab(index: number): void {
    this.selectedTabIndex.set(index);
    if (!this.sidebarOpen()) {
      this.sidebarOpen.set(true);
      this.mapService.invalidateSize();
    }
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
  }
}
