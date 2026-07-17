import { useCallback, useEffect, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { AnalysisLayout } from '../components/layout/AnalysisLayout';
import { HistogramChart, RankBarChart } from '../components/charts/ResultCharts';
import { analyzeRemoteness, uploadFile } from '../api/client';

export function RemotenessPage() {
  const [yearMin, setYearMin] = useState<number | ''>('');
  const [yearMax, setYearMax] = useState<number | ''>('');
  const [opacity, setOpacity] = useState(0.7);
  const [layers, setLayers] = useState({ buildings: true, corridors: true, visitor_sites: true, planned: false });
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({
    score: true,
    rank: true,
    buildings: true,
    corridors: true,
    visitor_sites: true,
    uploaded: true,
  });

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyzeRemoteness({
        year_min: yearMin || null,
        year_max: yearMax || null,
        opacity,
        layers: {
          buildings: layers.buildings,
          corridors: layers.corridors,
          visitor_sites: layers.visitor_sites,
          planned: layers.planned,
        },
        upload_id: uploadId,
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [yearMin, yearMax, opacity, layers, uploadId]);

  useEffect(() => {
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    setUploadId(res.upload_id);
  };

  const inputLayers = (result?.input_layers || {}) as Record<string, FeatureCollection>;
  const scoreRaster = result?.combined_remoteness_score as { png_base64?: string } | undefined;
  const rankRaster = result?.remoteness_rank as { png_base64?: string } | undefined;

  const mapLayers = [
    ...(scoreRaster?.png_base64
      ? [{ id: 'score', visible: visible.score, opacity, rasterUrl: `data:image/png;base64,${scoreRaster.png_base64}` }]
      : []),
    ...(rankRaster?.png_base64
      ? [{ id: 'rank', visible: visible.rank, opacity, rasterUrl: `data:image/png;base64,${rankRaster.png_base64}` }]
      : []),
    ...Object.entries(inputLayers).map(([key, data]) => ({
      id: key,
      data,
      visible: visible[key] ?? true,
      opacity,
      color: key === 'linear_corridors' ? '#ef4444' : key === 'visitor_sites' ? '#a855f7' : '#f59e0b',
    })),
  ];

  const legend = [
    { id: 'score', label: 'Remoteness Score', color: '#4ade80', visible: visible.score, onToggle: () => setVisible((v) => ({ ...v, score: !v.score })) },
    { id: 'rank', label: 'Remoteness Rank', color: '#fbbf24', visible: visible.rank, onToggle: () => setVisible((v) => ({ ...v, rank: !v.rank })) },
    ...Object.keys(inputLayers).map((key) => ({
      id: key,
      label: key.replace(/_/g, ' '),
      color: '#f59e0b',
      visible: visible[key] ?? true,
      onToggle: () => setVisible((v) => ({ ...v, [key]: !v[key] })),
    })),
  ];

  return (
    <AnalysisLayout
      title="Remoteness Indicators"
      controls={
        <>
          <p className="indicator-note">
            Demo: isolation from infrastructure, corridors, and visitor sites (IP 39 Table 1 distances).
          </p>
          <label className="control-label">
            <input type="checkbox" checked={layers.buildings} onChange={(e) => setLayers((l) => ({ ...l, buildings: e.target.checked }))} />
            Building footprints
          </label>
          <label className="control-label">
            <input type="checkbox" checked={layers.corridors} onChange={(e) => setLayers((l) => ({ ...l, corridors: e.target.checked }))} />
            Linear corridors
          </label>
          <label className="control-label">
            <input type="checkbox" checked={layers.visitor_sites} onChange={(e) => setLayers((l) => ({ ...l, visitor_sites: e.target.checked }))} />
            Visitor sites
          </label>
          <label className="control-label">
            <input type="checkbox" checked={layers.planned} onChange={(e) => setLayers((l) => ({ ...l, planned: e.target.checked }))} />
            Planned infrastructure
          </label>
          <label className="control-label">Upload geospatial file</label>
          <input type="file" accept=".geojson,.json,.zip,.gpkg" onChange={handleUpload} />
          {uploadId && <small className="upload-ok">Uploaded: {uploadId.slice(0, 8)}…</small>}
          <label className="control-label">Year min</label>
          <input type="number" value={yearMin} onChange={(e) => setYearMin(e.target.value ? +e.target.value : '')} placeholder="e.g. 2020" />
          <label className="control-label">Year max</label>
          <input type="number" value={yearMax} onChange={(e) => setYearMax(e.target.value ? +e.target.value : '')} placeholder="e.g. 2024" />
          <label className="control-label">Layer opacity: {opacity.toFixed(2)}</label>
          <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />
          <p className="threshold-note">Rank thresholds: 5 · 20 · 50 km (IP 39 Table 4)</p>
          <button className="run-btn" onClick={run} disabled={loading}>
            {loading ? 'Running…' : 'Run Analysis'}
          </button>
        </>
      }
      layers={mapLayers}
      legend={legend}
      viewResetKey={result ? JSON.stringify(result.extent) : undefined}
      charts={
        <>
          <RankBarChart stats={(result?.rank_stats as Record<string, number>) || {}} />
          <HistogramChart histogram={result?.histogram as { counts: number[]; edges: number[] }} title="Remoteness Score Distribution" />
        </>
      }
    />
  );
}
