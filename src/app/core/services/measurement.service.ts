// ============================================================
// OSM Angular GIS - Measurement Service (Turf.js)
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
import { MapService } from './map.service';
import { LayerService } from './layer.service';
import { MeasurementResult } from '../models/feature.model';
import * as turf from '@turf/turf';
// Use GeoJSON types from the 'geojson' package (re-exported by @turf/turf v7)
import type { Feature, Polygon, MultiPolygon, Point, GeoJSON } from 'geojson';

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

  private measureLayer: import('leaflet').LayerGroup | null = null;
  private clickHandler: ((e: any) => void) | null = null;

  // ── Public API ─────────────────────────────────────────

  /** Start a measurement tool (stops any active one first). */
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
      L.layerGroup().addTo(map);

    if (tool === 'distance') await this.startDistanceMeasurement(L, map);
    else if (tool === 'area') await this.startAreaMeasurement(L, map);
  }

  /** Stop active tool and restore cursor. */
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

  /** Remove all measurement graphics from the map. */
  clearMeasurements(): void {
    this.measureLayer?.clearLayers();
    this.lastResult.set(null);
    this.measurePoints.set([]);
  }

  /** Generate a buffer polygon around all drawn features. */
  async calculateBuffer(
    geojson: GeoJSON,
    radiusKm: number,
  ): Promise<Feature<Polygon | MultiPolygon> | null> {
    try {
      // turf.buffer accepts GeoJSON and returns Feature<Polygon|MultiPolygon>|undefined
      const buffered = turf.buffer(geojson as any, radiusKm, {
        units: 'kilometers',
      });
      if (!buffered) return null;

      const L = await import('leaflet');
      const map = this.mapService.map;
      const grp =
        this.measureLayer ?? this.layerService.getOverlayGroup('measurements');
      if (!map || !grp) return null;

      const geoLayer = L.geoJSON(buffered as any, {
        style: {
          color: '#f57c00',
          weight: 2,
          fillColor: '#f57c00',
          fillOpacity: 0.15,
          dashArray: '6 4',
        },
      }).addTo(grp);

      const area = turf.area(buffered as any);
      this.lastResult.set({
        type: 'buffer',
        value: area,
        unit: 'm²',
        formattedValue: this.formatArea(area),
        geometry: buffered.geometry as any,
      });

      try {
        map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
      } catch {}

      // Cast via unknown to satisfy strict typing
      return buffered as unknown as Feature<Polygon | MultiPolygon>;
    } catch (err) {
      console.error('Buffer error:', err);
      return null;
    }
  }

  /** Place a centroid marker for all drawn features. */
  async calculateCentroid(geojson: GeoJSON): Promise<Feature<Point> | null> {
    try {
      const centroid = turf.centroid(geojson as any);
      const L = await import('leaflet');
      const map = this.mapService.map;
      const grp =
        this.measureLayer ?? this.layerService.getOverlayGroup('measurements');
      if (!map || !grp) return null;

      const [lng, lat] = centroid.geometry.coordinates;

      const icon = L.divIcon({
        className: 'centroid-icon',
        html: `<div style="
          width:14px;height:14px;
          background:#f57c00;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,0.4)
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([lat, lng], { icon })
        .bindPopup(
          `
          <div style="padding:6px">
            <strong>Centroide</strong><br/>
            <small>${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
          </div>`,
        )
        .addTo(grp)
        .openPopup();

      map.flyTo([lat, lng], Math.max(map.getZoom(), 14));

      this.lastResult.set({
        type: 'centroid',
        formattedValue: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        geometry: centroid.geometry as any,
      });

      return centroid as unknown as Feature<Point>;
    } catch (err) {
      console.error('Centroid error:', err);
      return null;
    }
  }

  /** Area in square metres of any GeoJSON geometry. */
  calculateArea(geojson: GeoJSON): number {
    try {
      return turf.area(geojson as any);
    } catch {
      return 0;
    }
  }

  /** Distance in metres between two [lng, lat] points. */
  calculateDistance(from: [number, number], to: [number, number]): number {
    try {
      return turf.distance(turf.point(from), turf.point(to), {
        units: 'meters',
      });
    } catch {
      return 0;
    }
  }

  // ── Formatting helpers ────────────────────────────────

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

  // ── Private interactive measurement helpers ───────────

  private async startDistanceMeasurement(
    L: typeof import('leaflet'),
    map: import('leaflet').Map,
  ): Promise<void> {
    const layer = this.measureLayer!;
    const points: import('leaflet').LatLng[] = [];
    let polyline: import('leaflet').Polyline | null = null;
    let totalDist = 0;

    map.getContainer().style.cursor = 'crosshair';

    this.clickHandler = (e: import('leaflet').LeafletMouseEvent) => {
      points.push(e.latlng);
      this.measurePoints.update((p) => [...p, [e.latlng.lng, e.latlng.lat]]);

      L.circleMarker(e.latlng, {
        radius: 5,
        color: '#f57c00',
        fillColor: '#f57c00',
        fillOpacity: 1,
        weight: 2,
      }).addTo(layer);

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
          polyline = L.polyline(points, {
            color: '#f57c00',
            weight: 2,
            dashArray: '6 4',
          }).addTo(layer);

        // Mid-point distance label
        L.marker([(prev.lat + curr.lat) / 2, (prev.lng + curr.lng) / 2], {
          icon: L.divIcon({
            className: 'measure-label',
            html: `<div style="background:rgba(245,124,0,0.9);color:white;
                font-size:11px;padding:2px 6px;border-radius:4px;
                white-space:nowrap;">${this.formatDistance(seg)}</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10],
          }),
        }).addTo(layer);

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

  private async startAreaMeasurement(
    L: typeof import('leaflet'),
    map: import('leaflet').Map,
  ): Promise<void> {
    const layer = this.measureLayer!;
    const points: import('leaflet').LatLng[] = [];
    let polygon: import('leaflet').Polygon | null = null;

    map.getContainer().style.cursor = 'crosshair';

    this.clickHandler = (e: import('leaflet').LeafletMouseEvent) => {
      points.push(e.latlng);
      this.measurePoints.update((p) => [...p, [e.latlng.lng, e.latlng.lat]]);

      L.circleMarker(e.latlng, {
        radius: 5,
        color: '#f57c00',
        fillColor: '#f57c00',
        fillOpacity: 1,
        weight: 2,
      }).addTo(layer);

      if (points.length >= 3) {
        if (polygon) polygon.setLatLngs(points);
        else
          polygon = L.polygon(points, {
            color: '#f57c00',
            fillColor: '#f57c00',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '6 4',
          }).addTo(layer);

        const coords = points.map((p) => [p.lng, p.lat] as [number, number]);
        coords.push(coords[0]); // close ring
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
