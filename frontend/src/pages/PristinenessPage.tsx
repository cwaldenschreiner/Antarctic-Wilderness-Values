import { useCallback, useEffect, useState } from 'react';
import { analyzePristineness, fetchPrecomputed, uploadFile } from '../api/client';
import type { PristinenessResult, UploadResult, PrecomputedResponse } from '../api/client';
import { MapView } from '../components/map/MapView';
import type { RasterLayer } from '../components/map/MapView';
import {
  AnalysisLayout, SectionHeader, ParamSlider, StatCard, AnalyticsSection,
  UploadPanel, LayerLegend, HistogramChart,
  LoadingOverlay, ErrorBanner,
} from '../components/shared';

const PRIST_TOOLTIP = 'Pristineness measures the degree to which an area remains unmodified by human activity. The score (0–100) combines the Leihy et al. (2020) inviolate wilderness baseline (50 km grid cells with no recorded human visitation 1819–2018) with a visit-intensity penalty derived from ATS visitor site records. Inviolate cells score 50–100; non-inviolate cells score 0–60.';
const BASE_DECAY_TOOLTIP = 'Baseline exponential decay distance (km) from visitor sites with low visit counts. At this distance from a low-traffic site, visit impact drops to ~37%.';
const MAX_DECAY_TOOLTIP = 'Additional decay added for high-traffic sites (log-scaled by 5-year visit total). High-traffic Peninsula sites (e.g. Neko Harbour: 76,214 visits) receive a much wider impact radius than remote, rarely-visited sites.';
const INVIOLATE_TOOLTIP = 'The inviolate wilderness layer is taken directly from Leihy, R.I. et al. (2020) "Antarctica\'s wilderness fails to capture continent\'s biodiversity", Nature 583:567–571. It identifies 1,733 grid cells (4.3 million km²) with no recorded human visitation across ~2.7 million activity records spanning 1819–2018.';

const DEFAULT_COORDS = [[-180,-55],[180,-55],[180,-85.05],[-180,-85.05]] as [[number,number],[number,number],[number,number],[number,number]];

