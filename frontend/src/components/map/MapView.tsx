/**
 * MapView — OpenLayers in true EPSG:3031 South Polar Stereographic
 *
 * Basemap: Natural Earth 10m land + Antarctic ice shelves (vector), with
 *          a lon/lat graticule. Vectors stay sharp at any zoom.
 * Rasters: Analysis PNGs at native 50 km cells, nearest-neighbour resampled
 *          so zooming shows crisp grid cells rather than blurry stretch.
 *
 * Interaction: pan, scroll/pinch zoom, and rotate (Shift-drag, or toolbar).
 */

import { useEffect, useRef } from 'react';
import proj4 from 'proj4';
import Map from 'ol/Map';
import View from 'ol/View';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import Graticule from 'ol/layer/Graticule';
import VectorSource from 'ol/source/Vector';
import ImageStatic from 'ol/source/ImageStatic';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { defaults as defaultControls } from 'ol/control/defaults';
import { defaults as defaultInteractions } from 'ol/interaction/defaults';
import DragRotate from 'ol/interaction/DragRotate';
import { shiftKeyOnly } from 'ol/events/condition';
import { register } from 'ol/proj/proj4';
import { get as getProjection } from 'ol/proj';
import { Fill, Stroke, Style, Text } from 'ol/style';
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

const RASTER_EXTENT: Extent = [-3000000, -3000000, 3000000, 3000000];
const ANTARCTIC_EXTENT: Extent = [-2800000, -2800000, 2800000, 2800000];

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';
const ROTATE_STEP = Math.PI / 6; // 30°

const OCEAN_STYLE = new Style({ fill: new Fill({ color: '#0b1a2c' }) });

function landStyle(_feature: FeatureLike, resolution: number): Style {
  const width = Math.max(0.6, Math.min(2.0, 1200 / resolution));
  return new Style({
    fill: new Fill({ color: '#1c332a' }),
    stroke: new Stroke({ color: '#4a7d62', width }),
  });
}

function iceShelfStyle(_feature: FeatureLike, resolution: number): Style {
  const width = Math.max(0.4, Math.min(1.4, 900 / resolution));
  return new Style({
    fill: new Fill({ color: 'rgba(186, 220, 232, 0.55)' }),
    stroke: new Stroke({ color: 'rgba(150, 198, 214, 0.9)', width }),
  });
}

function makeOceanLayer(): VectorLayer<VectorSource> {
  const R = 3_200_000;
  const N = 180;
  const ring: [number, number][] = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * 2 * Math.PI;
    return [R * Math.sin(a), R * Math.cos(a)];
  });
  ring.push(ring[0]);
  return new VectorLayer({
    source: new VectorSource({
      features: [new Feature({ geometry: new Polygon([ring]) })],
    }),
    style: OCEAN_STYLE,
    zIndex: 0,
  });
}

