/**
 * MapView — OpenLayers in true EPSG:3031 South Polar Stereographic
 *
 * Basemap:  Natural Earth 50m Antarctic coastline as OL VectorLayer
 *           (vector reprojection is exact — no raster sampling artifacts)
 * Rasters:  PNG images generated natively in EPSG:3031 pixel space,
 *           declared with projection='EPSG:3031' and extent ±3,000,000 m.
 *           Zero reprojection error.
 */

import { useEffect, useRef } from 'react';
import proj4 from 'proj4';
import Map from 'ol/Map';
import View from 'ol/View';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import ImageStatic from 'ol/source/ImageStatic';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { register } from 'ol/proj/proj4';
import { get as getProjection } from 'ol/proj';
import { Fill, Stroke, Style } from 'ol/style';
import type { Extent } from 'ol/extent';
import 'ol/ol.css';

// ── Register EPSG:3031 ────────────────────────────────────────────────────────
proj4.defs(
  'EPSG:3031',
  '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 ' +
  '+x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
);
register(proj4);

const PROJ_3031 = getProjection('EPSG:3031')!;
PROJ_3031.setExtent([-3333134, -3333134, 3333134, 3333134]);
PROJ_3031.setWorldExtent([-180, -90, 180, -60]);

// Rasters are 600×600 px generated natively in EPSG:3031, covering ±3,000,000 m
const RASTER_EXTENT: Extent = [-3000000, -3000000, 3000000, 3000000];

// Initial view: Antarctic continent ±2,800 km from pole
const ANTARCTIC_EXTENT: Extent = [-2800000, -2800000, 2800000, 2800000];

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

// ── Styles ────────────────────────────────────────────────────────────────────
const OCEAN_STYLE  = new Style({ fill: new Fill({ color: '#0d1f35' }) });
const LAND_STYLE   = new Style({
  fill:   new Fill({ color: '#1a3028' }),
  stroke: new Stroke({ color: '#2a4a38', width: 0.6 }),
});

// Ocean background: large filled disc in EPSG:3031
function makeOceanLayer(): VectorLayer<VectorSource> {
  const R = 3_200_000;
  const N = 128;
  const ring: [number, number][] = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * 2 * Math.PI;
    return [R * Math.sin(a), R * Math.cos(a)];
  });
  ring.push(ring[0]);
  const src = new VectorSource({
    features: [new Feature({ geometry: new Polygon([ring]) })],
  });
  return new VectorLayer({ source: src, style: OCEAN_STYLE, zIndex: 0 });
}

export interface RasterLayer {
  id: string;
  png_base64: string;
  coords: [[number, number], [number, number], [number, number], [number, number]];
  opacity: number;
  visible: boolean;
}

interface Props {
  rasters: RasterLayer[];
}

export function MapView({ rasters }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<Map | null>(null);
  const layersRef    = useRef<Record<string, ImageLayer<ImageStatic>>>({});

  // ── Init map once ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Coastline: VectorSource loading GeoJSON from API
    // OL reprojects GeoJSON vectors analytically — no distortion
    const coastSource = new VectorSource({
      format: new GeoJSON({ dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3031' }),
      url: `${API_BASE}/layers/coastline`,
    });

    const map = new Map({
      target: containerRef.current,
      layers: [
        makeOceanLayer(),
        new VectorLayer({
          source: coastSource,
          style: LAND_STYLE,
          zIndex: 1,
        }),
      ],
      view: new View({
        projection: PROJ_3031,
        center: [0, 0],
        zoom: 1,
        minZoom: 0,
        maxZoom: 14,
      }),
    });

    map.getView().fit(ANTARCTIC_EXTENT, {
      size: map.getSize() ?? [800, 600],
      padding: [24, 24, 24, 24],
    });

    mapRef.current = map;
    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      layersRef.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync raster layers ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(rasters.map(r => r.id));

    Object.keys(layersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        map.removeLayer(layersRef.current[id]);
        delete layersRef.current[id];
      }
    });

    rasters.forEach(raster => {
      const url      = `data:image/png;base64,${raster.png_base64}`;
      const existing = layersRef.current[raster.id];

      if (!existing) {
        const layer = new ImageLayer({
          source: new ImageStatic({
            url,
            projection: 'EPSG:3031',   // rasters are native EPSG:3031
            imageExtent: RASTER_EXTENT, // ±3,000,000 m from South Pole
            crossOrigin: 'anonymous',
          }),
          opacity: raster.visible ? raster.opacity : 0,
          zIndex: 2,
        });
        map.addLayer(layer);
        layersRef.current[raster.id] = layer;
      } else {
        existing.setOpacity(raster.visible ? raster.opacity : 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const src = existing.getSource() as any;
        if (src?.url_ !== url) {
          existing.setSource(new ImageStatic({
            url,
            projection: 'EPSG:3031',
            imageExtent: RASTER_EXTENT,
            crossOrigin: 'anonymous',
          }));
        }
      }
    });
  }, [rasters]);

  return (
    <div
      ref={containerRef}
      className="map-view"
      style={{ width: '100%', height: '100%', background: '#0d1f35' }}
    />
  );
}
