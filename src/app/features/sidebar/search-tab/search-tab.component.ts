import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  readonly geo = inject(GeocodingService);
  readonly map = inject(MapService);

  readonly query = signal<string>('');
  readonly recent = signal<NominatimResult[]>([]);

  private _skip = false;

  readonly quick = [
    { label: 'Madrid', q: 'Madrid España' },
    { label: 'Barcelona', q: 'Barcelona España' },
    { label: 'París', q: 'Paris France' },
    { label: 'Londres', q: 'London United Kingdom' },
  ];

  onInput(e: Event): void {
    if (this._skip) {
      this._skip = false;
      return;
    }
    const v = (e.target as HTMLInputElement).value;
    this.query.set(v);
    this.geo.search(v);
  }

  onSelect(r: NominatimResult): void {
    const bb = r.boundingbox;
    if (bb?.length === 4) {
      this.map.fitBounds([+bb[0], +bb[1], +bb[2], +bb[3]]);
    } else {
      this.map.flyTo(+r.lat, +r.lon, 13);
    }
    this.recent.update((p) =>
      [r, ...p.filter((x) => x.place_id !== r.place_id)].slice(0, 5),
    );
    this._skip = true;
    this.query.set(this.geo.getName(r));
    this.geo.markSelected();
  }

  onQuick(q: string): void {
    this.query.set(q);
    this.geo.search(q);
  }

  clear(): void {
    this.query.set('');
    this.geo.clearResults();
  }
  clearRecent(): void {
    this.recent.set([]);
  }
}
