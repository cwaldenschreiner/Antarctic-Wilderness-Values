/**
 * MapView — OpenLayers EPSG:3031 South Polar Stereographic
 *
 * Basemap: Natural Earth 10m land + ice shelves + graticule
 * Overlays: toggleable input layers (facilities, visitors, inviolate, place names)
 * Rasters: analysis PNGs (nearest-neighbour)
 * Identify: hover/click readout for vectors + analysis grid values
 */

import { useEffect, useRef, useState } from 'react';
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
import { get as getProjection, transform } from 'ol/proj';
import { Fill, Stroke, Style, Text, Circle as CircleStyle } from 'ol/style';
import type { MapBrowserEvent } from 'ol';
import type { Extent } from 'ol/extent';
import type { IdentifyGridPayload } from '../../api/client';
import 'ol/ol.css';

proj4.defs(
  'EPSG:3031',
  '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 ' +
  '+x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
);
register(proj4);

const PROJ_3031 = getProjection('EPSG:3031')!;
PROJ_3031.setExtent([-3333134, -3333134, 3333134, 3333134]);
PROJ_3031.setWorldExtent([-180, -90, 180, -60]);

// Outer edges of 50 km cells centred on ±3 000 000 m (not centre-to-centre).
const RASTER_EXTENT: Extent = [-3025000, -3025000, 3025000, 3025000];
// Default view includes South Shetlands / Elephant Island (~3,200 km from pole).
const ANTARCTIC_EXTENT: Extent = [-3200000, -3200000, 3200000, 3200000];
const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';
const ROTATE_STEP = Math.PI / 6;

const OCEAN_STYLE = new Style({ fill: new Fill({ color: '#0b1a2c' }) });

function landStyle(_f: FeatureLike, resolution: number): Style {
  const width = Math.max(0.6, Math.min(2.0, 1200 / resolution));
  return new Style({
    fill: new Fill({ color: '#1c332a' }),
    stroke: new Stroke({ color: '#4a7d62', width }),
  });
}

function iceShelfStyle(_f: FeatureLike, resolution: number): Style {
  const width = Math.max(0.4, Math.min(1.4, 900 / resolution));
  return new Style({
    fill: new Fill({ color: 'rgba(186, 220, 232, 0.55)' }),
    stroke: new Stroke({ color: 'rgba(150, 198, 214, 0.9)', width }),
  });
}

function facilityStyle(_f: FeatureLike, resolution: number): Style {
  const r = Math.max(3, Math.min(7, 14000 / resolution));
  return new Style({
    image: new CircleStyle({
      radius: r,
      fill: new Fill({ color: '#f59e0b' }),
      stroke: new Stroke({ color: '#1a1205', width: 1.2 }),
    }),
  });
}

function visitorStyle(_f: FeatureLike, resolution: number): Style {
  const r = Math.max(2.5, Math.min(6, 12000 / resolution));
  return new Style({
    image: new CircleStyle({
      radius: r,
      fill: new Fill({ color: '#38bdf8' }),
      stroke: new Stroke({ color: '#0b1a2c', width: 1 }),
    }),
  });
}

function inviolateStyle(_f: FeatureLike, _r: number): Style {
  return new Style({
    fill: new Fill({ color: 'rgba(52, 211, 153, 0.28)' }),
    stroke: new Stroke({ color: 'rgba(16, 185, 129, 0.85)', width: 0.8 }),
  });
}

