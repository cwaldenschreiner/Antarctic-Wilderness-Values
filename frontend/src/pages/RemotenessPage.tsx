import { useCallback, useEffect, useState } from 'react';
import { analyzeRemoteness, fetchPrecomputed, uploadFile } from '../api/client';
import type { RemotenessResult, UploadResult, PrecomputedResponse } from '../api/client';
import { MapView } from '../components/map/MapView';
import type { RasterLayer } from '../components/map/MapView';
import {
  AnalysisLayout, SectionHeader, ParamSlider, StatCard, AnalyticsSection,
  UploadPanel, LayerLegend, HistogramChart, RankChart,
  LoadingOverlay, ErrorBanner,
} from '../components/shared';

const RASTER_TOOLTIP = 'The remoteness score (0–100) measures how far each 50 km grid cell is from human infrastructure and visitor sites. Higher scores = more remote. The rank layer classifies cells into four categories (< 5 km, 5–20 km, 20–50 km, > 50 km from nearest human activity) following IP 39 Table 4 thresholds.';
const RANK_TOOLTIP   = 'Ranks follow Summerson & Bishop (2012) and ATCM XXXVI IP 39 (New Zealand, 2013) Table 4 thresholds: < 5 km = Low remoteness (heavily impacted), 5–20 km = Moderate, 20–50 km = High-Moderate, > 50 km = High remoteness.';
const HIST_TOOLTIP   = 'Distribution of remoteness scores across all 9,841 Antarctic grid cells (50 km resolution, EPSG:3031). A score of 100 indicates the cell is maximally remote from all known human activity.';

const DEFAULT_COORDS: [[number,number],[number,number],[number,number],[number,number]] =
  [[-180,-55],[180,-55],[180,-85.05],[-180,-85.05]];

