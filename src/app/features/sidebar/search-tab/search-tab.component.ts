// ============================================================
// OSM Angular GIS - Search Tab Component
// ============================================================

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { GeocodingService } from '../../../core/services/geocoding.service';
import { MapService } from '../../../core/services/map.service';
import { NominatimResult } from '../../../core/models/search.model';

@Component({
  selector: 'app-search-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
  ],
  templateUrl: './search-tab.component.html',
  styleUrl: './search-tab.component.scss',
})
export class SearchTabComponent {
  readonly geocodingService = inject(GeocodingService);
  readonly mapService = inject(MapService);

  readonly searchQuery = signal<string>('');
  readonly recentSearches = signal<NominatimResult[]>([]);

  // Quick search presets
  readonly quickSearches = [
    { label: 'Madrid', query: 'Madrid, España' },
    { label: 'Barcelona', query: 'Barcelona, España' },
    { label: 'París', query: 'París, Francia' },
    { label: 'Londres', query: 'Londres, Reino Unido' },
  ];

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.geocodingService.search(value);
  }

  onSelect(result: NominatimResult): void {
    // Fit map to result bbox or fly to coords
    const bb = result.boundingbox;
    if (bb?.length === 4) {
      this.mapService.fitBounds([
        parseFloat(bb[0]),
        parseFloat(bb[1]),
        parseFloat(bb[2]),
        parseFloat(bb[3]),
      ]);
    } else {
      this.mapService.flyTo(parseFloat(result.lat), parseFloat(result.lon), 15);
    }

    // Update recent
    this.recentSearches.update((prev) => {
      const filtered = prev.filter((r) => r.place_id !== result.place_id);
      return [result, ...filtered].slice(0, 5);
    });

    this.searchQuery.set(result.display_name.split(',')[0]);
    this.geocodingService.clearResults();
  }

  onQuickSearch(query: string): void {
    this.searchQuery.set(query);
    this.geocodingService.search(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.geocodingService.clearResults();
  }

  clearRecent(): void {
    this.recentSearches.set([]);
  }
}
