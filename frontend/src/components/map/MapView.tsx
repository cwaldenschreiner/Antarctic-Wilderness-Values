import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ANTARCTIC_CENTER, ANTARCTIC_DEFAULT_ZOOM, applyAntarcticView, boundsFromGeoJson } from './antarcticMapConfig';

interface LayerSpec {
  id: string;
  data?: FeatureCollection;
  visible: boolean;
  opacity: number;
  color?: string;
  rasterUrl?: string;
}

interface Props {
  layers: LayerSpec[];
  /** Use globe projection centered on Antarctica (default true). */
  polarView?: boolean;
}

export function MapView({ layers, polarView = true }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const polarReady = useRef(false);

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
      center: ANTARCTIC_CENTER,
      zoom: ANTARCTIC_DEFAULT_ZOOM,
      maxPitch: 60,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

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
    };
  }, [polarView]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      const dataFeatures: GeoJSON.Feature[] = [];

      layers.forEach((layer) => {
        const srcId = `src-${layer.id}`;
        const lyrId = `lyr-${layer.id}`;

        if (layer.data) {
          if (layer.visible) {
            dataFeatures.push(...layer.data.features);
          }
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
        }

        if (layer.rasterUrl && layer.visible) {
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

      if (polarView && polarReady.current && dataFeatures.length > 0) {
        const b = boundsFromGeoJson(dataFeatures);
        if (b) {
          map.fitBounds(b, { padding: 80, maxZoom: 5, duration: 600 });
        }
      } else if (polarView && polarReady.current && dataFeatures.length === 0) {
        applyAntarcticView(map);
      }
    };

    if (map.isStyleLoaded()) sync();
    else map.on('load', sync);
  }, [layers, polarView]);

  return <div ref={container} className="map-view map-view--polar" />;
}
