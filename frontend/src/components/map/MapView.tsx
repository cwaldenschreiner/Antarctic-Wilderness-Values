import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
// @ts-ignore
import 'maplibre-gl/dist/maplibre-gl.css';

export interface RasterLayer {
  id: string;
  png_base64: string;
  /** Clockwise from top-left: [NW, NE, SE, SW] as [lng, lat] */
  coords: [[number,number],[number,number],[number,number],[number,number]];
  opacity: number;
  visible: boolean;
}

interface Props {
  rasters: RasterLayer[];
}

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#0a1628' } },
    { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.6 } },
  ],
};

export function MapView({ rasters }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const layerDataRef = useRef<Record<string, string>>({});
  const rastersRef   = useRef<RasterLayer[]>(rasters);

  // Keep rastersRef in sync so the load handler can access latest rasters
  rastersRef.current = rasters;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [0, -80],
      zoom: 1.8,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      // Apply any rasters that arrived before the map finished loading
      applyRasters(map, rastersRef.current, layerDataRef.current);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerDataRef.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync rasters whenever the prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) {
      applyRasters(map, rasters, layerDataRef.current);
    }
    // If map not loaded yet, rastersRef.current will be read in the 'load' handler above
  }, [rasters]);

  return (
    <div ref={containerRef} className="map-view" style={{ width: '100%', height: '100%' }} />
  );
}

function applyRasters(
  map: maplibregl.Map,
  rasters: RasterLayer[],
  layerData: Record<string, string>,
) {
  // Remove layers no longer present
  const currentIds = new Set(rasters.map(r => r.id));
  Object.keys(layerData).forEach(id => {
    if (!currentIds.has(id)) {
      if (map.getLayer(`raster-lyr-${id}`)) map.removeLayer(`raster-lyr-${id}`);
      if (map.getSource(`raster-src-${id}`)) map.removeSource(`raster-src-${id}`);
      delete layerData[id];
    }
  });

  rasters.forEach(layer => {
    const srcId = `raster-src-${layer.id}`;
    const lyrId = `raster-lyr-${layer.id}`;
    const url   = `data:image/png;base64,${layer.png_base64}`;

    if (layerData[layer.id] !== layer.png_base64) {
      // Data changed — remove old and re-add
      if (map.getLayer(lyrId)) map.removeLayer(lyrId);
      if (map.getSource(srcId)) map.removeSource(srcId);

      map.addSource(srcId, {
        type: 'image',
        url,
        coordinates: layer.coords,
      });
      map.addLayer({
        id: lyrId,
        type: 'raster',
        source: srcId,
        paint: {
          'raster-opacity': layer.visible ? layer.opacity : 0,
          'raster-resampling': 'nearest',
        },
      });
      layerData[layer.id] = layer.png_base64;
    } else {
      // Just update opacity / visibility
      if (map.getLayer(lyrId)) {
        map.setPaintProperty(lyrId, 'raster-opacity', layer.visible ? layer.opacity : 0);
      }
    }
  });
}
