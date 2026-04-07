// ============================================================
// OSM Angular GIS - Draw Service
// Production-safe: leaflet-draw loaded dynamically after Leaflet
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
import * as L from 'leaflet';
import { MapService } from './map.service';
import { LayerService } from './layer.service';
import {
  GisFeature,
  GisFeatureCollection,
  DrawToolType,
} from '../models/feature.model';

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
  private LA: any = null; // leaflet + leaflet-draw extended object

  // ── Init ──────────────────────────────────────────────

  async initDraw(): Promise<void> {
    const map = this.mapService.map;
    if (!map) return;

    // Load leaflet-draw dynamically AFTER leaflet is ready
    // This guarantees L.Draw and L.Control.Draw exist
    await import('leaflet-draw');

    // Give the browser one tick to process the side-effect import
    await new Promise((r) => setTimeout(r, 0));

    this.LA = L as any;

    // Validate leaflet-draw loaded correctly
    if (!this.LA.Control?.Draw) {
      console.error('leaflet-draw did not load correctly');
      return;
    }
    if (!this.LA.Draw?.Event) {
      console.error('L.Draw.Event not available');
      return;
    }

    const drawnGroup = this.layerService.getOverlayGroup('drawn-features');
    if (!drawnGroup) {
      console.error('drawn-features overlay not found');
      return;
    }

    this.drawControl = new this.LA.Control.Draw({
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

    map.on(this.LA.Draw.Event.CREATED, (e: any) => {
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

    map.on(this.LA.Draw.Event.EDITED, (e: any) => {
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

    map.on(this.LA.Draw.Event.DELETED, (e: any) => {
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
    const map = this.mapService.map;
    if (!map || !this.LA) {
      console.warn('Map or leaflet-draw not ready');
      return;
    }

    const shape = {
      color: '#1565c0',
      weight: 2,
      fillColor: '#1565c0',
      fillOpacity: 0.2,
    };

    const toolConfigs: Record<DrawToolType, { cls: any; opts: any }> = {
      marker: { cls: this.LA.Draw?.Marker, opts: {} },
      circlemarker: {
        cls: this.LA.Draw?.CircleMarker,
        opts: { color: '#1565c0', radius: 8 },
      },
      polyline: {
        cls: this.LA.Draw?.Polyline,
        opts: { shapeOptions: { ...shape, fillOpacity: 0 } },
      },
      polygon: {
        cls: this.LA.Draw?.Polygon,
        opts: { allowIntersection: false, shapeOptions: shape },
      },
      rectangle: {
        cls: this.LA.Draw?.Rectangle,
        opts: { shapeOptions: shape },
      },
      circle: { cls: this.LA.Draw?.Circle, opts: { shapeOptions: shape } },
    };

    const cfg = toolConfigs[toolType];
    if (!cfg?.cls) {
      console.warn(
        `Draw tool class not available: ${toolType}. leaflet-draw loaded:`,
        !!this.LA.Draw,
      );
      return;
    }

    try {
      new cfg.cls(map, cfg.opts).enable();
      this.activeDrawTool.set(toolType);
    } catch (e) {
      console.error('activateTool error:', toolType, e);
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

    (L as any).geoJSON(geojson, {
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
      const geoLayer = (L as any).geoJSON(geojson);
      map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
    } catch {
      /* empty bounds */
    }
  }

  clearAll(): void {
    const drawnGroup = this.layerService.getOverlayGroup('drawn-features');
    drawnGroup?.clearLayers();
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
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [center.lng, center.lat],
          } as any,
          properties: {
            id,
            name: this.getFeatureName(type),
            drawType: type,
            radius,
            createdAt: new Date().toISOString(),
          },
        };
      }

      const geojson = layer.toGeoJSON();
      geojson.properties = {
        id,
        name: this.getFeatureName(type),
        drawType: type,
        createdAt: new Date().toISOString(),
      };
      return geojson as GisFeature;
    } catch {
      return null;
    }
  }

  private getFeatureName(type: DrawToolType): string {
    const names: Record<DrawToolType, string> = {
      marker: 'Marcador',
      circle: 'Círculo',
      polygon: 'Polígono',
      polyline: 'Línea',
      rectangle: 'Rectángulo',
      circlemarker: 'Punto',
    };
    return `${names[type] ?? 'Feature'} ${this.drawnLayerCount() + 1}`;
  }

  private bindFeaturePopup(layer: any, feature: GisFeature): void {
    const p = feature.properties;
    layer.bindPopup(
      `
      <div style="min-width:170px;padding:8px">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">${p.name}</div>
        ${p.description ? `<div style="font-size:12px;color:#666">${p.description}</div>` : ''}
        <div style="font-size:11px;color:#999;margin-top:4px">
          <div>Tipo: ${p.drawType ?? '—'}</div>
          ${p.radius ? `<div>Radio: ${p.radius.toFixed(0)} m</div>` : ''}
        </div>
      </div>`,
      { className: 'gis-popup' },
    );
  }
}
