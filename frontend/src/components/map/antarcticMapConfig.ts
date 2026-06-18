/** Antarctic map defaults — south polar view, south of 60°S (ATCM). */
import type { LngLatBoundsLike, Map as MaplibreMap } from 'maplibre-gl';

export const ANTARCTIC_BOUNDS: LngLatBoundsLike = [
  [-180, -90],
  [180, -60],
];

export const ANTARCTIC_CENTER: [number, number] = [0, -82];

export const ANTARCTIC_DEFAULT_ZOOM = 2.4;

export function applyAntarcticView(map: MaplibreMap, padding = 48) {
  map.setProjection({ type: 'globe' });
  map.fitBounds(ANTARCTIC_BOUNDS, { padding, duration: 0, maxZoom: 4.2 });
}

export function boundsFromGeoJson(features: GeoJSON.Feature[]): LngLatBoundsLike | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const extend = (lng: number, lat: number) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  };

  const walk = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords as GeoJSON.Position;
      extend(lng, lat);
      return;
    }
    coords.forEach(walk);
  };

  features.forEach((f) => {
    const g = f.geometry;
    if (!g || g.type === 'GeometryCollection') return;
    walk(g.coordinates);
  });

  if (!Number.isFinite(minLng)) return null;
  return [
    [minLng, Math.max(minLat, -90)],
    [maxLng, Math.min(maxLat, -60)],
  ];
}
