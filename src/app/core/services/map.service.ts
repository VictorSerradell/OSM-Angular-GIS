// ============================================================
// OSM Angular GIS - Map Service
// ============================================================

import {
  Injectable,
  signal,
  computed,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as L from 'leaflet';
import { CoordinatesDisplay, MapState } from '../models/feature.model';

@Injectable({ providedIn: 'root' })
export class MapService {
  private platformId = inject(PLATFORM_ID);

  // Signals
  readonly mapReady = signal<boolean>(false);
  readonly coordinates = signal<CoordinatesDisplay>({ lat: 0, lng: 0, zoom: 2 });
  readonly isLocating = signal<boolean>(false);
  readonly userLocation = signal<L.LatLng | null>(null);

  private _map: L.Map | null = null;
  private _userMarker: L.Marker | null = null;
  private _userCircle: L.Circle | null = null;

  get map(): L.Map | null {
    return this._map;
  }

  /**
   * Initialize the Leaflet map on a given HTML element.
   */
  async initMap(container: HTMLElement): Promise<L.Map> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Map can only be initialized in browser environment');
    }

    const L = await import('leaflet');

    // Fix default icon URLs for bundled environments
    this.fixLeafletIcons(L);

    // Destroy existing instance if HMR re-initialized the component
    if (this._map) {
      this._map.remove();
      this._map = null;
    }

    // Also clean up any Leaflet state left on the container element
    const containerAny = container as any;
    if (containerAny._leaflet_id) {
      delete containerAny._leaflet_id;
    }

    this._map = L.map(container, {
      center: [40.416775, -3.70379], // Madrid by default
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    // Track coordinates on mouse move
    this._map.on('mousemove', (e: L.LeafletMouseEvent) => {
      this.coordinates.set({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        zoom: this._map!.getZoom(),
      });
    });

    // Track zoom changes
    this._map.on('zoomend', () => {
      const center = this._map!.getCenter();
      this.coordinates.update((c) => ({ ...c, zoom: this._map!.getZoom() }));
    });

    // Scale control
    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(this._map);

    this.mapReady.set(true);

    // In production, CSS may still be applying — invalidate size repeatedly
    // to ensure Leaflet has correct dimensions
    [100, 300, 600, 1200].forEach(ms =>
      setTimeout(() => this._map?.invalidateSize(), ms)
    );

    return this._map;
  }

  /**
   * Fly to a specific location on the map.
   */
  flyTo(lat: number, lng: number, zoom: number = 15): void {
    this._map?.flyTo([lat, lng], zoom, { duration: 1.5 });
  }

  /**
   * Fit map bounds to given bounding box.
   */
  fitBounds(bbox: [number, number, number, number]): void {
    // bbox from Nominatim: [south, north, west, east]
    const [south, north, west, east] = bbox;
    this._map?.fitBounds([[south, west], [north, east]], { padding: [20, 20] });
  }

  /**
   * Geolocate the user using browser API.
   */
  async locateUser(): Promise<void> {
    if (!this._map) return;
    const L = await import('leaflet');

    this.isLocating.set(true);

    return new Promise((resolve, reject) => {
      this._map!.locate({ setView: true, maxZoom: 16 });

      this._map!.once('locationfound', (e: L.LocationEvent) => {
        this.isLocating.set(false);
        this.userLocation.set(e.latlng);

        // Remove previous markers
        this._userMarker?.remove();
        this._userCircle?.remove();

        // Custom user marker — fully inline styles for cross-browser compat
        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width:20px;height:20px;border-radius:50%;
              background:rgba(21,101,192,0.2);
              display:flex;align-items:center;justify-content:center;
              animation:location-pulse 2s ease-in-out infinite;
            ">
              <div style="
                width:12px;height:12px;border-radius:50%;
                background:#1565c0;
                border:2.5px solid white;
                box-shadow:0 2px 8px rgba(21,101,192,0.6);
              "></div>
            </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        this._userMarker = L.marker(e.latlng, { icon })
          .addTo(this._map!)
          .bindPopup(`
            <div style="padding:8px">
              <strong>Tu ubicación</strong><br/>
              <small>${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}</small><br/>
              <small>Precisión: ±${Math.round(e.accuracy)}m</small>
            </div>
          `)
          .openPopup();

        this._userCircle = L.circle(e.latlng, {
          radius: e.accuracy,
          color: '#1565c0',
          fillColor: '#1565c0',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(this._map!);

        resolve();
      });

      this._map!.once('locationerror', (e: L.ErrorEvent) => {
        this.isLocating.set(false);
        reject(new Error(e.message));
      });
    });
  }

  /**
   * Toggle fullscreen mode.
   */
  toggleFullscreen(): void {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(console.warn);
    } else {
      document.exitFullscreen().catch(console.warn);
    }
  }

  /**
   * Invalidate map size (e.g. after sidebar toggle).
   */
  invalidateSize(): void {
    setTimeout(() => this._map?.invalidateSize(), 300);
  }

  /**
   * Fix Leaflet icon paths for webpack/bundled environments.
   */
  private fixLeafletIcons(L: typeof import('leaflet')): void {
    const iconDefault = L.Icon.Default as unknown as { _getIconUrl?: unknown };
    delete iconDefault._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });
  }

  destroy(): void {
    this._map?.remove();
    this._map = null;
    this.mapReady.set(false);
  }
}