function placeNameStyle(feature: FeatureLike, resolution: number): Style | Style[] {
  const kind = String(feature.get('kind') || 'region');
  const name = String(feature.get('name') || '');
  const isStation = kind === 'station';
  // Hide dense station labels until zoomed in a bit
  if (isStation && resolution > 18000) return [];
  if (!isStation && resolution > 45000 && (kind === 'cape' || kind === 'island' || kind === 'feature')) {
    return [];
  }
  const fontSize = isStation ? 11 : kind === 'region' || kind === 'sea' || kind === 'ice' ? 12 : 11;
  const color = isStation ? '#fde68a' : '#e2e8f0';
  return [
    new Style({
      image: new CircleStyle({
        radius: isStation ? 0 : 2,
        fill: new Fill({ color: 'rgba(226,232,240,0.7)' }),
      }),
      text: new Text({
        text: name,
        font: `${isStation ? 500 : 600} ${fontSize}px "Source Sans 3", system-ui, sans-serif`,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: 'rgba(11,26,44,0.85)', width: 3 }),
        offsetY: isStation ? -10 : -8,
        textAlign: 'center',
      }),
    }),
  ];
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
  style: Style | Style[] | ((f: FeatureLike, r: number) => Style | Style[] | void),
  zIndex: number,
  opts: { declutter?: boolean; visible?: boolean } = {},
): VectorLayer<VectorSource> {
  return new VectorLayer({
    source: new VectorSource({
      format: new GeoJSON({ dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3031' }),
      url: `${API_BASE}/layers/${name}`,
    }),
    style,
    zIndex,
    visible: opts.visible ?? true,
    declutter: opts.declutter ?? false,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    properties: { overlayId: name },
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
    interpolate: false,
  });
}

const OVERLAY_STYLE: Record<string, (f: FeatureLike, r: number) => Style | Style[] | void> = {
  facilities: facilityStyle,
  visitor_sites: visitorStyle,
  inviolate_wilderness: inviolateStyle,
  place_names: placeNameStyle,
};

export interface RasterLayer {
  id: string;
  png_base64: string;
  coords: [[number, number], [number, number], [number, number], [number, number]];
  opacity: number;
  visible: boolean;
}

export type OverlayId = 'facilities' | 'visitor_sites' | 'inviolate_wilderness' | 'place_names';

export interface OverlayLayer {
  id: OverlayId;
  visible: boolean;
}

export interface IdentifyGrid {
  id: string;
  label: string;
  visible: boolean;
  grid: IdentifyGridPayload;
}

export interface IdentifyFeatureInfo {
  layer: string;
  title: string;
  attrs: Record<string, string | number>;
}

export interface IdentifyState {
  coordinate: [number, number];
  lonlat: [number, number];
  features: IdentifyFeatureInfo[];
  grids: { label: string; value: number | null }[];
}

interface Props {
  rasters: RasterLayer[];
  overlays?: OverlayLayer[];
  identifyGrids?: IdentifyGrid[];
}

function decodeGrid(payload: IdentifyGridPayload): Float32Array {
  const bin = atob(payload.data_b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return new Float32Array(buf);
}

const gridCache = new WeakMap<IdentifyGridPayload, Float32Array>();

function cachedGrid(payload: IdentifyGridPayload): Float32Array {
  let data = gridCache.get(payload);
  if (!data) {
    data = decodeGrid(payload);
    gridCache.set(payload, data);
  }
  return data;
}

function sampleGrid(payload: IdentifyGridPayload, x: number, y: number): number | null {
  const [ny, nx] = payload.shape;
  const [xmin, ymin, xmax, ymax] = payload.extent;
  if (x < xmin || x > xmax || y < ymin || y > ymax) return null;
  const col = Math.min(nx - 1, Math.max(0, Math.floor(((x - xmin) / (xmax - xmin)) * nx)));
  // Row 0 = maxY (north), matching vertically flipped analysis PNG
  const row = Math.min(ny - 1, Math.max(0, Math.floor(((ymax - y) / (ymax - ymin)) * ny)));
  const data = cachedGrid(payload);
  const v = data[row * nx + col];
  if (!Number.isFinite(v) || v === payload.nodata) return null;
  return v;
}

function formatAttrValue(v: unknown): string | number {
  if (v == null) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 100) / 100;
  return String(v);
}

function featureTitle(layer: string, props: Record<string, unknown>): string {
  if (typeof props.name === 'string' && props.name) return props.name;
  if (layer === 'inviolate_wilderness') return 'Inviolate wilderness cell';
  return layer;
}

function pickAttrs(layer: string, props: Record<string, unknown>): Record<string, string | number> {
  const prefer: Record<string, string[]> = {
    facilities: ['nation', 'status', 'facility_type', 'activity_type', 'year'],
    visitor_sites: ['region', 'site', 'total_visits_5yr', 'activity_type'],
    inviolate_wilderness: ['area_km2', 'description', 'source'],
    place_names: ['kind', 'source'],
  };
  const keys = prefer[layer] || Object.keys(props).slice(0, 6);
  const out: Record<string, string | number> = {};
  for (const k of keys) {
    if (props[k] != null && k !== 'name' && k !== 'citation') out[k] = formatAttrValue(props[k]);
  }
  return out;
}

export function MapView({ rasters, overlays = [], identifyGrids = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const rasterLayersRef = useRef<Record<string, ImageLayer<ImageStatic>>>({});
  const overlayLayersRef = useRef<Record<string, VectorLayer<VectorSource>>>({});
  const identifyGridsRef = useRef(identifyGrids);
  const [identifyOn, setIdentifyOn] = useState(true);
  const [identify, setIdentify] = useState<IdentifyState | null>(null);
  const identifyOnRef = useRef(identifyOn);

  useEffect(() => { identifyGridsRef.current = identifyGrids; }, [identifyGrids]);
  useEffect(() => { identifyOnRef.current = identifyOn; }, [identifyOn]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const overlayDefs: { id: OverlayId; z: number; declutter?: boolean }[] = [
      { id: 'inviolate_wilderness', z: 5 },
      { id: 'visitor_sites', z: 6 },
      { id: 'facilities', z: 7 },
      { id: 'place_names', z: 8, declutter: true },
    ];

    const overlayLayers = overlayDefs.map(d => {
      const layer = makeGeoJsonLayer(d.id, OVERLAY_STYLE[d.id], d.z, {
        visible: false,
        declutter: d.declutter,
      });
      overlayLayersRef.current[d.id] = layer;
      return layer;
    });

    const map = new Map({
      target: containerRef.current,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      controls: defaultControls({ zoom: false, rotate: false, attribution: false }),
      interactions: defaultInteractions({
        altShiftDragRotate: true,
        pinchRotate: true,
        dragPan: true,
        mouseWheelZoom: true,
        doubleClickZoom: true,
      }).extend([new DragRotate({ condition: shiftKeyOnly })]),
      layers: [
        makeOceanLayer(),
        makeGeoJsonLayer('coastline', landStyle, 1),
        makeGeoJsonLayer('ice_shelves', iceShelfStyle, 2),
        makeGraticule(),
        ...overlayLayers,
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

    let moveTimer = 0;
    const onPointer = (evt: MapBrowserEvent<PointerEvent>) => {
      if (!identifyOnRef.current) {
        setIdentify(null);
        return;
      }
      const run = () => {
        const [x, y] = evt.coordinate as [number, number];
        const [lon, lat] = transform([x, y], 'EPSG:3031', 'EPSG:4326') as [number, number];

        const features: IdentifyFeatureInfo[] = [];
        map.forEachFeatureAtPixel(
          evt.pixel,
          (feat: FeatureLike, layer) => {
            const overlayId = layer?.get('overlayId') as string | undefined;
            if (!overlayId || !(overlayId in OVERLAY_STYLE)) return;
            const props = { ...(feat.getProperties() as Record<string, unknown>) };
            delete props.geometry;
            features.push({
              layer: overlayId,
              title: featureTitle(overlayId, props),
              attrs: pickAttrs(overlayId, props),
            });
          },
          {
            hitTolerance: 6,
            layerFilter: (l) => {
              const id = l.get('overlayId');
              return typeof id === 'string' && id in OVERLAY_STYLE;
            },
          },
        );

        const grids = identifyGridsRef.current
          .filter(g => g.visible && g.grid)
          .map(g => ({
            label: g.label,
            value: sampleGrid(g.grid, x, y),
          }));

        setIdentify({
          coordinate: [x, y],
          lonlat: [lon, lat],
          features: features.slice(0, 4),
          grids,
        });
      };

      if (evt.type === 'pointermove') {
        window.clearTimeout(moveTimer);
        moveTimer = window.setTimeout(run, 40);
      } else {
        run();
      }
    };

    map.on('pointermove', onPointer as never);
    map.on('click', onPointer as never);

    mapRef.current = map;
    return () => {
      window.clearTimeout(moveTimer);
      map.un('pointermove', onPointer as never);
      map.un('click', onPointer as never);
      map.setTarget(undefined);
      mapRef.current = null;
      rasterLayersRef.current = {};
      overlayLayersRef.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync overlay visibility
  useEffect(() => {
    const wanted: Partial<Record<OverlayId, boolean>> = {};
    overlays.forEach(o => { wanted[o.id] = o.visible; });
    (Object.keys(overlayLayersRef.current) as OverlayId[]).forEach(id => {
      const layer = overlayLayersRef.current[id];
      if (!layer) return;
      layer.setVisible(wanted[id] ?? false);
    });
  }, [overlays]);

  // Sync rasters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(rasters.map(r => r.id));
    Object.keys(rasterLayersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        map.removeLayer(rasterLayersRef.current[id]);
        delete rasterLayersRef.current[id];
      }
    });

    rasters.forEach(raster => {
      const url = `data:image/png;base64,${raster.png_base64}`;
      const existing = rasterLayersRef.current[raster.id];
      if (!existing) {
        const layer = new ImageLayer({
          source: makeRasterSource(url),
          opacity: raster.visible ? raster.opacity : 0,
          zIndex: 4,
        });
        map.addLayer(layer);
        rasterLayersRef.current[raster.id] = layer;
      } else {
        existing.setOpacity(raster.visible ? raster.opacity : 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const src = existing.getSource() as any;
        if (src?.url_ !== url) existing.setSource(makeRasterSource(url));
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

  const [lon, lat] = identify?.lonlat ?? [0, 0];

  return (
    <div className={`map-view-wrap${identifyOn ? ' map-view-wrap--identify' : ''}`}>
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
        <button
          type="button"
          title={identifyOn ? 'Identify on (hover/click for attributes)' : 'Identify off'}
          className={identifyOn ? 'is-active' : undefined}
          onClick={() => { setIdentifyOn(v => !v); setIdentify(null); }}
        >
          i
        </button>
      </div>

      {identifyOn && identify && (
        <aside className="identify-panel" aria-live="polite">
          <header>
            <strong>Identify</strong>
            <button type="button" onClick={() => setIdentify(null)} aria-label="Close">✕</button>
          </header>
          <p className="identify-coord">
            {Math.abs(lat).toFixed(3)}°{lat < 0 ? 'S' : 'N'}, {Math.abs(lon).toFixed(3)}°{lon < 0 ? 'W' : 'E'}
          </p>
          {identify.grids.map(g => (
            <div key={g.label} className="identify-block">
              <h5>{g.label}</h5>
              <p>{g.value == null ? 'No data (off continent / transparent)' : g.value.toFixed(1)}</p>
            </div>
          ))}
          {identify.features.length === 0 && identify.grids.every(g => g.value == null) && (
            <p className="identify-empty">No features here — turn on an input layer or hover a scored cell.</p>
          )}
          {identify.features.map((f, idx) => (
            <div key={`${f.layer}-${f.title}-${idx}`} className="identify-block">
              <h5>{f.title}</h5>
              <p className="identify-layer-tag">{f.layer.replace(/_/g, ' ')}</p>
              <dl>
                {Object.entries(f.attrs).map(([k, v]) => (
                  <div key={k} className="identify-row">
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </aside>
      )}

      <p className="map-hint">
        Drag to pan · scroll to zoom · Shift-drag to rotate · {identifyOn ? 'hover/click to identify' : '50 km analysis cells'}
      </p>
    </div>
  );
}
