// ============================================================
// OSM Angular GIS - Measurement Service (Turf.js)
// Zero external type dependencies — all types are inline or any
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
import { MapService } from './map.service';
import { LayerService } from './layer.service';
import { MeasurementResult } from '../models/feature.model';
import * as turf from '@turf/turf';

export type MeasurementTool =
  | 'distance'
  | 'area'
  | 'buffer'
  | 'centroid'
  | null;

@Injectable({ providedIn: 'root' })
export class MeasurementService {
  private mapService = inject(MapService);
  private layerService = inject(LayerService);

  readonly activeTool = signal<MeasurementTool>(null);
  readonly lastResult = signal<MeasurementResult | null>(null);
  readonly measuring = signal<boolean>(false);
  readonly measurePoints = signal<[number, number][]>([]);

  private measureLayer: any = null;
  private clickHandler: ((e: any) => void) | null = null;

  // ── Public API ─────────────────────────────────────

  async startTool(tool: MeasurementTool): Promise<void> {
    await this.stopTool();
    if (!tool) return;

    this.activeTool.set(tool);
    this.measuring.set(true);
    this.measurePoints.set([]);

    const L = await import('leaflet');
    const map = this.mapService.map;
    if (!map) return;

    this.measureLayer =
      this.layerService.getOverlayGroup('measurements') ??
      (L as any).layerGroup().addTo(map);

    if (tool === 'distance') await this.startDistanceMeasurement(L, map);
    else if (tool === 'area') await this.startAreaMeasurement(L, map);
  }

