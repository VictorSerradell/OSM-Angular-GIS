// ============================================================
// OSM Angular GIS - Import Service
// Supports: GeoJSON, GPX, KML, CSV (lat/lon auto-detect)
// All parsing done in the browser — no server needed
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
import { DrawService } from './draw.service';
import { LayerService } from './layer.service';
import {
  GisFeature,
  GisFeatureCollection,
  GisFeatureProperties,
} from '../models/feature.model';
import type * as LType from 'leaflet';

declare const L: typeof LType;

export interface ImportResult {
  filename: string;
  format: 'geojson' | 'gpx' | 'kml' | 'csv';
  count: number;
  warnings: string[];
}

@Injectable({ providedIn: 'root' })
export class ImportService {
  private drawService = inject(DrawService);
  private layerService = inject(LayerService);

  readonly loading = signal<boolean>(false);
  readonly lastResult = signal<ImportResult | null>(null);
  readonly error = signal<string | null>(null);

  private map: any = null;
  setMap(map: any): void {
    this.map = map;
  }

  async importFile(file: File): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    try {
      let geojson: GisFeatureCollection;
      let format: ImportResult['format'];

      if (ext === 'geojson' || ext === 'json') {
        geojson = JSON.parse(text);
        format = 'geojson';
      } else if (ext === 'gpx') {
        geojson = this.parseGPX(text);
        format = 'gpx';
      } else if (ext === 'kml') {
        geojson = this.parseKML(text);
        format = 'kml';
      } else if (ext === 'csv' || ext === 'txt') {
        geojson = this.parseCSV(text);
        format = 'csv';
      } else {
        this.error.set(
          `Formato no soportado: .${ext}. Usa GeoJSON, GPX, KML o CSV.`,
        );
        return;
      }

      if (!geojson.features?.length) {
        this.error.set('El archivo no contiene features válidas.');
        return;
      }

      await this.drawService.importGeoJSON(geojson);

      this.lastResult.set({
        filename: file.name,
        format,
        count: geojson.features.length,
        warnings: [],
      });
    } catch (e: any) {
      this.error.set(`Error al importar: ${e.message ?? e}`);
    } finally {
      this.loading.set(false);
    }
  }

  // ── GPX Parser ─────────────────────────────────────────

  private parseGPX(text: string): GisFeatureCollection {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    const features: GisFeature[] = [];

    // Waypoints (wpt) → Point features
    doc.querySelectorAll('wpt').forEach((wpt) => {
      const lat = parseFloat(wpt.getAttribute('lat') ?? '0');
      const lon = parseFloat(wpt.getAttribute('lon') ?? '0');
      const name = wpt.querySelector('name')?.textContent ?? 'Waypoint';
      const ele = wpt.querySelector('ele')?.textContent;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          id: this.uid(),
          name,
          drawType: 'marker',
          elevation: ele ? parseFloat(ele) : undefined,
          createdAt: new Date().toISOString(),
        },
      });
    });

    // Tracks (trk) → LineString features
    doc.querySelectorAll('trk').forEach((trk) => {
      const name = trk.querySelector('name')?.textContent ?? 'Track';
      const coords: number[][] = [];
      trk.querySelectorAll('trkpt').forEach((pt) => {
        const lat = parseFloat(pt.getAttribute('lat') ?? '0');
        const lon = parseFloat(pt.getAttribute('lon') ?? '0');
        const ele = pt.querySelector('ele')?.textContent;
        coords.push(ele ? [lon, lat, parseFloat(ele)] : [lon, lat]);
      });
      if (coords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {
            id: this.uid(),
            name,
            drawType: 'polyline',
            createdAt: new Date().toISOString(),
          },
        });
      }
    });

    // Routes (rte) → LineString features
    doc.querySelectorAll('rte').forEach((rte) => {
      const name = rte.querySelector('name')?.textContent ?? 'Ruta';
      const coords: number[][] = [];
      rte.querySelectorAll('rtept').forEach((pt) => {
        coords.push([
          parseFloat(pt.getAttribute('lon') ?? '0'),
          parseFloat(pt.getAttribute('lat') ?? '0'),
        ]);
      });
      if (coords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {
            id: this.uid(),
            name,
            drawType: 'polyline',
            createdAt: new Date().toISOString(),
          },
        });
      }
    });

    return { type: 'FeatureCollection', features };
  }

  // ── KML Parser ─────────────────────────────────────────

  private parseKML(text: string): GisFeatureCollection {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    const features: GisFeature[] = [];

    doc.querySelectorAll('Placemark').forEach((pm) => {
      const name = pm.querySelector('name')?.textContent ?? 'Placemark';
      const desc = pm.querySelector('description')?.textContent ?? '';

      // Point
      const point = pm.querySelector('Point coordinates');
      if (point) {
        const [lon, lat] = point.textContent!.trim().split(',').map(Number);
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: {
            id: this.uid(),
            name,
            description: desc,
            drawType: 'marker',
            createdAt: new Date().toISOString(),
          },
        });
        return;
      }

      // LineString
      const line = pm.querySelector('LineString coordinates');
      if (line) {
        const coords = this.parseKMLCoords(line.textContent ?? '');
        if (coords.length >= 2) {
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {
              id: this.uid(),
              name,
              drawType: 'polyline',
              createdAt: new Date().toISOString(),
            },
          });
        }
        return;
      }

      // Polygon
      const outerRing =
        pm.querySelector('Polygon outerBoundaryIs coordinates') ||
        pm.querySelector('Polygon coordinates');
      if (outerRing) {
        const coords = this.parseKMLCoords(outerRing.textContent ?? '');
        if (coords.length >= 3) {
          // Close ring if needed
          const first = coords[0],
            last = coords[coords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);
          features.push({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [coords] },
            properties: {
              id: this.uid(),
              name,
              drawType: 'polygon',
              createdAt: new Date().toISOString(),
            },
          });
        }
      }
    });

    return { type: 'FeatureCollection', features };
  }

  private parseKMLCoords(raw: string): number[][] {
    return raw
      .trim()
      .split(/\s+/)
      .map((c) => {
        const [lon, lat] = c.split(',').map(Number);
        return [lon, lat];
      })
      .filter((c) => !isNaN(c[0]) && !isNaN(c[1]));
  }

  // ── CSV Parser ─────────────────────────────────────────

  private parseCSV(text: string): GisFeatureCollection {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(/[,;|\t]/).map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, ''),
    );
    const features: GisFeature[] = [];

    // Auto-detect lat/lon column names
    const latKey = headers.find((h) => /^lat(itud(e)?)?$/.test(h)) ?? '';
    const lonKey = headers.find((h) => /^lon(gitud(e)?)?$|^lng$/.test(h)) ?? '';
    const latIdx = headers.indexOf(latKey);
    const lonIdx = headers.indexOf(lonKey);

    if (latIdx < 0 || lonIdx < 0) {
      throw new Error(
        `No se detectaron columnas lat/lon. Columnas encontradas: ${headers.join(', ')}`,
      );
    }

    const nameIdx = headers.findIndex((h) =>
      /^name|^nombre|^title|^titulo/.test(h),
    );

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]
        .split(/[,;|\t]/)
        .map((v) => v.trim().replace(/^"|"$/g, ''));
      const lat = parseFloat(row[latIdx]);
      const lon = parseFloat(row[lonIdx]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const name = nameIdx >= 0 ? row[nameIdx] || `Punto ${i}` : `Punto ${i}`;

      // Build properties — must satisfy GisFeatureProperties
      const extraProps: Record<string, any> = {};
      headers.forEach((h, idx) => {
        if (idx !== latIdx && idx !== lonIdx) extraProps[h] = row[idx] ?? '';
      });
      const props = {
        id: this.uid(),
        name,
        drawType: 'marker' as const,
        createdAt: new Date().toISOString(),
        ...extraProps,
      } as GisFeatureProperties;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: props,
      });
    }

    return { type: 'FeatureCollection', features };
  }

  private uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}
