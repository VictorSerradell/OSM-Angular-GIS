// ============================================================
// OSM Angular GIS - Layer Models
// ============================================================

import { TileLayer, LayerGroup } from 'leaflet';

export type LayerType = 'tile' | 'vector' | 'overlay';

export interface BaseLayerConfig {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom?: number;
  subdomains?: string | string[];
  visible?: boolean;
  thumbnail?: string;
}

export interface OverlayLayerConfig {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  color?: string;
  icon?: string;
  layer?: LayerGroup;
}

export interface LayerState {
  activeBaseLayer: string;
  visibleOverlays: string[];
}

// Tile layer definitions
export const BASE_LAYERS: BaseLayerConfig[] = [
  {
    id: 'osm-standard',
    name: 'OSM Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: 'abc',
    visible: true,
  },
  {
    id: 'osm-cycle',
    name: 'OSM Cycle Map',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.cyclosm.org">CyclOSM</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
    subdomains: 'abc',
  },
  {
    id: 'osm-transport',
    name: 'OSM Transport',
    url: 'https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png',
    attribution:
      'Map <a href="https://memomaps.de/">memomaps.de</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  },
  {
    id: 'carto-positron',
    name: 'CartoDB Positron',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  {
    id: 'carto-dark',
    name: 'CartoDB Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  {
    id: 'esri-world',
    name: 'ESRI World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
    maxZoom: 17,
  },
];