  async stopTool(): Promise<void> {
    const map = this.mapService.map;
    if (!map) return;
    if (this.clickHandler) {
      map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    map.getContainer().style.cursor = '';
    this.activeTool.set(null);
    this.measuring.set(false);
    this.measurePoints.set([]);
  }

  clearMeasurements(): void {
    this.measureLayer?.clearLayers();
    this.lastResult.set(null);
    this.measurePoints.set([]);
  }

  async calculateBuffer(geojson: any, radiusKm: number): Promise<any> {
    try {
      const buffered = turf.buffer(geojson, radiusKm, { units: 'kilometers' });
      if (!buffered) return null;

      const L = await import('leaflet');
      const map = this.mapService.map;
      const grp =
        this.measureLayer ?? this.layerService.getOverlayGroup('measurements');
      if (!map || !grp) return null;

      const geoLayer = (L as any)
        .geoJSON(buffered, {
          style: {
            color: '#f57c00',
            weight: 2,
            fillColor: '#f57c00',
            fillOpacity: 0.15,
            dashArray: '6 4',
          },
        })
        .addTo(grp);

      const area = turf.area(buffered);
      this.lastResult.set({
        type: 'buffer',
        value: area,
        unit: 'm²',
        formattedValue: this.formatArea(area),
        geometry: buffered.geometry as any,
      });

      try {
        map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
      } catch {
        /* empty */
      }
      return buffered;
    } catch (err) {
      console.error('Buffer error:', err);
      return null;
    }
  }

  async calculateCentroid(geojson: any): Promise<any> {
    try {
      const centroid = turf.centroid(geojson);
      const L = await import('leaflet');
      const map = this.mapService.map;
      const grp =
        this.measureLayer ?? this.layerService.getOverlayGroup('measurements');
      if (!map || !grp) return null;

      const [lng, lat] = centroid.geometry.coordinates;

      const icon = (L as any).divIcon({
        className: 'centroid-icon',
        html: `<div style="width:14px;height:14px;background:#f57c00;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      (L as any)
        .marker([lat, lng], { icon })
        .bindPopup(
          `<div style="padding:6px"><strong>Centroide</strong><br/><small>${lat.toFixed(6)}, ${lng.toFixed(6)}</small></div>`,
        )
        .addTo(grp)
        .openPopup();

      map.flyTo([lat, lng], Math.max(map.getZoom(), 14));
      this.lastResult.set({
        type: 'centroid',
        formattedValue: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        geometry: centroid.geometry as any,
      });
      return centroid;
    } catch (err) {
      console.error('Centroid error:', err);
      return null;
    }
  }

  calculateArea(geojson: any): number {
    try {
      return turf.area(geojson);
    } catch {
      return 0;
    }
  }

  calculateDistance(from: [number, number], to: [number, number]): number {
    try {
      return turf.distance(turf.point(from), turf.point(to), {
        units: 'meters',
      });
    } catch {
      return 0;
    }
  }

  formatArea(m2: number): string {
    if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(4)} km²`;
    if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
    return `${m2.toFixed(1)} m²`;
  }

  formatDistance(meters: number): string {
    return meters >= 1000
      ? `${(meters / 1000).toFixed(3)} km`
      : `${meters.toFixed(1)} m`;
  }

  // ── Private interactive measurement helpers ─────────

  private async startDistanceMeasurement(L: any, map: any): Promise<void> {
    const layer = this.measureLayer;
    const points: any[] = [];
    let polyline: any = null;
    let totalDist = 0;

    map.getContainer().style.cursor = 'crosshair';

    this.clickHandler = (e: any) => {
      points.push(e.latlng);
      this.measurePoints.update((p) => [...p, [e.latlng.lng, e.latlng.lat]]);

      (L as any)
        .circleMarker(e.latlng, {
          radius: 5,
          color: '#f57c00',
          fillColor: '#f57c00',
          fillOpacity: 1,
          weight: 2,
        })
        .addTo(layer);

      if (points.length > 1) {
        const prev = points[points.length - 2];
        const curr = points[points.length - 1];
        const seg = this.calculateDistance(
          [prev.lng, prev.lat],
          [curr.lng, curr.lat],
        );
        totalDist += seg;

        if (polyline) polyline.setLatLngs(points);
        else
          polyline = (L as any)
            .polyline(points, { color: '#f57c00', weight: 2, dashArray: '6 4' })
            .addTo(layer);

        (L as any)
          .marker([(prev.lat + curr.lat) / 2, (prev.lng + curr.lng) / 2], {
            icon: (L as any).divIcon({
              className: 'measure-label',
              html: `<div style="background:rgba(245,124,0,0.9);color:white;font-size:11px;padding:2px 6px;border-radius:4px;white-space:nowrap">${this.formatDistance(seg)}</div>`,
              iconSize: [80, 20],
              iconAnchor: [40, 10],
            }),
          })
          .addTo(layer);

        this.lastResult.set({
          type: 'distance',
          value: totalDist,
          unit: 'm',
          formattedValue: this.formatDistance(totalDist),
        });
      }
    };
    map.on('click', this.clickHandler);
  }

  private async startAreaMeasurement(L: any, map: any): Promise<void> {
    const layer = this.measureLayer;
    const points: any[] = [];
    let polygon: any = null;

    map.getContainer().style.cursor = 'crosshair';

    this.clickHandler = (e: any) => {
      points.push(e.latlng);
      this.measurePoints.update((p) => [...p, [e.latlng.lng, e.latlng.lat]]);

      (L as any)
        .circleMarker(e.latlng, {
          radius: 5,
          color: '#f57c00',
          fillColor: '#f57c00',
          fillOpacity: 1,
          weight: 2,
        })
        .addTo(layer);

      if (points.length >= 3) {
        if (polygon) polygon.setLatLngs(points);
        else
          polygon = (L as any)
            .polygon(points, {
              color: '#f57c00',
              fillColor: '#f57c00',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '6 4',
            })
            .addTo(layer);

        const coords = points.map(
          (p: any) => [p.lng, p.lat] as [number, number],
        );
        coords.push(coords[0]);
        const area = turf.area(turf.polygon([coords]));
        this.lastResult.set({
          type: 'area',
          value: area,
          unit: 'm²',
          formattedValue: this.formatArea(area),
        });
      }
    };
    map.on('click', this.clickHandler);
  }
}
