import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  center?: [number, number];
  zoom?: number;
}

export function MapView({ layers, center = [0, -75], zoom = 2.2 }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

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
      center,
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
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
                  'circle-radius': 6,
                  'circle-color': layer.color || '#f59e0b',
                  'circle-opacity': layer.opacity,
                  'circle-stroke-width': 1,
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
    };

    if (map.isStyleLoaded()) sync();
    else map.on('load', sync);
  }, [layers]);

  return <div ref={container} className="map-view" />;
}
