import { useCallback, useEffect, useState } from 'react';
import { AnalysisLayout } from '../components/layout/AnalysisLayout';
import { HistogramChart } from '../components/charts/ResultCharts';
import { analyzePristineness, uploadFile } from '../api/client';

export function PristinenessPage() {
  const [yearMin, setYearMin] = useState<number | ''>('');
  const [yearMax, setYearMax] = useState<number | ''>('');
  const [threshold, setThreshold] = useState(5000);
  const [opacity, setOpacity] = useState(0.7);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState({ pristineness: true, inviolate: true });

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyzePristineness({
        year_min: yearMin || null,
        year_max: yearMax || null,
        impact_threshold_m: threshold,
        opacity,
        upload_id: uploadId,
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [yearMin, yearMax, threshold, opacity, uploadId]);

  useEffect(() => {
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    setUploadId(res.upload_id);
  };

  const frag = result?.fragmentation as Record<string, number> | undefined;
  const pristRaster = result?.pristineness_index as { png_base64?: string } | undefined;
  const invRaster = result?.inviolate_mask as { png_base64?: string } | undefined;

  const mapLayers = [
    ...(pristRaster?.png_base64
      ? [{ id: 'pristineness', visible: visible.pristineness, opacity, rasterUrl: `data:image/png;base64,${pristRaster.png_base64}` }]
      : []),
    ...(invRaster?.png_base64
      ? [{ id: 'inviolate', visible: visible.inviolate, opacity: opacity * 0.8, rasterUrl: `data:image/png;base64,${invRaster.png_base64}` }]
      : []),
  ];

  return (
    <AnalysisLayout
      title="Pristineness Indicators"
      controls={
        <>
          <p className="indicator-note">
            Demo: inviolate areas and fragmentation (Hughes et al. 2011; Leihy et al. 2020).
          </p>
          <label className="control-label">Upload visitation / footprint layer</label>
          <input type="file" accept=".geojson,.json,.zip,.gpkg" onChange={handleUpload} />
          <label className="control-label">Impact threshold (m): {threshold}</label>
          <input type="range" min={1000} max={20000} step={500} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
          <label className="control-label">Year min</label>
          <input type="number" value={yearMin} onChange={(e) => setYearMin(e.target.value ? +e.target.value : '')} />
          <label className="control-label">Year max</label>
          <input type="number" value={yearMax} onChange={(e) => setYearMax(e.target.value ? +e.target.value : '')} />
          <label className="control-label">Opacity: {opacity.toFixed(2)}</label>
          <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />
          <p className="threshold-note">{result?.pollutant_note as string}</p>
          <button className="run-btn" onClick={run} disabled={loading}>
            {loading ? 'Running…' : 'Run Analysis'}
          </button>
        </>
      }
      layers={mapLayers}
      legend={[
        { id: 'pristineness', label: 'Pristineness Index', color: '#60a5fa', visible: visible.pristineness, onToggle: () => setVisible((v) => ({ ...v, pristineness: !v.pristineness })) },
        { id: 'inviolate', label: 'Inviolate Mask', color: '#e2e8f0', visible: visible.inviolate, onToggle: () => setVisible((v) => ({ ...v, inviolate: !v.inviolate })) },
      ]}
      viewResetKey={result ? JSON.stringify(result.extent) : undefined}
      charts={
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-value">{frag ? `${frag.inviolate_pct?.toFixed(1)}%` : '—'}</span>
              <span className="stat-label">Inviolate area</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{frag?.patch_count ?? '—'}</span>
              <span className="stat-label">Patches</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{frag ? frag.largest_patch_km2?.toFixed(0) : '—'}</span>
              <span className="stat-label">Largest patch (km²)</span>
            </div>
          </div>
          <HistogramChart histogram={result?.histogram as { counts: number[]; edges: number[] }} title="Pristineness Index Distribution" />
        </>
      }
    />
  );
}
