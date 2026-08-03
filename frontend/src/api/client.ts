/// <reference types="vite/client" />
const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json();
}

export const fetchCatalog        = ()        => get<CatalogResponse>('/layers/catalog');
export const fetchPrecomputed    = ()        => get<PrecomputedResponse>('/precomputed');
export const analyzeRemoteness   = (b: unknown) => post<RemotenessResult>('/analyze/remoteness', b);
export const analyzeWildness     = (b: unknown) => post<WildnessResult>('/analyze/wildness', b);
export const analyzePristineness = (b: unknown) => post<PristinenessResult>('/analyze/pristineness', b);

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
  return r.json();
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CatalogLayer {
  id: string; name: string; source: string; license: string;
  vintage: string; description: string; citation: string; tabs: string[];
  n_features?: number;
}
export interface CatalogResponse {
  layers: CatalogLayer[];
  references?: string[];
  data_gaps?: string[];
}

export interface RasterCoords { coordinates: [[number,number],[number,number],[number,number],[number,number]] }

export interface IdentifyGridPayload {
  shape: [number, number];
  extent: [number, number, number, number];
  nodata: number;
  data_b64: string;
}

export interface RemotenessResult {
  score_png: string; rank_png: string; raster_coords: number[][];
  identify_grids?: Record<string, IdentifyGridPayload>;
  rank_pcts: Record<string, number>;
  mean_score: number; high_remoteness_pct: number;
  high_remoteness_km2: number; total_continent_km2: number;
  histogram: { counts: number[]; edges: number[] };
  n_facilities: number; n_visitor_sites: number;
  params: Record<string, number>;
}

export interface WildnessResult {
  wildness_png: string; viewshed_png: string; raster_coords: number[][];
  identify_grids?: Record<string, IdentifyGridPayload>;
  wild_pct: number; visible_impact_pct: number;
  wild_area_km2: number; impacted_area_km2: number; total_continent_km2: number;
  histogram: { counts: number[]; edges: number[] };
  n_facilities: number; n_visitor_sites: number;
  params: Record<string, number>;
}

export interface PristinenessResult {
  pristineness_png: string; inviolate_png: string; raster_coords: number[][];
  identify_grids?: Record<string, IdentifyGridPayload>;
  inviolate_pct: number; inviolate_area_km2: number; total_continent_km2: number;
  n_patches: number; largest_patch_km2: number; mean_patch_km2: number;
  mean_score: number;
  histogram: { counts: number[]; edges: number[] };
  n_visitor_sites: number; n_inviolate_polygons: number;
  params: Record<string, number>;
}

export interface PrecomputedResponse {
  rasters: Record<string, string>;
  grids?: Record<string, IdentifyGridPayload>;
  stats: {
    remoteness?: { rank_pcts: Record<string,number>; mean_score: number; high_remoteness_pct: number; high_remoteness_km2: number; total_continent_km2: number };
    wildness?:   { wild_pct: number; visible_impact_pct: number; wild_area_km2: number; impacted_area_km2: number };
    pristineness?: { inviolate_pct: number; inviolate_area_km2: number; n_patches: number; largest_patch_km2: number };
    grid?: { resolution_km: number; n_continent_cells: number };
  };
  raster_coords: number[][];
  /** EPSG:3031 ImageStatic extent [minX, minY, maxX, maxY] (cell outer edges). */
  raster_extent?: [number, number, number, number];
}

export interface UploadResult {
  upload_id: string; feature_count: number;
  geometry_types: Record<string, number>; crs: string;
}
