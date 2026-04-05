// ============================================================
// OSM Angular GIS - Draw Service (Leaflet Draw)
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
import { MapService } from './map.service';
import { LayerService } from './layer.service';
import {
  GisFeature,
  GisFeatureCollection,
  DrawToolType,
} from '../models/feature.model';

/** Simple unique-id generator — no external dependency needed */
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

  // drawControl typed as `any` — leaflet-draw typings are incomplete
  private drawControl: any = null;
  private featureLayerMap = new Map<string, any>();

  // ── Init ────────────────────────────────────────────────

  async initDraw(): Promise<void> {
    const map = this.mapService.map;
    if (!map) return;

    const L = await import('leaflet');
    await import('leaflet-draw');

    const drawnGroup = this.layerService.getOverlayGroup('drawn-features');
    if (!drawnGroup) {
      console.error(
        'DrawService: drawn-features overlay not found. initLayers() must run first.',
      );
      return;
    }
    // Verify it's a FeatureGroup (leaflet-draw requirement)
    if (typeof (drawnGroup as any).getLayers !== 'function') {
      console.error('DrawService: drawn-features must be a L.FeatureGroup');
      return;
    }

    // Cast L to any so we can access L.Control.Draw added by leaflet-draw
    const LA = L as any;

    this.drawControl = new LA.Control.Draw({
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

    // ── Event: feature created ──────────────────────────
    map.on(LA.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const drawType = e.layerType as DrawToolType;
      const feature = this.layerToGeoJSON(layer, drawType);

      if (feature) {
        drawnGroup.addLayer(layer);
        this.featureLayerMap.set(feature.properties.id, layer);
        this.bindFeaturePopup(layer, feature);
        this.features.update((f) => [...f, feature]);
        this.drawnLayerCount.update((n) => n + 1);
        this.activeDrawTool.set(null);
      }
    });

    // ── Event: feature edited ───────────────────────────
    map.on(LA.Draw.Event.EDITED, (e: any) => {
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

    // ── Event: feature deleted ──────────────────────────
    map.on(LA.Draw.Event.DELETED, (e: any) => {
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

  // ── Programmatic tool activation ─────────────────────

  async activateTool(toolType: DrawToolType): Promise<void> {
    const L = await import('leaflet');
    const LA = L as any;
    const map = this.mapService.map;
    if (!map) return;

    const toolMap: Record<DrawToolType, any> = {
      polyline: LA.Draw?.Polyline,
      polygon: LA.Draw?.Polygon,
      rectangle: LA.Draw?.Rectangle,
      circle: LA.Draw?.Circle,
      marker: LA.Draw?.Marker,
      circlemarker: LA.Draw?.CircleMarker,
    };

    const ToolClass = toolMap[toolType];
    if (ToolClass) {
      new ToolClass(map, {
        shapeOptions: { color: '#1565c0', weight: 2, fillOpacity: 0.2 },
      }).enable();
      this.activeDrawTool.set(toolType);
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
    const L = await import('leaflet');
    const map = this.mapService.map;
    const drawnGroup = this.layerService.getOverlayGroup('drawn-features');
    if (!map || !drawnGroup) return;

    const geoLayer = (L as any).geoJSON(geojson, {
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
      map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
    } catch {
      /* empty */
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
        ${p.description ? `<div style="font-size:12px;color:#666;margin-bottom:4px">${p.description}</div>` : ''}
        <div style="font-size:11px;color:#999">
          <div>Tipo: ${p.drawType ?? '—'}</div>
          ${p.radius ? `<div>Radio: ${p.radius.toFixed(0)} m</div>` : ''}
          ${p.area ? `<div>Área: ${(p.area / 1e6).toFixed(4)} km²</div>` : ''}
          <div>Creado: ${new Date(p.createdAt).toLocaleDateString()}</div>
        </div>
      </div>`,
      { className: 'gis-popup' },
    );
  }
}