export function PristinenessPage() {
  const [result,        setResult]       = useState<PristinenessResult | null>(null);
  const [loading,       setLoading]      = useState(false);
  const [error,         setError]        = useState<string | null>(null);
  const [uploadResult,  setUploadResult] = useState<UploadResult | null>(null);
  const [uploadId,      setUploadId]     = useState<string | null>(null);
  const [mergeUpload,   setMergeUpload]  = useState(true);
  const [opacity,       setOpacity]      = useState(0.8);
  const [showPrist,     setShowPrist]    = useState(true);
  const [showInviolate, setShowInv]      = useState(false);

  const [baseDecay, setBaseDecay] = useState(50);
  const [maxDecay,  setMaxDecay]  = useState(250);

  useEffect(() => {
    setLoading(true);
    fetchPrecomputed()
      .then((pre: PrecomputedResponse) => {
        if (pre.rasters.pristineness_index) {
          setResult({
            pristineness_png:    pre.rasters.pristineness_index,
            inviolate_png:       pre.rasters.inviolate_mask || '',
            raster_coords:       pre.raster_coords,
            inviolate_pct:       pre.stats.pristineness?.inviolate_pct || 0,
            inviolate_area_km2:  pre.stats.pristineness?.inviolate_area_km2 || 0,
            total_continent_km2: 24600000,
            n_patches:           pre.stats.pristineness?.n_patches || 0,
            largest_patch_km2:   pre.stats.pristineness?.largest_patch_km2 || 0,
            mean_patch_km2:      0,
            mean_score:          0,
            histogram:           { counts: [], edges: [] },
            n_visitor_sites:     331,
            n_inviolate_polygons: 1733,
            params:              {},
          } as PristinenessResult);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await analyzePristineness({
        visit_decay_base_km: baseDecay,
        visit_decay_max_km:  maxDecay,
        upload_id:           uploadId,
        merge_uploaded:      mergeUpload,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [baseDecay, maxDecay, uploadId, mergeUpload]);

  const handleUpload = async (file: File) => {
    try {
      const res = await uploadFile(file);
      setUploadResult(res);
      setUploadId(res.upload_id);
    } catch (e: unknown) { setError(String(e)); }
  };

  const coords = DEFAULT_COORDS;
  const inviolateOpacity = opacity * 0.8;
  const rasters: RasterLayer[] = [
    ...(result?.pristineness_png ? [{ id: 'prist',     png_base64: result.pristineness_png, coords, opacity,                  visible: showPrist    }] : []),
    ...(result?.inviolate_png    ? [{ id: 'inviolate', png_base64: result.inviolate_png,    coords, opacity: inviolateOpacity, visible: showInviolate }] : []),
  ];

  return (
    <AnalysisLayout
      controls={
        <div className="control-body">
          <SectionHeader title="Pristineness Indicators" tooltip={PRIST_TOOLTIP} />
          <p className="indicator-note">
            Inviolate areas and human activity footprint. Baseline from Leihy et al. (2020)
            inviolate wilderness (no recorded human visitation 1819–2018), modulated by
            ATS visitor site intensity.
          </p>

          <div className="param-section">
            <h4>Analysis Parameters</h4>
            <ParamSlider label="Visit decay (base)" value={baseDecay} min={10} max={200} step={10} unit=" km"
              tooltip={BASE_DECAY_TOOLTIP} onChange={setBaseDecay} />
            <ParamSlider label="Visit decay (max, high-traffic)" value={maxDecay} min={50} max={1000} step={25} unit=" km"
              tooltip={MAX_DECAY_TOOLTIP} onChange={setMaxDecay} />
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

          <div className="method-note">
            <strong>Inviolate baseline:</strong>{' '}
            <span className="info-text">Leihy et al. (2020) 50 km grid — areas with no recorded human visitation 1819–2018.</span>
          </div>
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
            id: 'prist',
            label: 'Pristineness Index',
            visible: showPrist,
            onToggle: () => setShowPrist(v => !v),
            style: {
              kind: 'gradient',
              colors: ['#37474f', '#0277bd', '#00897b', '#2e7d32', '#f9fbe7'],
              labels: ['0', '50', '100'],
            },
          },
          {
            id: 'inviolate',
            label: 'Inviolate Areas',
            visible: showInviolate,
            onToggle: () => setShowInv(v => !v),
            style: {
              kind: 'solid',
              color: '#1b5e20',
            },
          },
        ]} />
      }
      charts={
        <>
          <AnalyticsSection title="Summary metrics">
            <div className="stat-cards">
              <StatCard
                value={result ? `${result.inviolate_pct}%` : '—'}
                label="Inviolate share of continent"
                sub="No recorded visitation 1819–2018"
              />
              <StatCard
                value={result ? `${(result.inviolate_area_km2 / 1e6).toFixed(1)} M km²` : '—'}
                label="Inviolate extent"
                sub="Absolute area of inviolate cells"
              />
              <StatCard
                value={result ? `${result.n_patches}` : '—'}
                label="Inviolate patches"
                sub="Contiguous inviolate blocks"
              />
              <StatCard
                value={result ? `${(result.largest_patch_km2 / 1e3).toFixed(0)}k km²` : '—'}
                label="Largest inviolate patch"
                sub="Biggest contiguous block"
              />
            </div>
          </AnalyticsSection>
          {result?.histogram?.counts.length ? (
            <AnalyticsSection title="Score distribution">
              <HistogramChart
                histogram={result.histogram}
                title="Pristineness score histogram"
                color="#00897b"
                xLabel="Pristineness score (0–100)"
                yLabel="Grid cells"
              />
            </AnalyticsSection>
          ) : null}
          <AnalyticsSection title="Data sources">
            <div className="citation-block">
              <p>Inviolate baseline: Leihy, R.I. et al. (2020). Antarctica's wilderness fails to capture continent's biodiversity. <em>Nature</em>, 583, 567–571.</p>
              <p>Visitor data: ATS Land-based Visited Sites (2019–2024). Compiled by Walden-Schreiner (2025) for ANT-MICI WP3.</p>
            </div>
          </AnalyticsSection>
        </>
      }
    />
  );
}
