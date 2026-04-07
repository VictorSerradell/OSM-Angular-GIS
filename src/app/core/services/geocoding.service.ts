// ============================================================
// OSM Angular GIS - Geocoding Service (Nominatim jsonv2)
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
} from 'rxjs';
import { Subject } from 'rxjs';
import { NominatimResult } from '../models/search.model';

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private http = inject(HttpClient);

  private readonly URL = 'https://nominatim.openstreetmap.org/search';

  readonly searchResults = signal<NominatimResult[]>([]);
  readonly isSearching = signal<boolean>(false);
  readonly searchError = signal<string | null>(null);
  readonly hasSelection = signal<boolean>(false);

  private sub$ = new Subject<string>();

  constructor() {
    this.sub$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.trim().length < 3) {
            this.searchResults.set([]);
            this.isSearching.set(false);
            return of([] as NominatimResult[]);
          }
          this.isSearching.set(true);
          this.searchError.set(null);
          this.hasSelection.set(false);

          const params = new HttpParams()
            .set('q', query)
            .set('format', 'jsonv2')
            .set('limit', '8')
            .set('addressdetails', '1')
            .set('namedetails', '1')
            .set('accept-language', 'es,en');

          return this.http.get<NominatimResult[]>(this.URL, { params }).pipe(
            catchError(() => {
              this.searchError.set('Error al buscar. Intenta de nuevo.');
              return of([] as NominatimResult[]);
            }),
          );
        }),
      )
      .subscribe((results) => {
        this.isSearching.set(false);
        this.searchResults.set(results);
      });
  }

  search(query: string): void {
    this.sub$.next(query);
  }

  clearResults(): void {
    this.searchResults.set([]);
    this.searchError.set(null);
  }

  markSelected(): void {
    this.hasSelection.set(true);
    this.clearResults();
  }

  // ── Display helpers ───────────────────────────────────

  /** Primary display name: uses 'name' field (short), falls back to display_name */
  getName(r: NominatimResult): string {
    // 'name' is the short local name (e.g. "Madrid")
    if (r.name && r.name.trim()) return r.name.trim();
    // display_name is the full address string
    const dn = r.display_name ?? '';
    const part = dn.split(',')[0].trim();
    return part || dn || `${r.lat}, ${r.lon}`;
  }

  /** Secondary line: country/region from display_name */
  getSubtitle(r: NominatimResult): string {
    const dn = r.display_name ?? '';
    const parts = dn
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // Skip first part (that's the name), show next 2
    return parts.slice(1, 3).join(', ');
  }

  /** Category label shown as badge */
  getCategory(r: NominatimResult): string {
    // jsonv2 uses 'category', fall back to 'type'
    const cat = (r as any).category ?? r.type ?? '';
    const labels: Record<string, string> = {
      administrative: 'Admin',
      place: 'Lugar',
      boundary: 'Límite',
      highway: 'Vía',
      amenity: 'Servicio',
      natural: 'Natural',
      building: 'Edificio',
      landuse: 'Territorio',
    };
    return labels[cat] ?? cat;
  }

  /** Icon for result type */
  getIcon(r: NominatimResult): string {
    const cat = (r as any).category ?? r.type ?? '';
    const map: Record<string, string> = {
      administrative: 'account_balance',
      place: 'place',
      boundary: 'map',
      highway: 'add_road',
      amenity: 'local_cafe',
      natural: 'park',
      building: 'business',
      landuse: 'terrain',
    };
    const typeMap: Record<string, string> = {
      city: 'location_city',
      town: 'location_city',
      village: 'home',
      country: 'flag',
      state: 'map',
      postcode: 'markunread_mailbox',
    };
    return typeMap[r.type] ?? map[cat] ?? 'place';
  }
}
