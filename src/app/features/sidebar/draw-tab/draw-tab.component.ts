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
  hint: string; // instruction shown when active
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
  private readonly snack = inject(MatSnackBar);

  readonly featureCount = computed(() => this.drawService.features().length);

  readonly tools: DrawTool[] = [
    {
      id: 'marker',
      label: 'Marcador',
      icon: 'room',
      tooltip: 'Colocar un marcador',
      description: 'Punto de interés',
      hint: 'Haz clic en el mapa para colocar el marcador.',
    },
    {
      id: 'polyline',
      label: 'Línea',
      icon: 'timeline',
      tooltip: 'Dibujar una línea',
      description: 'Camino o ruta',
      hint: 'Clic para añadir puntos. Doble clic para finalizar.',
    },
    {
      id: 'polygon',
      label: 'Polígono',
      icon: 'hexagon',
      tooltip: 'Dibujar un polígono',
      description: 'Área cerrada',
      hint: 'Clic para añadir vértices. Clic en el primer punto para cerrar.',
    },
    {
      id: 'rectangle',
      label: 'Rectángulo',
      icon: 'rectangle',
      tooltip: 'Dibujar un rectángulo',
      description: 'Zona cuadrada',
      hint: 'Clic y arrastra para dibujar el rectángulo.',
    },
    {
      id: 'circle',
      label: 'Círculo',
      icon: 'circle',
      tooltip: 'Dibujar un círculo',
      description: 'Área circular',
      hint: 'Clic en el centro y arrastra para definir el radio.',
    },
    {
      id: 'circlemarker',
      label: 'Punto',
      icon: 'fiber_manual_record',
      tooltip: 'Punto fijo en el mapa',
      description: 'Punto pequeño',
      hint: 'Haz clic en el mapa para colocar el punto.',
    },
  ];

  getToolLabel(id: DrawToolType): string {
    return this.tools.find((t) => t.id === id)?.label ?? id;
  }

  getToolHint(id: DrawToolType): string {
    return this.tools.find((t) => t.id === id)?.hint ?? '';
  }

  activateTool(toolId: DrawToolType): void {
    this.drawService.activateTool(toolId);
    const hint = this.getToolHint(toolId);
    this.snack.open(`${this.getToolLabel(toolId)}: ${hint}`, 'OK', {
      duration: 4000,
    });
  }

  clearAll(): void {
    this.drawService.clearAll();
    this.snack.open('Todas las features eliminadas', '', { duration: 2000 });
  }
}
