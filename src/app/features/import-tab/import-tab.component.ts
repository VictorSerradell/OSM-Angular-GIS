import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ImportService } from 'src/app/core/services/import.service';
import { MapService } from 'src/app/core/services/map.service';


@Component({
  selector: 'app-import-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './import-tab.component.html',
  styleUrl: './import-tab.component.scss',
})
export class ImportTabComponent {
  readonly importer = inject(ImportService);
  readonly mapSvc = inject(MapService);

  isDragging = false;

  /** Opens a hidden file input programmatically */
  openFileDialog(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gpx,.kml,.geojson,.json,.csv,.txt';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.handleFile(file);
    };
    input.click();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }
  onDragLeave(): void {
    this.isDragging = false;
  }

  private handleFile(file: File): void {
    this.importer.setMap(this.mapSvc.map);
    this.importer.importFile(file);
  }
}
