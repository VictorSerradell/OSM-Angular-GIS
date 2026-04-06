// ============================================================
// OSM Angular GIS - Geocoding Service (Nominatim + Overpass)
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
import { NominatimResult, OverpassResponse } from '../models/search.model';

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private http = inject(HttpClient);

  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  private readonly OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  readonly searchResults = signal<NominatimResult[]>([]);
  readonly isSearching = signal<boolean>(false);
  readonly searchError = signal<string | null>(null);

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.trim().length < 3) {
            this.searchResults.set([]);
            this.isSearching.set(false);
            return of([]);
          }

          this.isSearching.set(true);
          this.searchError.set(null);

          const params = new HttpParams()
            .set('q', query)
            .set('format', 'json')
            .set('limit', '8')
            .set('addressdetails', '1')
            .set('countrycodes', '') // Remove to search globally
            .set('accept-language', 'es,en');

          const headers = {
            'Accept-Language': 'es,en',
            'User-Agent': 'OSM-Angular-GIS/1.0',
          };
          return this.http
            .get<NominatimResult[]>(this.NOMINATIM_URL, { params, headers })
            .pipe(
              catchError((err) => {
                this.searchError.set('Error al buscar. Intenta de nuevo.');
                return of([]);
              }),
            );
        }),
      )
      .subscribe((results) => {
        this.isSearching.set(false);
        this.searchResults.set(results);
      });
  }

  /**
   * Trigger a search with debounce.
   */
  search(query: string): void {
    this.searchSubject.next(query);
  }

  /**
   * Direct geocode without debounce.
   */
  geocode(query: string): Promise<NominatimResult[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('format', 'json')
      .set('limit', '5')
      .set('addressdetails', '1');

    return this.http
      .get<NominatimResult[]>(this.NOMINATIM_URL, { params })
      .toPromise()
      .then((r) => r ?? []);
  }

  /**
   * Reverse geocode coordinates.
   */
  reverseGeocode(lat: number, lon: number): Promise<NominatimResult | null> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString())
      .set('format', 'json')
      .set('addressdetails', '1');

    return this.http
      .get<NominatimResult>('https://nominatim.openstreetmap.org/reverse', {
        params,
      })
      .toPromise()
      .then((r) => r ?? null)
      .catch(() => null);
  }

  /**
   * Query the Overpass API with custom query.
   * Replaces {{bbox}} with current map bounds.
   */
  overpassQuery(query: string, bbox?: string): Promise<OverpassResponse> {
    let processedQuery = query;
    if (bbox) {
      processedQuery = query.replace('{{bbox}}', bbox);
    }

    return this.http
      .post<OverpassResponse>(this.OVERPASS_URL, processedQuery, {
        headers: { 'Content-Type': 'text/plain' },
      })
      .toPromise()
      .then((r) => r ?? { version: 0, generator: '', elements: [] });
  }

  clearResults(): void {
    this.searchResults.set([]);
    this.searchError.set(null);
  }

  /**
   * Format display name to be shorter.
   */
  formatDisplayName(name: string): string {
    const parts = name.split(',');
    return parts.slice(0, 3).join(',').trim();
  }

  /**
   * Get icon name for a Nominatim result type.
   */
  getResultIcon(result: NominatimResult): string {
    const typeMap: Record<string, string> = {
      city: 'location_city',
      town: 'location_city',
      village: 'home',
      road: 'add_road',
      street: 'add_road',
      country: 'flag',
      state: 'map',
      postcode: 'markunread_mailbox',
      amenity: 'place',
      building: 'business',
      restaurant: 'restaurant',
      hospital: 'local_hospital',
      school: 'school',
    };
    return typeMap[result.type] ?? typeMap[result.class] ?? 'place';
  }
}