function makeGeoJsonLayer(
  name: string,
  style: Style | ((f: FeatureLike, r: number) => Style),
  zIndex: number,
): VectorLayer<VectorSource> {
  return new VectorLayer({
    source: new VectorSource({
      format: new GeoJSON({ dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3031' }),
      url: `${API_BASE}/layers/${name}`,
    }),
    style,
    zIndex,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
  });
}

function makeGraticule(): Graticule {
  const labelStyle = new Text({
    font: '11px "IBM Plex Mono", ui-monospace, monospace',
    fill: new Fill({ color: 'rgba(186, 205, 225, 0.85)' }),
    stroke: new Stroke({ color: 'rgba(11, 26, 44, 0.75)', width: 3 }),
  });
  return new Graticule({
    strokeStyle: new Stroke({
      color: 'rgba(148, 163, 184, 0.32)',
      width: 1,
      lineDash: [0.5, 4],
    }),
    showLabels: true,
    wrapX: false,
    lonLabelStyle: labelStyle,
    latLabelStyle: labelStyle,
    lonLabelFormatter: (lon: number) => {
      if (Math.abs(lon) < 1e-6) return '0°';
      return `${Math.abs(lon).toFixed(0)}°${lon < 0 ? 'W' : 'E'}`;
    },
    latLabelFormatter: (lat: number) => `${Math.abs(lat).toFixed(0)}°S`,
    intervals: [45, 30, 15, 10, 5, 2, 1],
    zIndex: 3,
  });
}

function makeRasterSource(url: string): ImageStatic {
  return new ImageStatic({
    url,
    projection: 'EPSG:3031',
    imageExtent: RASTER_EXTENT,
    crossOrigin: 'anonymous',
    // Keep 50 km cells crisp when zooming — no bilinear blur.
    interpolate: false,
  });
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
  const mapRef = useRef<Map | null>(null);
  const layersRef = useRef<Record<string, ImageLayer<ImageStatic>>>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      target: containerRef.current,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
      interactions: defaultInteractions({
        altShiftDragRotate: true,
        pinchRotate: true,
        dragPan: true,
        mouseWheelZoom: true,
        doubleClickZoom: true,
      }).extend([
        new DragRotate({ condition: shiftKeyOnly }),
      ]),
      layers: [
        makeOceanLayer(),
        makeGeoJsonLayer('coastline', landStyle, 1),
        makeGeoJsonLayer('ice_shelves', iceShelfStyle, 2),
        makeGraticule(),
      ],
      view: new View({
        projection: PROJ_3031,
        center: [0, 0],
        zoom: 1,
        minZoom: 0,
        maxZoom: 14,
        enableRotation: true,
        constrainResolution: false,
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
      const url = `data:image/png;base64,${raster.png_base64}`;
      const existing = layersRef.current[raster.id];

      if (!existing) {
        const layer = new ImageLayer({
          source: makeRasterSource(url),
          opacity: raster.visible ? raster.opacity : 0,
          zIndex: 4,
        });
        map.addLayer(layer);
        layersRef.current[raster.id] = layer;
      } else {
        existing.setOpacity(raster.visible ? raster.opacity : 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const src = existing.getSource() as any;
        if (src?.url_ !== url) {
          existing.setSource(makeRasterSource(url));
        }
      }
    });
  }, [rasters]);

  const withView = (fn: (view: View) => void) => {
    const view = mapRef.current?.getView();
    if (view) fn(view);
  };

  const zoomBy = (delta: number) => {
    withView(view => {
      const z = view.getZoom();
      if (z != null) view.animate({ zoom: z + delta, duration: 180 });
    });
  };

  const rotateBy = (radians: number) => {
    withView(view => {
      view.animate({ rotation: (view.getRotation() || 0) + radians, duration: 220 });
    });
  };

  const resetView = () => {
    const map = mapRef.current;
    if (!map) return;
    const view = map.getView();
    view.animate({ rotation: 0, duration: 200 });
    view.fit(ANTARCTIC_EXTENT, {
      size: map.getSize() ?? [800, 600],
      padding: [24, 24, 24, 24],
      duration: 280,
    });
  };

  return (
    <div className="map-view-wrap">
      <div
        ref={containerRef}
        className="map-view"
        style={{ width: '100%', height: '100%', background: '#0b1a2c' }}
      />
      <div className="map-toolbar" role="toolbar" aria-label="Map controls">
        <button type="button" title="Zoom in" onClick={() => zoomBy(1)}>+</button>
        <button type="button" title="Zoom out" onClick={() => zoomBy(-1)}>−</button>
        <button type="button" title="Rotate left (or Shift-drag)" onClick={() => rotateBy(-ROTATE_STEP)}>↺</button>
        <button type="button" title="Rotate right (or Shift-drag)" onClick={() => rotateBy(ROTATE_STEP)}>↻</button>
        <button type="button" title="Reset view" onClick={resetView}>⌂</button>
      </div>
      <p className="map-hint">
        Drag to pan · scroll to zoom · Shift-drag to rotate · analysis cells are 50 km
      </p>
    </div>
  );
}
