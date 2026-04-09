// ============================================================
// OSM Angular GIS - Draw Service
// Uses global L from window (loaded via angular.json scripts)
// This guarantees leaflet-draw extends the SAME L object
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
import { MapService } from './map.service';
import { LayerService } from './layer.service';
import {
  GisFeature,
  GisFeatureCollection,
  DrawToolType,
} from '../models/feature.model';

// Use global L injected by angular.json scripts, not the ESM module
// This avoids the dual-instance problem in production
declare const L: any;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

@Injectable({ providedIn: 'root' })
export class DrawService {
  private mapService = inject(MapService);
  private layerService = inject(LayerService);

  readonly features = signal<GisFeature[]>([]);
  readonly activeDrawTool = signal<DrawToolType | null>(null);
  readonly drawnLayerCount = signal<number>(0);

  private drawControl: any = null;
  private featureLayerMap = new Map<string, any>();

  // ── Init ──────────────────────────────────────────────

  initDraw(): void {
    const map = this.mapService.map;
    if (!map) {
      console.error('initDraw: map not ready');
      return;
    }

    if (!L?.Control?.Draw) {
      console.error(
        'initDraw: L.Control.Draw not available. Check angular.json scripts.',
      );
      return;
    }

    const drawnGroup = this.layerService.getOverlayGroup('drawn-features');
    if (!drawnGroup) {
      console.error('initDraw: drawn-features group not found');
      return;
    }

    this.drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline: { shapeOptions: { color: '#1565c0', weight: 3 } },
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: '#1565c0',
            fillColor: '#1565c0',
            fillOpacity: 0.2,
          },
        },
        circle: {
          shapeOptions: {
            color: '#1565c0',
            fillColor: '#1565c0',
            fillOpacity: 0.2,
          },
        },
        rectangle: {
          shapeOptions: {
            color: '#1565c0',
            fillColor: '#1565c0',
            fillOpacity: 0.2,
          },
        },
        marker: true,
        circlemarker: { color: '#1565c0', radius: 8 },
      },
      edit: { featureGroup: drawnGroup, remove: true },
    });

    this.drawControl.addTo(map);

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const type = e.layerType as DrawToolType;
      const feature = this.layerToGeoJSON(layer, type);
      if (feature) {
        drawnGroup.addLayer(layer);
        this.featureLayerMap.set(feature.properties.id, layer);
        this.bindFeaturePopup(layer, feature);
        this.features.update((f) => [...f, feature]);
        this.drawnLayerCount.update((n) => n + 1);
        this.activeDrawTool.set(null);
      }
    });

    map.on(L.Draw.Event.EDITED, (e: any) => {
      e.layers.eachLayer((layer: any) => {
        const id = layer._gisId as string | undefined;
        if (id) {
          const updated = this.layerToGeoJSON(
            layer,
            layer._drawType ?? 'polygon',
          );
          if (updated) {
            this.features.update((fs) =>
              fs.map((f) =>
                f.properties.id === id
                  ? { ...updated, properties: { ...updated.properties, id } }
                  : f,
              ),
            );
          }
        }
      });
    });

    map.on(L.Draw.Event.DELETED, (e: any) => {
      e.layers.eachLayer((layer: any) => {
        const id = layer._gisId as string | undefined;
        if (id) {
          this.features.update((f) =>
            f.filter((feat) => feat.properties.id !== id),
          );
          this.featureLayerMap.delete(id);
          this.drawnLayerCount.update((n) => Math.max(0, n - 1));
        }
      });
    });
  }

  // ── Programmatic tool activation ──────────────────────

  activateTool(toolType: DrawToolType): void {
    // Click the corresponding native Leaflet Draw toolbar button
    // This is the most reliable way to activate a tool programmatically
    const toolbarMap: Record<DrawToolType, string> = {
      marker: '.leaflet-draw-draw-marker',
      polyline: '.leaflet-draw-draw-polyline',
      polygon: '.leaflet-draw-draw-polygon',
      rectangle: '.leaflet-draw-draw-rectangle',
      circle: '.leaflet-draw-draw-circle',
      circlemarker: '.leaflet-draw-draw-circlemarker',
    };

    const selector = toolbarMap[toolType];
    const btn = document.querySelector(selector) as HTMLElement | null;

    if (btn) {
      btn.click();
      this.activeDrawTool.set(toolType);
    } else {
      // Fallback: direct instantiation
      const map = this.mapService.map;
      if (!map || !L?.Draw) return;
      const shape = {
        color: '#1565c0',
        weight: 2,
        fillColor: '#1565c0',
        fillOpacity: 0.2,
      };
      const cfgMap: Record<string, { cls: any; opts: any }> = {
        marker: { cls: L.Draw?.Marker, opts: {} },
        circlemarker: { cls: L.Draw?.CircleMarker, opts: {} },
        polyline: {
          cls: L.Draw?.Polyline,
          opts: { shapeOptions: { ...shape, fillOpacity: 0 } },
        },
        polygon: { cls: L.Draw?.Polygon, opts: { shapeOptions: shape } },
        rectangle: { cls: L.Draw?.Rectangle, opts: { shapeOptions: shape } },
        circle: { cls: L.Draw?.Circle, opts: { shapeOptions: shape } },
      };
      const t = cfgMap[toolType];
      if (t?.cls) {
        try {
          new t.cls(map, t.opts).enable();
          this.activeDrawTool.set(toolType);
        } catch (e) {
          console.error('activateTool fallback error:', e);
        }
      }
    }
  }

  // ── Feature management ────────────────────────────────

  deleteFeature(id: string): void {
    const layer = this.featureLayerMap.get(id);
    const drawnGroup = this.layerService.getOverlayGroup('drawn-features');
    if (layer && drawnGroup) drawnGroup.removeLayer(layer);
    this.featureLayerMap.delete(id);
    this.features.update((f) => f.filter((feat) => feat.properties.id !== id));
    this.drawnLayerCount.update((n) => Math.max(0, n - 1));
  }

  updateFeatureProperties(
    id: string,
    props: Partial<GisFeature['properties']>,
  ): void {
    this.features.update((fs) =>
      fs.map((f) =>
        f.properties.id === id
          ? {
              ...f,
              properties: {
                ...f.properties,
                ...props,
                updatedAt: new Date().toISOString(),
              },
            }
          : f,
      ),
    );
  }

  async flyToFeature(id: string): Promise<void> {
    const layer = this.featureLayerMap.get(id);
    const map = this.mapService.map;
    if (!layer || !map) return;
    if (typeof layer.getBounds === 'function') {
      map.flyToBounds(layer.getBounds(), { padding: [40, 40] });
    } else if (typeof layer.getLatLng === 'function') {
      map.flyTo(layer.getLatLng(), 16);
    }
  }

  exportGeoJSON(): GisFeatureCollection {
    return {
      type: 'FeatureCollection',
      features: this.features(),
      metadata: {
        name: 'OSM Angular GIS Export',
        createdAt: new Date().toISOString(),
      },
    };
  }

  async importGeoJSON(geojson: GisFeatureCollection): Promise<void> {
    const map = this.mapService.map;
    const drawnGroup = this.layerService.getOverlayGroup('drawn-features');
    if (!map || !drawnGroup) return;

    L.geoJSON(geojson, {
      style: (feature: any) => ({
        color: feature?.properties?.color ?? '#1565c0',
        weight: feature?.properties?.weight ?? 2,
        fillOpacity: feature?.properties?.fillOpacity ?? 0.2,
      }),
      onEachFeature: (feature: any, layer: any) => {
        const id = feature.properties?.id ?? generateId();
        const props = {
          ...feature.properties,
          id,
          createdAt: feature.properties?.createdAt ?? new Date().toISOString(),
        };
        layer._gisId = id;
        const gisFeature: GisFeature = {
          type: 'Feature',
          geometry: feature.geometry,
          properties: props,
        };
        this.featureLayerMap.set(id, layer);
        this.bindFeaturePopup(layer, gisFeature);
        this.features.update((f) => [...f, gisFeature]);
        drawnGroup.addLayer(layer);
      },
    });

    try {
      map.fitBounds(L.geoJSON(geojson).getBounds(), { padding: [20, 20] });
    } catch {
      /* empty bounds */
    }
  }

  clearAll(): void {
    this.layerService.getOverlayGroup('drawn-features')?.clearLayers();
    this.features.set([]);
    this.featureLayerMap.clear();
    this.drawnLayerCount.set(0);
  }

  // ── Private helpers ───────────────────────────────────

  private layerToGeoJSON(layer: any, type: DrawToolType): GisFeature | null {
    try {
      const id = generateId();
      layer._gisId = id;
      layer._drawType = type;

      if (type === 'circle') {
        const c = layer.getLatLng();
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [c.lng, c.lat] } as any,
          properties: {
            id,
            name: this.getFeatureName(type),
            drawType: type,
            radius: layer.getRadius(),
            createdAt: new Date().toISOString(),
          },
        };
      }

      const g = layer.toGeoJSON();
      g.properties = {
        id,
        name: this.getFeatureName(type),
        drawType: type,
        createdAt: new Date().toISOString(),
      };
      return g as GisFeature;
    } catch {
      return null;
    }
  }

  private getFeatureName(type: DrawToolType): string {
    const n: Record<DrawToolType, string> = {
      marker: 'Marcador',
      circle: 'Círculo',
      polygon: 'Polígono',
      polyline: 'Línea',
      rectangle: 'Rectángulo',
      circlemarker: 'Punto',
    };
    return `${n[type] ?? 'Feature'} ${this.drawnLayerCount() + 1}`;
  }

  private bindFeaturePopup(layer: any, feature: GisFeature): void {
    const p = feature.properties;
    layer.bindPopup(
      `
      <div style="padding:8px;min-width:160px">
        <strong style="font-size:14px">${p.name}</strong>
        <div style="font-size:11px;color:#666;margin-top:4px">
          Tipo: ${p.drawType}${p.radius ? ` · Radio: ${p.radius.toFixed(0)}m` : ''}
        </div>
      </div>`,
      { className: 'gis-popup' },
    );
  }
}
