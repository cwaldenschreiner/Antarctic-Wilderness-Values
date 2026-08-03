/**
 * MapView — OpenLayers map in EPSG:3031 (South Polar Stereographic)
 *
 * Projection: EPSG:3031
 * Basemap:    OpenStreetMap tiles reprojected on-the-fly via OL
 * Rasters:    Rendered as ImageStatic layers with correct 3031 extent
 * Vectors:    GeoJSON features reprojected from EPSG:4326 → EPSG:3031
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
import { get as getProjection, transformExtent } from 'ol/proj';
import { Extent } from 'ol/extent';
import 'ol/ol.css';

// ── Register EPSG:3031 with proj4 ───────────────────────────────────────────
proj4.defs(
  'EPSG:3031',
  '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 ' +
  '+x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
);
register(proj4);

const PROJ_3031 = getProjection('EPSG:3031')!;
PROJ_3031.setExtent([-3333134, -3333134, 3333134, 3333134]);
PROJ_3031.setWorldExtent([-180, -90, 180, -60]);

// Antarctic view extent in EPSG:3031 (metres from pole)
// Covers continent + Peninsula comfortably
const ANTARCTIC_EXTENT_3031: Extent = [-2800000, -2800000, 2800000, 2800000];

// Raster extent: matches the WGS84 bounds used when generating PNGs
// lon -180..180, lat -85.05..-55 → transform to 3031
const RASTER_BOUNDS_4326 = [-180, -85.05, 180, -55.0];
const RASTER_EXTENT_3031: Extent = transformExtent(
  RASTER_BOUNDS_4326,
  'EPSG:4326',
  'EPSG:3031'
);

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
  // Track OL ImageLayer instances by raster id
  const layersRef    = useRef<Record<string, ImageLayer<ImageStatic>>>({});

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // OSM basemap reprojected into EPSG:3031
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
        center: [0, 0],           // South Pole in EPSG:3031
        zoom: 1,
        extent: [-4000000, -4000000, 4000000, 4000000],
        minZoom: 0,
        maxZoom: 12,
      }),
    });

    // Fit view to Antarctic extent on load
    map.getView().fit(ANTARCTIC_EXTENT_3031, {
      size: map.getSize() ?? [800, 600],
      padding: [20, 20, 20, 20],
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      layersRef.current = {};
    };
  }, []);

  // ── Sync raster layers ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(rasters.map(r => r.id));

    // Remove layers that are no longer in rasters
    Object.keys(layersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        map.removeLayer(layersRef.current[id]);
        delete layersRef.current[id];
      }
    });

    rasters.forEach(raster => {
      const url = `data:image/png;base64,${raster.png_base64}`;
      const existing = layersRef.current[raster.id];

      if (!existing) {
        // Create new ImageStatic layer
        // The PNG was generated in WGS84 pixel space covering RASTER_BOUNDS_4326,
        // but OL will render it correctly into EPSG:3031 view using RASTER_EXTENT_3031
        const layer = new ImageLayer({
          source: new ImageStatic({
            url,
            projection: 'EPSG:4326',
            imageExtent: RASTER_BOUNDS_4326,
            crossOrigin: 'anonymous',
          }),
          opacity: raster.visible ? raster.opacity : 0,
          extent: RASTER_EXTENT_3031,
        });
        map.addLayer(layer);
        layersRef.current[raster.id] = layer;
      } else {
        // Update opacity/visibility
        existing.setOpacity(raster.visible ? raster.opacity : 0);

        // If png data changed, replace the source
        const src = existing.getSource() as ImageStatic;
        const currentUrl = (src as unknown as { url_: string }).url_;
        if (currentUrl !== url) {
          existing.setSource(
            new ImageStatic({
              url,
              projection: 'EPSG:4326',
              imageExtent: RASTER_BOUNDS_4326,
              crossOrigin: 'anonymous',
            })
          );
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
