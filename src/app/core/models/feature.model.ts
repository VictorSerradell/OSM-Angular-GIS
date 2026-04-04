// ============================================================
// OSM Angular GIS - Feature Models & Interfaces
// ============================================================

import { LatLng, LatLngBounds } from 'leaflet';

// ── GeoJSON Types ─────────────────────────────────────────

export type GeoJSONGeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection';

export type DrawToolType =
  | 'marker'
  | 'circle'
  | 'polygon'
  | 'polyline'
  | 'rectangle'
  | 'circlemarker';

export interface GeoJSONCoordinate {
  type: GeoJSONGeometryType;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GisFeatureProperties {
  id: string;
  name: string;
  description?: string;
  drawType?: DrawToolType;
  color?: string;
  fillColor?: string;
  weight?: number;
  opacity?: number;
  fillOpacity?: number;
  radius?: number;
  area?: number;       // in square meters (Turf)
  length?: number;     // in meters (Turf)
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface GisFeature {
  type: 'Feature';
  geometry: GeoJSONCoordinate;
  properties: GisFeatureProperties;
}

export interface GisFeatureCollection {
  type: 'FeatureCollection';
  features: GisFeature[];
  metadata?: {
    name?: string;
    description?: string;
    createdAt?: string;
  };
}

// ── Measurement ───────────────────────────────────────────

export interface MeasurementResult {
  type: 'distance' | 'area' | 'buffer' | 'centroid';
  value?: number;
  unit?: string;
  formattedValue?: string;
  geometry?: GeoJSONCoordinate;
}

// ── Popup ─────────────────────────────────────────────────

export interface PopupData {
  feature: GisFeature;
  latlng: LatLng;
}

// ── Map State ─────────────────────────────────────────────

export interface MapState {
  center: LatLng;
  zoom: number;
  bounds?: LatLngBounds;
}

export interface CoordinatesDisplay {
  lat: number;
  lng: number;
  zoom: number;
}