export function RemotenessPage() {
  const [result,       setResult]       = useState<RemotenessResult | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadId,     setUploadId]     = useState<string | null>(null);
  const [mergeUpload,  setMergeUpload]  = useState(true);
  const [opacity,      setOpacity]      = useState(0.8);
  const [showScore,    setShowScore]    = useState(true);
  const [showRank,     setShowRank]     = useState(false);

  // Analysis params
  const [facDecay,  setFacDecay]  = useState(100);
  const [visDecay,  setVisDecay]  = useState(50);
  const [visWeight, setVisWeight] = useState(0.5);

  // Load precomputed raster on mount
  useEffect(() => {
    setLoading(true);
    fetchPrecomputed()
      .then((pre: PrecomputedResponse) => {
        if (pre.rasters.remoteness_score) {
          setResult({
            score_png:            pre.rasters.remoteness_score,
            rank_png:             pre.rasters.remoteness_rank || '',
            raster_coords:        pre.raster_coords,
            rank_pcts:            pre.stats.remoteness?.rank_pcts || {},
            mean_score:           pre.stats.remoteness?.mean_score || 0,
            high_remoteness_pct:  pre.stats.remoteness?.high_remoteness_pct || 0,
            high_remoteness_km2:  pre.stats.remoteness?.high_remoteness_km2 || 0,
            total_continent_km2:  pre.stats.remoteness?.total_continent_km2 || 0,
            histogram:            { counts: [], edges: [] },
            n_facilities:         81,
            n_visitor_sites:      331,
            params:               {},
          } as RemotenessResult);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await analyzeRemoteness({
        facility_decay_km: facDecay,
        visitor_decay_km:  visDecay,
        visitor_weight:    visWeight,
        upload_id:         uploadId,
        merge_uploaded:    mergeUpload,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [facDecay, visDecay, visWeight, uploadId, mergeUpload]);

  const handleUpload = async (file: File) => {
    try {
      const res = await uploadFile(file);
      setUploadResult(res);
      setUploadId(res.upload_id);
    } catch (e: unknown) { setError(String(e)); }
  };

  const coords = DEFAULT_COORDS;
  const rasters: RasterLayer[] = [
    ...(result?.score_png ? [{ id: 'score', png_base64: result.score_png, coords, opacity, visible: showScore }] : []),
    ...(result?.rank_png  ? [{ id: 'rank',  png_base64: result.rank_png,  coords, opacity, visible: showRank  }] : []),
  ];

  return (
    <AnalysisLayout
      controls={
        <div className="control-body">
          <SectionHeader title="Remoteness Indicators" tooltip={RASTER_TOOLTIP} />
          <p className="indicator-note">
            Isolation from human infrastructure and visitor activity.
            Methods follow IP 39 Table 1 & 4 (New Zealand, 2013) and Summerson &amp; Bishop (2012).
          </p>

          <div className="param-section">
            <h4>Analysis Parameters</h4>
            <ParamSlider label="Facility decay radius" value={facDecay} min={20} max={500} step={10} unit=" km"
              tooltip="Exponential decay radius from permanent facilities (stations). At this distance, facility impact drops to ~37% of maximum. COMNAP facilities v3.5.0 (2024)."
              onChange={setFacDecay} />
            <ParamSlider label="Visitor site decay radius" value={visDecay} min={10} max={300} step={5} unit=" km"
              tooltip="Exponential decay radius from ATS visitor sites. Visitor sites have transient impact; lower values than facilities."
              onChange={setVisDecay} />
            <ParamSlider label="Visitor site weight" value={visWeight} min={0.1} max={1} step={0.1} unit=""
              tooltip="Relative weighting of visitor site impact vs. facility impact. 0.5 = visitor sites count half as much as facilities."
              onChange={setVisWeight} />
          </div>

          <UploadPanel uploadResult={uploadResult} onUpload={handleUpload}
            merge={mergeUpload} onMergeChange={setMergeUpload} />

          <div className="param-section">
            <ParamSlider label="Layer opacity" value={opacity} min={0.1} max={1} step={0.05} unit=""
              onChange={setOpacity} />
          </div>

          <button className="run-btn" onClick={run} disabled={loading}>
            {loading ? 'Running…' : 'Run Analysis'}
          </button>
        </div>
      }
      map={
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <MapView rasters={rasters} />
          {loading && <LoadingOverlay />}
          {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        </div>
      }
      legend={
        <LayerLegend items={[
          {
            id: 'score',
            label: 'Remoteness Score',
            visible: showScore,
            onToggle: () => setShowScore(v => !v),
            style: {
              kind: 'gradient',
              colors: ['#1a0533', '#1565c0', '#0097a7', '#43a047', '#f9fbe7'],
              labels: ['0', '50', '100'],
            },
          },
          {
            id: 'rank',
            label: 'Remoteness Rank',
            visible: showRank,
            onToggle: () => setShowRank(v => !v),
            style: {
              kind: 'classes',
              classes: [
                { color: '#d32f2f', label: '<5 km (Low)' },
                { color: '#f57c00', label: '5–20 km' },
                { color: '#fbc02d', label: '20–50 km' },
                { color: '#388e3c', label: '>50 km (High)' },
              ],
            },
          },
        ]} />
      }
      charts={
        <>
          <AnalyticsSection title="Summary metrics">
            <div className="stat-cards">
              <StatCard value={result ? `${result.high_remoteness_pct}%` : '—'}
                label="High remoteness share"
                sub="> 50 km from any human activity" />
              <StatCard value={result ? `${(result.high_remoteness_km2 / 1e6).toFixed(1)} M km²` : '—'}
                label="High remoteness area"
                sub="Continent cells > 50 km" />
              <StatCard value={result ? `${result.mean_score.toFixed(0)}` : '—'}
                label="Mean remoteness score"
                sub="Scale 0–100 (higher = more remote)" />
              <StatCard value={result ? `${result.n_facilities}` : '81'}
                label="Facilities counted"
                sub="COMNAP v3.5.0 (2024)" />
            </div>
          </AnalyticsSection>
          {result?.rank_pcts && Object.keys(result.rank_pcts).length > 0 && (
            <AnalyticsSection title="Rank distribution">
              <RankChart
                pcts={result.rank_pcts}
                title="Share of continent by remoteness rank"
                xLabel="% of continent"
              />
            </AnalyticsSection>
          )}
          {result?.histogram?.counts.length ? (
            <AnalyticsSection title="Score distribution">
              <HistogramChart
                histogram={result.histogram}
                title="Remoteness score histogram"
                color="#43a047"
                xLabel="Remoteness score (0–100)"
                yLabel="Grid cells"
              />
            </AnalyticsSection>
          ) : null}
        </>
      }
    />
  );
}
