/**
 * MapView — OpenLayers map in EPSG:3031 (South Polar Stereographic)
 *
 * Projection: EPSG:3031  (registered via proj4)
 * Basemap:    OpenStreetMap tiles reprojected on-the-fly by OL
 * Rasters:    PNG images generated natively in EPSG:3031 pixel space,
 *             declared with projection='EPSG:3031' — zero reprojection error.
 *             Extent: ±3,000,000 m from South Pole (covers full Antarctic region).
 */

import { useEffect, useRef } from 'react';
import proj4 from 'proj4';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import XYZ from 'ol/source/XYZ';
import ImageStatic from 'ol/source/ImageStatic';
import { register } from 'ol/proj/proj4';
import { get as getProjection } from 'ol/proj';
import type { Extent } from 'ol/extent';
import 'ol/ol.css';

// ── Register EPSG:3031 ───────────────────────────────────────────────────────
proj4.defs(
  'EPSG:3031',
  '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 ' +
  '+x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
);
register(proj4);

const PROJ_3031 = getProjection('EPSG:3031')!;
PROJ_3031.setExtent([-3333134, -3333134, 3333134, 3333134]);
PROJ_3031.setWorldExtent([-180, -90, 180, -60]);

// Rasters are 600×600 px covering ±3,000,000 m from pole in EPSG:3031
const RASTER_EXTENT_3031: Extent = [-3000000, -3000000, 3000000, 3000000];

// Initial view fits the Antarctic continent (±2,800 km)
const ANTARCTIC_EXTENT_3031: Extent = [-2800000, -2800000, 2800000, 2800000];

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

    const basemap = new TileLayer({
      source: new XYZ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        crossOrigin: 'anonymous',
        attributions: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }),
      opacity: 0.5,
    });

    const map = new Map({
      target: containerRef.current,
      layers: [basemap],
      view: new View({
        projection: PROJ_3031,
        center: [0, 0],        // South Pole
        zoom: 1,
        minZoom: 0,
        maxZoom: 12,
      }),
    });

    map.getView().fit(ANTARCTIC_EXTENT_3031, {
      size: map.getSize() ?? [800, 600],
      padding: [24, 24, 24, 24],
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      layersRef.current = {};
    };
  }, []);

  // ── Sync raster layers whenever props change ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(rasters.map(r => r.id));

    // Remove stale layers
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
        // Raster was generated natively in EPSG:3031 pixel space:
        // projection='EPSG:3031', imageExtent=±3,000,000 m
        // OL places it with zero reprojection — perfect polar stereographic accuracy.
        const layer = new ImageLayer({
          source: new ImageStatic({
            url,
            projection: 'EPSG:3031',
            imageExtent: RASTER_EXTENT_3031,
            crossOrigin: 'anonymous',
          }),
          opacity: raster.visible ? raster.opacity : 0,
        });
        map.addLayer(layer);
        layersRef.current[raster.id] = layer;
      } else {
        // Update opacity / visibility
        existing.setOpacity(raster.visible ? raster.opacity : 0);

        // Replace source if image data changed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const src = existing.getSource() as any;
        if (src?.url_ !== url) {
          existing.setSource(new ImageStatic({
            url,
            projection: 'EPSG:3031',
            imageExtent: RASTER_EXTENT_3031,
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
      style={{ width: '100%', height: '100%', background: '#0a1628' }}
    />
  );
}
