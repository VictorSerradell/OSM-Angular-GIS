// ============================================================
// OSM Angular GIS - Topology Service (Turf.js operations)
// Compatible with @turf/turf v7
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import { DrawService } from './draw.service';
import { GisFeature } from '../models/feature.model';
import type * as LType from 'leaflet';

declare const L: typeof LType;

export type TopologyOp = 'intersect' | 'union' | 'difference' | 'symDifference' | 'clip';

export interface TopologyResult {
  operation:  TopologyOp;
  featureA:   string;
  featureB:   string;
  result:     GisFeature | null;
  stats: {
    areaA:      number;
    areaB:      number;
    areaResult: number;
    overlapPct: number;
  };
}

@Injectable({ providedIn: 'root' })
export class TopologyService {
  private drawService = inject(DrawService);

  readonly loading    = signal<boolean>(false);
  readonly error      = signal<string | null>(null);
  readonly lastResult = signal<TopologyResult | null>(null);

  private resultLayer: any = null;
  private map: any = null;

  setMap(map: any): void { this.map = map; }

  get polygonFeatures(): GisFeature[] {
    return this.drawService.features().filter(f =>
      ['polygon', 'rectangle'].includes(f.properties.drawType ?? '')
    );
  }

  async run(op: TopologyOp, idA: string, idB: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const features = this.drawService.features();
      const fA = features.find(f => f.properties.id === idA);
      const fB = features.find(f => f.properties.id === idB);

      if (!fA || !fB) { this.error.set('Selecciona dos features válidas.'); return; }
      if (!['Polygon','MultiPolygon'].includes(fA.geometry.type)) {
        this.error.set('Feature A debe ser un polígono.'); return;
      }
      if (!['Polygon','MultiPolygon'].includes(fB.geometry.type)) {
        this.error.set('Feature B debe ser un polígono.'); return;
      }

      // Use 'any' cast to avoid turf v7 type conflicts
      const polyA = fA as any;
      const polyB = fB as any;

      const areaA = turf.area(polyA);
      const areaB = turf.area(polyB);

      let result: any = null;

      switch (op) {
        case 'intersect':
          result = turf.intersect(turf.featureCollection([polyA, polyB]));
          break;
        case 'union':
          result = turf.union(turf.featureCollection([polyA, polyB]));
          break;
        case 'difference':
          result = turf.difference(turf.featureCollection([polyA, polyB]));
          break;
        case 'symDifference': {
          const d1 = turf.difference(turf.featureCollection([polyA, polyB]));
          const d2 = turf.difference(turf.featureCollection([polyB, polyA]));
          if (d1 && d2) result = turf.union(turf.featureCollection([d1, d2]));
          else result = d1 || d2;
          break;
        }
        case 'clip':
          result = turf.intersect(turf.featureCollection([polyA, polyB]));
          break;
      }

      const areaResult = result ? turf.area(result) : 0;
      const overlapPct = areaA > 0 ? (areaResult / areaA) * 100 : 0;

      this.clearResult();
      if (result && this.map) {
        this.resultLayer = L.geoJSON(result as any, {
          style: { color: '#ff6f00', weight: 3, fillColor: '#ff6f00', fillOpacity: 0.35 },
        }).addTo(this.map);
        try { this.map.fitBounds(this.resultLayer.getBounds(), { padding: [30, 30] }); } catch {}
      }

      const gisResult: GisFeature | null = result ? {
        type: 'Feature',
        geometry: result.geometry,
        properties: {
          id: `topo-${Date.now()}`,
          name: `${this.opLabel(op)}: ${fA.properties.name} ∩ ${fB.properties.name}`,
          drawType: 'polygon',
          createdAt: new Date().toISOString(),
        },
      } : null;

      this.lastResult.set({
        operation: op, featureA: idA, featureB: idB, result: gisResult,
        stats: { areaA, areaB, areaResult, overlapPct },
      });

    } catch (e: any) {
      this.error.set('Error en la operación: ' + (e.message ?? e));
      console.error('Topology error:', e);
    } finally {
      this.loading.set(false);
    }
  }

  saveResult(): void {
    const r = this.lastResult();
    if (r?.result) {
      this.drawService.features.update(f => [...f, r.result!]);
      this.drawService.drawnLayerCount.update(n => n + 1);
    }
  }

  clearResult(): void { this.resultLayer?.remove(); this.resultLayer = null; }

  opLabel(op: TopologyOp): string {
    const m: Record<TopologyOp, string> = {
      intersect: 'Intersección', union: 'Unión', difference: 'Diferencia',
      symDifference: 'Dif. Simétrica', clip: 'Recorte',
    };
    return m[op] ?? op;
  }

  formatArea(m2: number): string {
    return m2 >= 1_000_000 ? `${(m2/1_000_000).toFixed(2)} km²`
         : m2 >= 10_000    ? `${(m2/10_000).toFixed(2)} ha`
                            : `${Math.round(m2)} m²`;
  }
}