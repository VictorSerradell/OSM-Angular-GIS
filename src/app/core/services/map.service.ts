// ============================================================
// OSM Angular GIS - Map Service
// Production-safe: defers Leaflet init until container
// has real pixel dimensions (ResizeObserver pattern)
// ============================================================

import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as L from 'leaflet';
import { CoordinatesDisplay } from '../models/feature.model';

@Injectable({ providedIn: 'root' })
export class MapService {
  private platformId = inject(PLATFORM_ID);

  readonly mapReady = signal<boolean>(false);
  readonly coordinates = signal<CoordinatesDisplay>({
    lat: 0,
    lng: 0,
    zoom: 2,
  });
  readonly isLocating = signal<boolean>(false);
  readonly userLocation = signal<L.LatLng | null>(null);

  private _map: L.Map | null = null;
  private _userMarker: L.Marker | null = null;
  private _userCircle: L.Circle | null = null;
  private _ro: ResizeObserver | null = null;

  get map(): L.Map | null {
    return this._map;
  }

  async initMap(container: HTMLElement): Promise<L.Map> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Browser only');
    }

    // Clean up any previous instance (HMR / double init)
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
    const c = container as any;
    if (c._leaflet_id) delete c._leaflet_id;

    // Wait until the container has real dimensions
    await this.waitForSize(container);

    return this.createMap(container);
  }

  /** Returns a promise that resolves once container.clientHeight > 0 */
  private waitForSize(container: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      if (container.clientHeight > 0) {
        resolve();
        return;
      }

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.height > 0) {
            ro.disconnect();
            resolve();
            return;
          }
        }
      });
      ro.observe(container);

      // Hard timeout: init anyway after 3s to avoid hanging
      setTimeout(() => {
        ro.disconnect();
        resolve();
      }, 3000);
    });
  }

  private async createMap(container: HTMLElement): Promise<L.Map> {
    const L = await import('leaflet');
    this.fixIcons(L);

    this._map = L.map(container, {
      center: [40.416775, -3.70379],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    this._map.on('mousemove', (e: L.LeafletMouseEvent) => {
      this.coordinates.set({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        zoom: this._map!.getZoom(),
      });
    });

    this._map.on('zoomend', () => {
      this.coordinates.update((c) => ({ ...c, zoom: this._map!.getZoom() }));
    });

    L.control
      .scale({ imperial: false, metric: true, position: 'bottomleft' })
      .addTo(this._map);

    this.mapReady.set(true);

    // Multiple invalidateSize calls for production CSS timing
    [50, 200, 500, 1000].forEach((ms) =>
      setTimeout(() => this._map?.invalidateSize(), ms),
    );

    return this._map;
  }

  flyTo(lat: number, lng: number, zoom = 15): void {
    this._map?.flyTo([lat, lng], zoom, { duration: 1.5 });
  }

  fitBounds(bbox: [number, number, number, number]): void {
    const [s, n, w, e] = bbox;
    this._map?.fitBounds(
      [
        [s, w],
        [n, e],
      ],
      { padding: [20, 20] },
    );
  }

  async locateUser(): Promise<void> {
    if (!this._map) return;
    const L = await import('leaflet');
    this.isLocating.set(true);

    return new Promise((resolve, reject) => {
      this._map!.locate({ setView: true, maxZoom: 16 });

      this._map!.once('locationfound', (e: L.LocationEvent) => {
        this.isLocating.set(false);
        this.userLocation.set(e.latlng);
        this._userMarker?.remove();
        this._userCircle?.remove();

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:20px;height:20px;border-radius:50%;
            background:rgba(21,101,192,0.2);
            display:flex;align-items:center;justify-content:center;
            animation:location-pulse 2s ease-in-out infinite;">
            <div style="
              width:12px;height:12px;border-radius:50%;
              background:#1565c0;border:2.5px solid white;
              box-shadow:0 2px 8px rgba(21,101,192,0.6);"></div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        this._userMarker = L.marker(e.latlng, { icon })
          .addTo(this._map!)
          .bindPopup(
            `<div style="padding:8px">
            <strong>Tu ubicación</strong><br/>
            <small>${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}</small><br/>
            <small>Precisión: ±${Math.round(e.accuracy)}m</small>
          </div>`,
          )
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

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.warn);
    } else {
      document.exitFullscreen().catch(console.warn);
    }
  }

  invalidateSize(): void {
    setTimeout(() => this._map?.invalidateSize(), 300);
  }

  destroy(): void {
    this._ro?.disconnect();
    this._map?.remove();
    this._map = null;
    this.mapReady.set(false);
  }

  private fixIcons(L: typeof import('leaflet')): void {
    const d = L.Icon.Default as any;
    delete d._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });
  }
}
