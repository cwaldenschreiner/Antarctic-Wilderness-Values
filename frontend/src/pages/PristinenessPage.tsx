import { useCallback, useEffect, useState } from 'react';
import { analyzePristineness, fetchPrecomputed, uploadFile } from '../api/client';
import type { PristinenessResult, UploadResult, PrecomputedResponse, IdentifyGridPayload } from '../api/client';
import { MapView } from '../components/map/MapView';
import type { RasterLayer, OverlayLayer, IdentifyGrid } from '../components/map/MapView';
import {
  AnalysisLayout, SectionHeader, ParamSlider, StatCard, AnalyticsSection,
  IndicatorIntro, UploadPanel, LayerLegend, HistogramChart,
  LoadingOverlay, ErrorBanner,
} from '../components/shared';

const PRIST_TOOLTIP =
  'Pristineness analysis: combines the Leihy et al. (2020) inviolate wilderness baseline (no recorded visitation 1819–2018) with a visit-intensity decay from ATS sites. Inviolate cells score 50–100; other cells score 0–60. Outputs: (1) Pristineness Index map 0–100; (2) Inviolate Areas mask; (3) inviolate %, extent, patch stats, and score histogram below the map.';
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
  const [showVisitors,  setShowVisitors] = useState(false);
  const [showInviolatePoly, setShowInviolatePoly] = useState(false);
  const [showPlaces,    setShowPlaces]   = useState(true);
  const [grids, setGrids] = useState<Record<string, IdentifyGridPayload>>({});

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
            identify_grids: {
              prist: pre.grids?.pristineness_index,
              inviolate: pre.grids?.inviolate_mask,
            },
            raster_coords:       pre.raster_coords,
            inviolate_pct:       pre.stats.pristineness?.inviolate_pct || 0,
            inviolate_area_km2:  pre.stats.pristineness?.inviolate_area_km2 || 0,
            total_continent_km2: pre.stats.pristineness?.total_continent_km2 || 0,
            n_patches:           pre.stats.pristineness?.n_patches || 0,
            largest_patch_km2:   pre.stats.pristineness?.largest_patch_km2 || 0,
            mean_patch_km2:      0,
            mean_score:          0,
            histogram:           { counts: [], edges: [] },
            n_visitor_sites:     331,
            n_inviolate_polygons: 1733,
            params:              {},
          } as PristinenessResult);
          if (pre.grids) setGrids(pre.grids);
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
      if (data.identify_grids) {
        setGrids({
          pristineness_index: data.identify_grids.prist,
          inviolate_mask: data.identify_grids.inviolate,
        });
      }
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
  const overlayLayers: OverlayLayer[] = [
    { id: 'inviolate_wilderness', visible: showInviolatePoly },
    { id: 'visitor_sites', visible: showVisitors },
    { id: 'place_names', visible: showPlaces },
  ];
  const identifyGrids: IdentifyGrid[] = [
    ...(grids.pristineness_index && showPrist
      ? [{ id: 'prist', label: 'Pristineness score', visible: true, grid: grids.pristineness_index }]
      : []),
    ...(grids.inviolate_mask && showInviolate
      ? [{ id: 'inviolate', label: 'Inviolate mask', visible: true, grid: grids.inviolate_mask }]
      : []),
  ];

  return (
    <AnalysisLayout
      controls={
        <div className="control-body">
          <SectionHeader title="Pristineness Indicators" tooltip={PRIST_TOOLTIP} />
          <IndicatorIntro
            summary="Degree of human modification: Leihy et al. (2020) inviolate wilderness baseline plus ATS visitor-site intensity."
            analysis="Run Analysis scores each 50 km cell using inviolate status and distance-weighted visit impact. Base and max visit-decay radii control how far high-traffic sites reduce pristineness. Optional uploads can add footprints that further lower scores."
            outputs="The map shows the Pristineness Index (0–100; higher = less modified) and an optional Inviolate Areas mask. Below the map: inviolate share and extent, number of contiguous patches, largest patch size, score histogram, and data-source citations."
            methodologyPath="/methodology#pristineness"
          />

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
          <MapView rasters={rasters} overlays={overlayLayers} identifyGrids={identifyGrids} />
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
          {
            id: 'inviolate-poly',
            label: 'Inviolate polygons (input)',
            visible: showInviolatePoly,
            onToggle: () => setShowInviolatePoly(v => !v),
            style: { kind: 'solid', color: '#34d399' },
          },
          {
            id: 'visitors',
            label: 'Visitor sites',
            visible: showVisitors,
            onToggle: () => setShowVisitors(v => !v),
            style: { kind: 'solid', color: '#38bdf8' },
          },
          {
            id: 'places',
            label: 'Place names',
            visible: showPlaces,
            onToggle: () => setShowPlaces(v => !v),
            style: { kind: 'solid', color: '#e2e8f0' },
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
