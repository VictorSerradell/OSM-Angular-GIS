// ============================================================
// OSM Angular GIS - Routing Service
// Uses OSRM public demo API (free, no key required)
// Profiles: driving / cycling / walking
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type * as LType from 'leaflet';

declare const L: typeof LType;

export type RouteProfile = 'driving' | 'cycling' | 'walking';

export interface RouteStep {
  instruction: string;
  distance: number;   // meters
  duration: number;   // seconds
  name:     string;
}

export interface RouteResult {
  coordinates:    [number, number][];  // [lng, lat] pairs
  elevationProfile: { dist: number; ele: number }[];
  totalDistance:  number;   // meters
  totalDuration:  number;   // seconds
  steps:          RouteStep[];
}

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private http = inject(HttpClient);

  // OSRM public demo endpoints
  private readonly OSRM: Record<RouteProfile, string> = {
    driving: 'https://router.project-osrm.org/route/v1/driving',
    cycling: 'https://router.project-osrm.org/route/v1/cycling',
    walking: 'https://router.project-osrm.org/route/v1/foot',
  };

  // Open-Elevation API for elevation profile
  private readonly ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup';

  readonly loading       = signal<boolean>(false);
  readonly error         = signal<string | null>(null);
  readonly result        = signal<RouteResult | null>(null);
  readonly waypoints     = signal<LType.LatLng[]>([]);
  readonly activeProfile = signal<RouteProfile>('walking');

  private routeLayer: any = null;
  private waypointMarkers: any[] = [];
  private map: any = null;

  setMap(map: any): void { this.map = map; }

  setProfile(p: RouteProfile): void {
    this.activeProfile.set(p);
    if (this.waypoints().length >= 2) this.calculate();
  }

  addWaypoint(latlng: LType.LatLng): void {
    this.waypoints.update(pts => [...pts, latlng]);
    this.addWaypointMarker(latlng, this.waypoints().length);
    if (this.waypoints().length >= 2) this.calculate();
  }

  removeLastWaypoint(): void {
    const last = this.waypointMarkers.pop();
    last?.remove();
    this.waypoints.update(pts => pts.slice(0, -1));
    if (this.waypoints().length >= 2) this.calculate();
    else { this.clearRoute(); this.result.set(null); }
  }

  clearAll(): void {
    this.waypointMarkers.forEach(m => m?.remove());
    this.waypointMarkers = [];
    this.waypoints.set([]);
    this.clearRoute();
    this.result.set(null);
    this.error.set(null);
  }

  async calculate(): Promise<void> {
    const pts = this.waypoints();
    if (pts.length < 2) return;

    this.loading.set(true);
    this.error.set(null);

    const coords = pts.map(p => `${p.lng},${p.lat}`).join(';');
    const url    = `${this.OSRM[this.activeProfile()]}/${coords}` +
                   `?overview=full&geometries=geojson&steps=true&annotations=false`;

    try {
      const data: any = await this.http.get(url).toPromise();

      if (data.code !== 'Ok' || !data.routes?.length) {
        this.error.set('No se encontró ruta entre los puntos indicados.');
        this.loading.set(false);
        return;
      }

      const route     = data.routes[0];
      const coords2d: [number, number][] = route.geometry.coordinates;
      const steps: RouteStep[] = [];

      for (const leg of route.legs ?? []) {
        for (const step of leg.steps ?? []) {
          steps.push({
            instruction: step.maneuver?.type ?? '',
            distance:    step.distance,
            duration:    step.duration,
            name:        step.name || '',
          });
        }
      }

      // Draw route on map
      this.clearRoute();
      if (this.map) {
        this.routeLayer = L.geoJSON({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords2d },
          properties: {},
        } as any, {
          style: { color: '#e53935', weight: 5, opacity: 0.85 },
        }).addTo(this.map);
        this.map.fitBounds(this.routeLayer.getBounds(), { padding: [40, 40] });
      }

      // Fetch elevation for sampled points (max 100 to respect API limits)
      const sampleStep = Math.max(1, Math.floor(coords2d.length / 80));
      const sampled    = coords2d.filter((_, i) => i % sampleStep === 0);
      const elevation  = await this.fetchElevation(sampled);

      // Build cumulative distance profile
      let cumDist = 0;
      const elevProfile = sampled.map((c, i) => {
        if (i > 0) {
          const prev = sampled[i - 1];
          const dx   = (c[0] - prev[0]) * 111320 * Math.cos(c[1] * Math.PI / 180);
          const dy   = (c[1] - prev[1]) * 110540;
          cumDist   += Math.sqrt(dx * dx + dy * dy);
        }
        return { dist: Math.round(cumDist), ele: elevation[i] ?? 0 };
      });

      this.result.set({
        coordinates:    coords2d,
        elevationProfile: elevProfile,
        totalDistance:  route.distance,
        totalDuration:  route.duration,
        steps,
      });
    } catch (e: any) {
      this.error.set('Error al calcular la ruta. Intenta de nuevo.');
      console.error('OSRM error:', e);
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchElevation(coords: [number, number][]): Promise<number[]> {
    try {
      const locations = coords.map(c => ({ latitude: c[1], longitude: c[0] }));
      const res: any  = await this.http.post(this.ELEVATION_URL, { locations }).toPromise();
      return res.results?.map((r: any) => r.elevation ?? 0) ?? coords.map(() => 0);
    } catch {
      return coords.map(() => 0);
    }
  }

  private clearRoute(): void {
    this.routeLayer?.remove();
    this.routeLayer = null;
  }

  private addWaypointMarker(latlng: LType.LatLng, idx: number): void {
    if (!this.map) return;
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:28px;border-radius:50%;
        background:#e53935;color:white;
        display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:700;
        border:2.5px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3)">
        ${idx}
      </div>`,
      iconSize:   [28, 28],
      iconAnchor: [14, 14],
    });
    const marker = L.marker(latlng, { icon, draggable: true }).addTo(this.map);
    marker.on('dragend', () => {
      const i = this.waypointMarkers.indexOf(marker);
      if (i >= 0) {
        this.waypoints.update(pts => {
          const copy = [...pts];
          copy[i] = marker.getLatLng();
          return copy;
        });
        this.calculate();
      }
    });
    this.waypointMarkers.push(marker);
  }

  formatDistance(m: number): string {
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  }

  formatDuration(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  }
}
