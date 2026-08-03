import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
// @ts-ignore
import 'maplibre-gl/dist/maplibre-gl.css';

export interface RasterLayer {
  id: string;
  png_base64: string;
  /** [NW, NE, SE, SW] WGS84 coords */
  coords: [[number,number],[number,number],[number,number],[number,number]];
  opacity: number;
  visible: boolean;
}

interface Props {
  rasters: RasterLayer[];
}

const CENTER: [number, number] = [0, -82];
const BOUNDS: [[number,number],[number,number]] = [[-180,-90],[180,-60]];

export function MapView({ rasters }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const loadedRef    = useRef<Set<string>>(new Set());

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap' },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: CENTER,
      zoom: 2.2,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      map.setProjection({ type: 'globe' } as Parameters<typeof map.setProjection>[0]);
      map.fitBounds(BOUNDS, { padding: 40, duration: 0, maxZoom: 4 });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; loadedRef.current.clear(); };
  }, []);

  // Sync raster layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const sync = () => {
      rasters.forEach(layer => {
        const srcId = `raster-src-${layer.id}`;
        const lyrId = `raster-lyr-${layer.id}`;
        const url   = `data:image/png;base64,${layer.png_base64}`;

        if (!loadedRef.current.has(layer.id)) {
          if (map.getSource(srcId)) map.removeLayer(lyrId), map.removeSource(srcId);
          map.addSource(srcId, { type: 'image', url, coordinates: layer.coords });
          map.addLayer({ id: lyrId, type: 'raster', source: srcId,
            paint: { 'raster-opacity': layer.visible ? layer.opacity : 0 } });
          loadedRef.current.add(layer.id);
        } else {
          if (map.getLayer(lyrId)) {
            map.setPaintProperty(lyrId, 'raster-opacity', layer.visible ? layer.opacity : 0);
          }
        }
      });
    };

    if (map.isStyleLoaded()) sync();
    else map.once('load', sync);
  }, [rasters]);

  return <div ref={containerRef} className="map-view" />;
}
