import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { applyAntarcticView, boundsFromGeoJson } from './antarcticMapConfig';
import { MapToolbar, type MapInteractionMode } from './MapToolbar';

export type { MapInteractionMode };

export interface LayerSpec {
  id: string;
  data?: FeatureCollection;
  visible: boolean;
  opacity: number;
  color?: string;
  rasterUrl?: string;
}

interface Props {
  layers: LayerSpec[];
  polarView?: boolean;
  /** When this value changes, the map will fit to data once (e.g. new analysis result). */
  viewResetKey?: string | number;
}

const SELECT_SOURCE = 'selection-highlight';
const SELECT_LAYER = 'selection-highlight-layer';
const SELECT_LAYER_LINE = 'selection-highlight-line';

function featureLabel(feature: Feature): string {
  const props = feature.properties || {};
  const name = props.name || props.Name || props.activity_type || props.id;
  if (name) return String(name);
  return feature.geometry?.type === 'Point' ? 'Point feature' : 'Feature';
}

export function MapView({ layers, polarView = true, viewResetKey }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const polarReady = useRef(false);
  const vectorLayerIds = useRef<string[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const boxDrag = useRef<{ startX: number; startY: number } | null>(null);

  const [mode, setMode] = useState<MapInteractionMode>('pan');
  const [selected, setSelected] = useState<Feature | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);

  const getVisibleFeatures = useCallback((): Feature[] => {
    const out: Feature[] = [];
    layers.forEach((layer) => {
      if (layer.visible && layer.data) out.push(...layer.data.features);
    });
    return out;
  }, [layers]);

  const zoomToAntarctica = useCallback(() => {
    const map = mapRef.current;
    if (map && polarReady.current) applyAntarcticView(map);
    setSelected(null);
    setPopupPos(null);
  }, []);

  const zoomToData = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const features = getVisibleFeatures();
    const b = boundsFromGeoJson(features);
    if (b) map.fitBounds(b, { padding: 80, maxZoom: 6, duration: 800 });
  }, [getVisibleFeatures]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setPopupPos(null);
    const map = mapRef.current;
    if (map?.getSource(SELECT_SOURCE)) {
      (map.getSource(SELECT_SOURCE) as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }, []);

  const updateSelectionLayer = useCallback((map: maplibregl.Map, feature: Feature | null) => {
    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: feature ? [feature] : [],
    };
    if (map.getSource(SELECT_SOURCE)) {
      (map.getSource(SELECT_SOURCE) as maplibregl.GeoJSONSource).setData(data);
    } else {
      map.addSource(SELECT_SOURCE, { type: 'geojson', data });
      map.addLayer({
        id: SELECT_LAYER,
        type: 'circle',
        source: SELECT_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 14,
          'circle-color': '#fde047',
          'circle-opacity': 0.35,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#facc15',
        },
      });
      map.addLayer({
        id: SELECT_LAYER_LINE,
        type: 'line',
        source: SELECT_SOURCE,
        filter: ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'MultiLineString']],
        paint: {
          'line-color': '#facc15',
          'line-width': 5,
          'line-opacity': 0.9,
        },
      });
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [0, -82],
      zoom: 2.4,
      maxPitch: 60,
      boxZoom: false,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      if (polarView) {
        applyAntarcticView(map);
        polarReady.current = true;
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      polarReady.current = false;
      vectorLayerIds.current = [];
    };
  }, [polarView]);

  // Sync layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      const interactiveIds: string[] = [];

      layers.forEach((layer) => {
        const srcId = `src-${layer.id}`;
        const lyrId = `lyr-${layer.id}`;

        if (layer.data) {
          if (map.getSource(srcId)) {
            (map.getSource(srcId) as maplibregl.GeoJSONSource).setData(layer.data);
          } else {
            map.addSource(srcId, { type: 'geojson', data: layer.data });
            const isLine = layer.data.features.some(
              (f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString',
            );
            if (isLine) {
              map.addLayer({
                id: lyrId,
                type: 'line',
                source: srcId,
                paint: {
                  'line-color': layer.color || '#3d8bfd',
                  'line-width': 2,
                  'line-opacity': layer.opacity,
                },
              });
            } else {
              map.addLayer({
                id: lyrId,
                type: 'circle',
                source: srcId,
                paint: {
                  'circle-radius': 7,
                  'circle-color': layer.color || '#f59e0b',
                  'circle-opacity': layer.opacity,
                  'circle-stroke-width': 1.5,
                  'circle-stroke-color': '#fff',
                },
              });
            }
          }
          interactiveIds.push(lyrId);
        }

        if (layer.rasterUrl) {
          if (!map.getSource(srcId)) {
            map.addSource(srcId, {
              type: 'image',
              url: layer.rasterUrl,
              coordinates: [
                [-180, -60],
                [180, -60],
                [180, -90],
                [-180, -90],
              ],
            });
            map.addLayer({
              id: lyrId,
              type: 'raster',
              source: srcId,
              paint: { 'raster-opacity': layer.opacity },
            });
          } else {
            map.setPaintProperty(lyrId, 'raster-opacity', layer.opacity);
          }
        }

        if (map.getLayer(lyrId)) {
          map.setLayoutProperty(lyrId, 'visibility', layer.visible ? 'visible' : 'none');
        }
      });

      vectorLayerIds.current = interactiveIds;
    };

    if (map.isStyleLoaded()) sync();
    else map.on('load', sync);
  }, [layers]);

  // Fit to data when analysis result changes
  useEffect(() => {
    if (viewResetKey === undefined) return;
    const map = mapRef.current;
    if (!map || !polarReady.current) return;
    const features = getVisibleFeatures();
    if (features.length > 0) {
      const b = boundsFromGeoJson(features);
      if (b) map.fitBounds(b, { padding: 80, maxZoom: 5, duration: 600 });
    }
  }, [viewResetKey, getVisibleFeatures]);

  // Select mode: click features
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (mode !== 'select') return;
      const ids = vectorLayerIds.current.filter((id) => map.getLayer(id));
      if (!ids.length) return;

      const hits = map.queryRenderedFeatures(e.point, { layers: ids });
      if (hits.length > 0) {
        const hit = hits[0];
        const feature: Feature = {
          type: 'Feature',
          geometry: hit.geometry as Feature['geometry'],
          properties: { ...(hit.properties || {}) },
        };
        setSelected(feature);
        setPopupPos({ x: e.point.x, y: e.point.y });
        updateSelectionLayer(map, feature);
      } else {
        clearSelection();
      }
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (mode !== 'select') {
        map.getCanvas().style.cursor = '';
        return;
      }
      const ids = vectorLayerIds.current.filter((id) => map.getLayer(id));
      const hits = ids.length ? map.queryRenderedFeatures(e.point, { layers: ids }) : [];
      map.getCanvas().style.cursor = hits.length ? 'pointer' : 'crosshair';
    };

    map.on('click', onClick);
    map.on('mousemove', onMove);
    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMove);
      map.getCanvas().style.cursor = '';
    };
  }, [mode, clearSelection, updateSelectionLayer]);

  // Box zoom mode
  useEffect(() => {
    const map = mapRef.current;
    const el = container.current;
    if (!map || !el) return;

    map.dragPan.enable();
    map.getCanvas().style.cursor = mode === 'zoom-box' ? 'crosshair' : '';

    if (mode !== 'zoom-box') {
      if (boxRef.current) {
        boxRef.current.remove();
        boxRef.current = null;
      }
      boxDrag.current = null;
      return;
    }

    map.dragPan.disable();

    const ensureBox = () => {
      if (!boxRef.current) {
        const box = document.createElement('div');
        box.className = 'map-zoom-box';
        el.appendChild(box);
        boxRef.current = box;
      }
      return boxRef.current;
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      boxDrag.current = { startX: e.clientX - rect.left, startY: e.clientY - rect.top };
      const box = ensureBox();
      box.style.left = `${boxDrag.current.startX}px`;
      box.style.top = `${boxDrag.current.startY}px`;
      box.style.width = '0';
      box.style.height = '0';
      box.style.display = 'block';
    };

    const onMove = (e: MouseEvent) => {
      if (!boxDrag.current || !boxRef.current) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const left = Math.min(boxDrag.current.startX, x);
      const top = Math.min(boxDrag.current.startY, y);
      const width = Math.abs(x - boxDrag.current.startX);
      const height = Math.abs(y - boxDrag.current.startY);
      boxRef.current.style.left = `${left}px`;
      boxRef.current.style.top = `${top}px`;
      boxRef.current.style.width = `${width}px`;
      boxRef.current.style.height = `${height}px`;
    };

    const onUp = (e: MouseEvent) => {
      if (!boxDrag.current || !boxRef.current) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const minX = Math.min(boxDrag.current.startX, x);
      const maxX = Math.max(boxDrag.current.startX, x);
      const minY = Math.min(boxDrag.current.startY, y);
      const maxY = Math.max(boxDrag.current.startY, y);

      boxRef.current.style.display = 'none';
      boxDrag.current = null;

      if (maxX - minX < 12 || maxY - minY < 12) return;

      const sw = map.unproject([minX, maxY]);
      const ne = map.unproject([maxX, minY]);
      map.fitBounds(
        [
          [sw.lng, sw.lat],
          [ne.lng, ne.lat],
        ],
        { padding: 24, duration: 600, maxZoom: 8 },
      );
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      map.dragPan.enable();
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (boxRef.current) {
        boxRef.current.remove();
        boxRef.current = null;
      }
      boxDrag.current = null;
    };
  }, [mode]);

  const hasData = getVisibleFeatures().length > 0;

  return (
    <div ref={container} className="map-view map-view--polar map-view--interactive">
      <MapToolbar
        mode={mode}
        onModeChange={setMode}
        onZoomAntarctica={zoomToAntarctica}
        onZoomData={zoomToData}
        hasData={hasData}
        selectedLabel={selected ? featureLabel(selected) : null}
        onClearSelection={clearSelection}
      />
      {selected && popupPos && mode === 'select' && (
        <div
          className="map-feature-popup"
          style={{ left: Math.min(popupPos.x, (container.current?.clientWidth || 300) - 220), top: popupPos.y + 12 }}
        >
          <strong>{featureLabel(selected)}</strong>
          <dl>
            {Object.entries(selected.properties || {})
              .slice(0, 8)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </div>
  );
}
