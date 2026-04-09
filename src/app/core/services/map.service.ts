// ============================================================
// OSM Angular GIS - Map Service
// Uses global L (loaded via angular.json scripts) for runtime
// Uses import type for TypeScript types only
// ============================================================

import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as LType from 'leaflet'; // types only, no runtime import
import { CoordinatesDisplay } from '../models/feature.model';

// Runtime L comes from global script (angular.json)
declare const L: typeof LType;

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
  readonly userLocation = signal<LType.LatLng | null>(null);

  private _map: LType.Map | null = null;
  private _userMarker: LType.Marker | null = null;
  private _userCircle: LType.Circle | null = null;
  private _ro: ResizeObserver | null = null;

  get map(): LType.Map | null {
    return this._map;
  }

  async initMap(container: HTMLElement): Promise<LType.Map> {
    if (!isPlatformBrowser(this.platformId)) throw new Error('Browser only');

    if (this._map) {
      this._map.remove();
      this._map = null;
    }
    const c = container as any;
    if (c._leaflet_id) delete c._leaflet_id;

    await this.waitForSize(container);
    return this.createMap(container);
  }

  private waitForSize(container: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      if (container.clientHeight > 0) {
        resolve();
        return;
      }
      const ro = new ResizeObserver((entries) => {
        if (entries[0].contentRect.height > 0) {
          ro.disconnect();
          resolve();
        }
      });
      ro.observe(container);
      setTimeout(() => {
        ro.disconnect();
        resolve();
      }, 3000);
    });
  }

  private createMap(container: HTMLElement): LType.Map {
    this.fixIcons();

    this._map = L.map(container, {
      center: [40.416775, -3.70379],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    this._map.on('mousemove', (e: LType.LeafletMouseEvent) => {
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
    this.isLocating.set(true);

    return new Promise((resolve, reject) => {
      this._map!.locate({ setView: true, maxZoom: 16 });

      this._map!.once('locationfound', (e: LType.LocationEvent) => {
        this.isLocating.set(false);
        this.userLocation.set(e.latlng);
        this._userMarker?.remove();
        this._userCircle?.remove();

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;border-radius:50%;background:rgba(21,101,192,0.2);display:flex;align-items:center;justify-content:center;animation:location-pulse 2s ease-in-out infinite"><div style="width:12px;height:12px;border-radius:50%;background:#1565c0;border:2.5px solid white;box-shadow:0 2px 8px rgba(21,101,192,0.6)"></div></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        this._userMarker = L.marker(e.latlng, { icon })
          .addTo(this._map!)
          .bindPopup(
            `<div style="padding:8px"><strong>Tu ubicación</strong><br/><small>${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}</small><br/><small>Precisión: ±${Math.round(e.accuracy)}m</small></div>`,
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

      this._map!.once('locationerror', (e: LType.ErrorEvent) => {
        this.isLocating.set(false);
        reject(new Error(e.message));
      });
    });
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen().catch(console.warn);
    else document.exitFullscreen().catch(console.warn);
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

  private fixIcons(): void {
    try {
      const D = (L as any).Icon?.Default;
      if (D) {
        delete D.prototype._getIconUrl;
        D.mergeOptions({
          iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
          iconUrl: 'assets/leaflet/marker-icon.png',
          shadowUrl: 'assets/leaflet/marker-shadow.png',
        });
      }
    } catch (e) {
      console.warn('Leaflet icon fix:', e);
    }
  }
}
