// ============================================================
// OSM Angular GIS - Layer Service
// ============================================================

import { Injectable, signal, inject } from '@angular/core';
declare const L: any;
import { MapService } from './map.service';
import {
  BASE_LAYERS,
  BaseLayerConfig,
  OverlayLayerConfig,
} from '../models/layer.model';

@Injectable({ providedIn: 'root' })
export class LayerService {
  private mapService = inject(MapService);

  readonly baseLayers = signal<BaseLayerConfig[]>(BASE_LAYERS);
  readonly activeBaseLayerId = signal<string>('osm-standard');
  readonly overlays = signal<OverlayLayerConfig[]>([
    {
      id: 'drawn-features',
      name: 'Features dibujadas',
      type: 'overlay',
      visible: true,
      icon: 'edit',
      color: '#1565c0',
    },
    {
      id: 'search-results',
      name: 'Resultados de búsqueda',
      type: 'overlay',
      visible: true,
      icon: 'search',
      color: '#43a047',
    },
    {
      id: 'measurements',
      name: 'Mediciones',
      type: 'overlay',
      visible: true,
      icon: 'straighten',
      color: '#f57c00',
    },
    {
      id: 'overpass',
      name: 'Datos Overpass',
      type: 'overlay',
      visible: false,
      icon: 'layers',
      color: '#7b1fa2',
    },
  ]);

  private tileLayerInstances = new Map<string, any>();
  private overlayLayerInstances = new Map<string, any>();
  private layersControl: any = null;

  /**
   * Initialize all tile layers and add the default one to the map.
   */
  async initLayers(): Promise<void> {
    const map = this.mapService.map;
    if (!map) return;

    const tileLayersForControl: Record<string, any> = {};

    for (const config of BASE_LAYERS) {
      const layer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom ?? 19,
        subdomains: (config.subdomains ?? 'abc') as string,
      });

      this.tileLayerInstances.set(config.id, layer);
      tileLayersForControl[config.name] = layer;

      // Add default layer
      if (config.id === 'osm-standard') {
        layer.addTo(map);
      }
    }

    // Initialize overlay layer groups
    const overlayLayersForControl: Record<string, any> = {};
    for (const overlay of this.overlays()) {
      // Use featureGroup (not layerGroup) — required by leaflet-draw edit toolbar
      const group =
        overlay.id === 'drawn-features' ? L.featureGroup() : L.layerGroup();
      this.overlayLayerInstances.set(overlay.id, group);
      overlayLayersForControl[overlay.name] = group;
      if (overlay.visible) {
        group.addTo(map);
      }
    }

    // Add native Leaflet layers control
    this.layersControl = L.control
      .layers(tileLayersForControl, overlayLayersForControl, {
        position: 'topright',
        collapsed: true,
      })
      .addTo(map);
  }

  /**
   * Switch the base tile layer.
   */
  async switchBaseLayer(layerId: string): Promise<void> {
    const map = this.mapService.map;
    if (!map) return;

    // Remove current
    const currentLayer = this.tileLayerInstances.get(this.activeBaseLayerId());
    if (currentLayer) map.removeLayer(currentLayer);

    // Add new
    const newLayer = this.tileLayerInstances.get(layerId);
    if (newLayer) {
      newLayer.addTo(map);
      this.activeBaseLayerId.set(layerId);
    }
  }

  /**
   * Toggle overlay visibility.
   */
  toggleOverlay(overlayId: string): void {
    const map = this.mapService.map;
    if (!map) return;

    const group = this.overlayLayerInstances.get(overlayId);
    if (!group) return;

    const overlay = this.overlays().find((o) => o.id === overlayId);
    if (!overlay) return;

    if (overlay.visible) {
      map.removeLayer(group);
    } else {
      group.addTo(map);
    }

    this.overlays.update((list) =>
      list.map((o) => (o.id === overlayId ? { ...o, visible: !o.visible } : o)),
    );
  }

  /**
   * Get a specific overlay layer group.
   */
  getOverlayGroup(overlayId: string): any {
    return this.overlayLayerInstances.get(overlayId);
  }

  /**
   * Get all overlay groups.
   */
  getAllOverlayGroups(): Map<string, any> {
    return this.overlayLayerInstances;
  }
}
