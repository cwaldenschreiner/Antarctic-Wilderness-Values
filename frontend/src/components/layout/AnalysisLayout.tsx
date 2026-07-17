import type { ReactNode } from 'react';
import type { FeatureCollection } from 'geojson';
import { ControlPanel } from './ControlPanel';
import { ChartPanel } from './ChartPanel';
import { MapView } from '../map/MapView';
import { LayerLegend } from '../map/LayerLegend';

interface LayerSpec {
  id: string;
  data?: FeatureCollection;
  visible: boolean;
  opacity: number;
  color?: string;
  rasterUrl?: string;
}

interface LegendItem {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  onToggle: () => void;
}

interface Props {
  title: string;
  controls: ReactNode;
  charts: ReactNode;
  layers: LayerSpec[];
  legend: LegendItem[];
  viewResetKey?: string | number;
}

export function AnalysisLayout({ title, controls, charts, layers, legend, viewResetKey }: Props) {
  return (
    <div className="analysis-layout">
      <ControlPanel title={title}>{controls}</ControlPanel>
      <div className="map-column">
        <MapView layers={layers} viewResetKey={viewResetKey} />
        <LayerLegend items={legend} />
      </div>
      <ChartPanel>{charts}</ChartPanel>
    </div>
  );
}
