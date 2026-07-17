import { useCallback, useEffect, useState } from 'react';
import { AnalysisLayout } from '../components/layout/AnalysisLayout';
import { HistogramChart } from '../components/charts/ResultCharts';
import { analyzeWildness, uploadFile } from '../api/client';

export function WildnessPage() {
  const [yearMin, setYearMin] = useState<number | ''>('');
  const [yearMax, setYearMax] = useState<number | ''>('');
  const [opacity, setOpacity] = useState(0.7);
  const [includeVisitors, setIncludeVisitors] = useState(true);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState({ wildness: true, viewshed: true });

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyzeWildness({
        year_min: yearMin || null,
        year_max: yearMax || null,
        opacity,
        include_visitors: includeVisitors,
        upload_id: uploadId,
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [yearMin, yearMax, opacity, includeVisitors, uploadId]);

  useEffect(() => {
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    setUploadId(res.upload_id);
  };

  const wildnessRaster = result?.wildness_index as { png_base64?: string } | undefined;
  const viewshedRaster = result?.cumulative_viewshed_union as { png_base64?: string } | undefined;

  const mapLayers = [
    ...(wildnessRaster?.png_base64
      ? [{ id: 'wildness', visible: visible.wildness, opacity, rasterUrl: `data:image/png;base64,${wildnessRaster.png_base64}` }]
      : []),
    ...(viewshedRaster?.png_base64
      ? [{ id: 'viewshed', visible: visible.viewshed, opacity: opacity * 0.8, rasterUrl: `data:image/png;base64,${viewshedRaster.png_base64}` }]
      : []),
  ];

  return (
    <AnalysisLayout
      title="Wildness Indicators"
      controls={
        <>
          <p className="indicator-note">
            Demo: cumulative viewshed — areas not visible from infrastructure or visitor sites (IP 39 §6).
          </p>
          <label className="control-label">
            <input type="checkbox" checked={includeVisitors} onChange={(e) => setIncludeVisitors(e.target.checked)} />
            Include visitor sites (past 3 years)
          </label>
          <label className="control-label">Upload infrastructure layer</label>
          <input type="file" accept=".geojson,.json,.zip,.gpkg" onChange={handleUpload} />
          <label className="control-label">Year min</label>
          <input type="number" value={yearMin} onChange={(e) => setYearMin(e.target.value ? +e.target.value : '')} />
          <label className="control-label">Year max</label>
          <input type="number" value={yearMax} onChange={(e) => setYearMax(e.target.value ? +e.target.value : '')} />
          <label className="control-label">Opacity: {opacity.toFixed(2)}</label>
          <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />
          <p className="threshold-note">DEM: {(result?.dem_used as string) || 'synthetic until REMA loaded'}</p>
          <button className="run-btn" onClick={run} disabled={loading}>
            {loading ? 'Running…' : 'Run Analysis'}
          </button>
        </>
      }
      layers={mapLayers}
      legend={[
        { id: 'wildness', label: 'Wildness Index', color: '#34d399', visible: visible.wildness, onToggle: () => setVisible((v) => ({ ...v, wildness: !v.wildness })) },
        { id: 'viewshed', label: 'Cumulative Viewshed', color: '#ef4444', visible: visible.viewshed, onToggle: () => setVisible((v) => ({ ...v, viewshed: !v.viewshed })) },
      ]}
      viewResetKey={result ? JSON.stringify(result.extent) : undefined}
      charts={
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-value">{result ? `${(result.visible_impact_pct as number)?.toFixed(1)}%` : '—'}</span>
              <span className="stat-label">Visible impact area</span>
            </div>
          </div>
          <HistogramChart histogram={result?.histogram as { counts: number[]; edges: number[] }} title="Wildness Index Distribution" />
        </>
      }
    />
  );
}
