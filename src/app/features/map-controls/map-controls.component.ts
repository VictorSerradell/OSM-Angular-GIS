// ============================================================
// OSM Angular GIS - Map Controls Component
// ============================================================

import {
  Component,
  inject,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MapService } from '../../core/services/map.service';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './map-controls.component.html',
  styleUrl:    './map-controls.component.scss',
})
export class MapControlsComponent {
  // inject MapService with explicit type so TypeScript is happy
  private readonly _map = inject<MapService>(MapService);
  private readonly snackBar = inject(MatSnackBar);

  // Expose as typed getter so templates don't see `unknown`
  get ms(): MapService { return this._map; }

  readonly sidebarOpen = input<boolean>(true);
  readonly openSidebar = output<void>();

  readonly latDisplay = computed(() =>
    this._map.coordinates().lat.toFixed(6)
  );
  readonly lngDisplay = computed(() =>
    this._map.coordinates().lng.toFixed(6)
  );
  readonly zoomDisplay = computed(() =>
    this._map.coordinates().zoom
  );
  readonly hasUserLocation = computed(
    () => !!this._map.userLocation()
  );
  readonly isLocating = computed(() => this._map.isLocating());

  async locateUser(): Promise<void> {
    try {
      await this._map.locateUser();
      this.snackBar.open('📍 Ubicación encontrada', '', { duration: 2000 });
    } catch (err: any) {
      this.snackBar.open(`❌ ${err?.message ?? 'Sin ubicación'}`, '', { duration: 3500 });
    }
  }

  flyToUserLocation(): void {
    const loc = this._map.userLocation();
    if (loc) this._map.flyTo(loc.lat, loc.lng, 16);
  }

  copyCoords(): void {
    const { lat, lng } = this._map.coordinates();
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(text).then(() =>
      this.snackBar.open(`📋 Copiado: ${text}`, '', { duration: 2000 })
    );
  }
}
