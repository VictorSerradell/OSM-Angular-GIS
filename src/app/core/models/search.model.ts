// ============================================================
// OSM Angular GIS - Search & Geocoding Models
// ============================================================

export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  address?: NominatimAddress;
  geojson?: unknown;
}

export interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export interface SearchState {
  query: string;
  results: NominatimResult[];
  loading: boolean;
  error: string | null;
  selectedResult: NominatimResult | null;
}

// Overpass API
export interface OverpassQuery {
  query: string;
  description?: string;
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  members?: unknown[];
  geometry?: Array<{ lat: number; lon: number }>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

// Predefined Overpass queries
export const OVERPASS_PRESETS: OverpassQuery[] = [
  {
    query: `[out:json][timeout:25];
      node["amenity"="restaurant"]({{bbox}});
      out body;`,
    description: 'Restaurantes en vista',
  },
  {
    query: `[out:json][timeout:25];
      node["amenity"="hospital"]({{bbox}});
      out body;`,
    description: 'Hospitales en vista',
  },
  {
    query: `[out:json][timeout:25];
      node["amenity"="school"]({{bbox}});
      out body;`,
    description: 'Colegios en vista',
  },
  {
    query: `[out:json][timeout:25];
      way["highway"="primary"]({{bbox}});
      out geom;`,
    description: 'Carreteras principales',
  },
];
