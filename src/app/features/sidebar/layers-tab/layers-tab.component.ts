// ============================================================
// OSM Angular GIS - Layers Tab Component
// ============================================================

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

import { LayerService } from '../../../core/services/layer.service';
import { BASE_LAYERS } from '../../../core/models/layer.model';

@Component({
  selector: 'app-layers-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatButtonModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './layers-tab.component.html',
  styleUrl: './layers-tab.component.scss',
})
export class LayersTabComponent {
  readonly layerService = inject(LayerService);
  private readonly snackBar = inject(MatSnackBar);

  readonly baseLayers = BASE_LAYERS;

  switchBaseLayer(layerId: string): void {
    this.layerService.switchBaseLayer(layerId);
    const name = this.baseLayers.find((l) => l.id === layerId)?.name;
    this.snackBar.open(`Capa: ${name}`, '', { duration: 1500 });
  }

  toggleOverlay(overlayId: string): void {
    this.layerService.toggleOverlay(overlayId);
  }
}
