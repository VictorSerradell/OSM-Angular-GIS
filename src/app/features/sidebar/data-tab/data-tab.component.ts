// ============================================================
// OSM Angular GIS - Data Tab Component
// ============================================================

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DrawService } from '../../../core/services/draw.service';
import { GisFeature } from '../../../core/models/feature.model';

@Component({
  selector: 'app-data-tab',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe, // ← needed for | number pipe in template
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './data-tab.component.html',
  styleUrl: './data-tab.component.scss',
})
export class DataTabComponent {
  readonly drawService = inject(DrawService);
  private readonly snackBar = inject(MatSnackBar);

  readonly editingId = signal<string | null>(null);
  readonly editName = signal<string>('');
  readonly editDescription = signal<string>('');
  readonly importing = signal<boolean>(false);

  readonly featureCount = computed(() => this.drawService.features().length);

  // ── Import / Export ──────────────────────────────────

  onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.importing.set(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        await this.drawService.importGeoJSON(json);
        const count = json.features?.length ?? 0;
        this.snackBar.open(`✅ ${count} features importadas`, '', {
          duration: 3000,
        });
      } catch {
        this.snackBar.open('❌ GeoJSON no válido', '', { duration: 3000 });
      } finally {
        this.importing.set(false);
      }
    };
    reader.readAsText(file);
    (event.target as HTMLInputElement).value = '';
  }

  exportGeoJSON(): void {
    const blob = new Blob(
      [JSON.stringify(this.drawService.exportGeoJSON(), null, 2)],
      { type: 'application/geo+json' },
    );
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `osm-gis-${new Date().toISOString().slice(0, 10)}.geojson`,
    });
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('✅ GeoJSON exportado', '', { duration: 2000 });
  }

  exportCopy(): void {
    navigator.clipboard
      .writeText(JSON.stringify(this.drawService.exportGeoJSON(), null, 2))
      .then(() =>
        this.snackBar.open('✅ GeoJSON copiado al portapapeles', '', {
          duration: 2000,
        }),
      );
  }

  // ── Feature management ───────────────────────────────

  startEdit(feature: GisFeature): void {
    this.editingId.set(feature.properties.id);
    this.editName.set(feature.properties.name);
    this.editDescription.set(feature.properties.description ?? '');
  }

  saveEdit(): void {
    const id = this.editingId();
    if (!id) return;
    this.drawService.updateFeatureProperties(id, {
      name: this.editName(),
      description: this.editDescription(),
    });
    this.cancelEdit();
    this.snackBar.open('✅ Propiedades guardadas', '', { duration: 2000 });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editName.set('');
    this.editDescription.set('');
  }

  deleteFeature(id: string): void {
    this.drawService.deleteFeature(id);
    this.snackBar.open('Feature eliminada', '', { duration: 1500 });
  }

  flyToFeature(id: string): void {
    this.drawService.flyToFeature(id);
  }

  clearAll(): void {
    this.drawService.clearAll();
    this.snackBar.open('Todas las features eliminadas', '', { duration: 2000 });
  }

  // ── Helpers ──────────────────────────────────────────

  getFeatureIcon(feature: GisFeature): string {
    const map: Record<string, string> = {
      marker: 'room',
      circle: 'circle',
      polygon: 'hexagon',
      polyline: 'timeline',
      rectangle: 'rectangle',
      circlemarker: 'fiber_manual_record',
    };
    return map[feature.properties.drawType ?? ''] ?? 'place';
  }

  getFeatureColor(feature: GisFeature): string {
    const map: Record<string, string> = {
      marker: '#1565c0',
      circle: '#7b1fa2',
      polygon: '#1565c0',
      polyline: '#00796b',
      rectangle: '#e65100',
      circlemarker: '#c62828',
    };
    return map[feature.properties.drawType ?? ''] ?? '#1565c0';
  }

  trackById(_: number, feature: GisFeature): string {
    return feature.properties.id;
  }
}
