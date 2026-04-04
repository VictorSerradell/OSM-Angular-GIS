// ============================================================
// OSM Angular GIS - Draw Tab Component
// ============================================================

import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DrawService } from '../../../core/services/draw.service';
import { DrawToolType } from '../../../core/models/feature.model';

interface DrawTool {
  id: DrawToolType;
  label: string;
  icon: string;
  tooltip: string;
  description: string;
}

@Component({
  selector: 'app-draw-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './draw-tab.component.html',
  styleUrl: './draw-tab.component.scss',
})
export class DrawTabComponent {
  readonly drawService = inject(DrawService);
  private readonly snackBar = inject(MatSnackBar);

  readonly featureCount = computed(() => this.drawService.features().length);

  readonly tools: DrawTool[] = [
    {
      id: 'marker',
      label: 'Marcador',
      icon: 'room',
      tooltip: 'Colocar un marcador',
      description: 'Punto de interés',
    },
    {
      id: 'polyline',
      label: 'Línea',
      icon: 'timeline',
      tooltip: 'Dibujar una línea',
      description: 'Camino o ruta',
    },
    {
      id: 'polygon',
      label: 'Polígono',
      icon: 'hexagon',
      tooltip: 'Dibujar un polígono',
      description: 'Área cerrada',
    },
    {
      id: 'rectangle',
      label: 'Rectángulo',
      icon: 'rectangle',
      tooltip: 'Dibujar un rectángulo',
      description: 'Zona cuadrada',
    },
    {
      id: 'circle',
      label: 'Círculo',
      icon: 'circle',
      tooltip: 'Dibujar un círculo',
      description: 'Área circular',
    },
    {
      id: 'circlemarker',
      label: 'Punto',
      icon: 'fiber_manual_record',
      tooltip: 'Colocar un punto fijo',
      description: 'Punto pequeño',
    },
  ];

  /** Used in template to avoid arrow functions inside {{ }} */
  getToolLabel(id: DrawToolType): string {
    return this.tools.find((t) => t.id === id)?.label ?? id;
  }

  activateTool(toolId: DrawToolType): void {
    this.drawService.activateTool(toolId);
    this.snackBar.open(
      `${this.getToolLabel(toolId)} activo — haz clic en el mapa`,
      'OK',
      { duration: 3000 },
    );
  }

  clearAll(): void {
    this.drawService.clearAll();
    this.snackBar.open('Todas las features eliminadas', '', { duration: 2000 });
  }
}
