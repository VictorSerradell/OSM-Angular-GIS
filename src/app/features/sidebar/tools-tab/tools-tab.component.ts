// ============================================================
// OSM Angular GIS - Tools Tab Component (Análisis Geoespacial)
// ============================================================

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSliderModule } from '@angular/material/slider';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { TitleCasePipe } from '@angular/common';

import { MeasurementService, MeasurementTool } from '../../../core/services/measurement.service';
import { DrawService } from '../../../core/services/draw.service';

interface AnalysisTool {
  id: MeasurementTool;
  label: string;
  icon: string;
  description: string;
  color: string;
  interactive: boolean; // requires map clicks
}

@Component({
  selector: 'app-tools-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatSliderModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    MatListModule,
    TitleCasePipe,
  ],
  templateUrl: './tools-tab.component.html',
  styleUrl: './tools-tab.component.scss',
})
export class ToolsTabComponent {
  readonly measurementService = inject(MeasurementService);
  readonly drawService = inject(DrawService);
  private readonly snackBar = inject(MatSnackBar);

  readonly bufferRadius = signal<number>(1);
  readonly isProcessing = signal<boolean>(false);

  readonly hasFeatures = computed(() => this.drawService.features().length > 0);

  readonly tools: AnalysisTool[] = [
    {
      id: 'distance',
      label: 'Medir distancia',
      icon: 'straighten',
      description: 'Clic en el mapa para medir distancia acumulada entre puntos.',
      color: '#f57c00',
      interactive: true,
    },
    {
      id: 'area',
      label: 'Medir área',
      icon: 'square_foot',
      description: 'Clic en el mapa para definir un polígono y medir su área.',
      color: '#7b1fa2',
      interactive: true,
    },
  ];

  toggleMeasureTool(toolId: MeasurementTool): void {
    const isActive = this.measurementService.activeTool() === toolId;
    if (isActive) {
      this.measurementService.stopTool();
      this.snackBar.open('Medición detenida', '', { duration: 1500 });
    } else {
      this.measurementService.startTool(toolId);
      const tool = this.tools.find((t) => t.id === toolId);
      if (tool) {
        this.snackBar.open(tool.description, 'OK', { duration: 4000 });
      }
    }
  }

  stopMeasurement(): void {
    this.measurementService.stopTool();
  }

  clearMeasurements(): void {
    this.measurementService.stopTool();
    this.measurementService.clearMeasurements();
    this.snackBar.open('Mediciones eliminadas', '', { duration: 1500 });
  }

  async applyBuffer(): Promise<void> {
    if (!this.hasFeatures()) {
      this.snackBar.open('⚠️ Dibuja features primero', '', { duration: 2500 });
      return;
    }
    this.isProcessing.set(true);
    try {
      const geojson = this.drawService.exportGeoJSON();
      const result = await this.measurementService.calculateBuffer(
        geojson as any,
        this.bufferRadius()
      );
      if (result) {
        const res = this.measurementService.lastResult();
        this.snackBar.open(
          `✅ Buffer ${this.bufferRadius()} km → ${res?.formattedValue ?? ''}`,
          '',
          { duration: 3000 }
        );
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  async applyCentroid(): Promise<void> {
    if (!this.hasFeatures()) {
      this.snackBar.open('⚠️ Dibuja features primero', '', { duration: 2500 });
      return;
    }
    this.isProcessing.set(true);
    try {
      const geojson = this.drawService.exportGeoJSON();
      await this.measurementService.calculateCentroid(geojson as any);
      const res = this.measurementService.lastResult();
      this.snackBar.open(`✅ Centroide: ${res?.formattedValue ?? ''}`, '', { duration: 3000 });
    } finally {
      this.isProcessing.set(false);
    }
  }

  onBufferRadiusChange(value: number): void {
    this.bufferRadius.set(value);
  }
}
