import { useCallback, useEffect, useState } from 'react';
import { analyzeWildness, fetchPrecomputed, uploadFile } from '../api/client';
import type { WildnessResult, UploadResult, PrecomputedResponse } from '../api/client';
import { MapView } from '../components/map/MapView';
import type { RasterLayer } from '../components/map/MapView';
import {
  AnalysisLayout, SectionHeader, ParamSlider, StatCard, AnalyticsSection,
  IndicatorIntro, UploadPanel, LayerLegend, HistogramChart,
  LoadingOverlay, ErrorBanner,
} from '../components/shared';

const WILDNESS_TOOLTIP =
  'Wildness analysis: each 50 km cell is classified as wild (score 100) if it lies outside the sight/sound range of all facilities and visitor sites, otherwise impacted (score 0), per IP 39 §6. Outputs: (1) Wildness Index map; (2) Impacted/viewshed mask of cells inside thresholds; (3) % wild, % impacted, wild area, and score histogram below the map.';
const SIGHT_FAC_TOOLTIP = 'Maximum distance (km) at which a permanent facility (station, airstrip, etc.) can be seen or heard. At 50 km resolution, thresholds below 50 km are sub-pixel; 100 km represents the approximate range of large station complexes including helicopter operations and radio communication noise.';
const SIGHT_VIS_TOOLTIP = 'Maximum distance at which a visitor site has a measurable wildness impact. Visitor sites are transient and have lower impact radius than permanent facilities.';

const DEFAULT_COORDS = [[-180,-55],[180,-55],[180,-85.05],[-180,-85.05]] as [[number,number],[number,number],[number,number],[number,number]];

export function WildnessPage() {
  const [result,       setResult]       = useState<WildnessResult | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadId,     setUploadId]     = useState<string | null>(null);
  const [mergeUpload,  setMergeUpload]  = useState(true);
  const [opacity,      setOpacity]      = useState(0.8);
  const [showWild,     setShowWild]     = useState(true);
  const [showViewshed, setShowViewshed] = useState(false);

  const [facSight, setFacSight] = useState(100);
  const [visSight, setVisSight] = useState(50);

  useEffect(() => {
    setLoading(true);
    fetchPrecomputed()
      .then((pre: PrecomputedResponse) => {
        if (pre.rasters.wildness_index) {
          setResult({
            wildness_png:        pre.rasters.wildness_index,
            viewshed_png:        pre.rasters.cumulative_viewshed || '',
            raster_coords:       pre.raster_coords,
            wild_pct:            pre.stats.wildness?.wild_pct || 0,
            visible_impact_pct:  pre.stats.wildness?.visible_impact_pct || 0,
            wild_area_km2:       pre.stats.wildness?.wild_area_km2 || 0,
            impacted_area_km2:   pre.stats.wildness?.impacted_area_km2 || 0,
            total_continent_km2: 24600000,
            histogram:           { counts: [], edges: [] },
            n_facilities:        81,
            n_visitor_sites:     331,
            params:              {},
          } as WildnessResult);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await analyzeWildness({
        facility_sight_km: facSight,
        visitor_sight_km:  visSight,
        upload_id:         uploadId,
        merge_uploaded:    mergeUpload,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [facSight, visSight, uploadId, mergeUpload]);

  const handleUpload = async (file: File) => {
    try {
      const res = await uploadFile(file);
      setUploadResult(res);
      setUploadId(res.upload_id);
    } catch (e: unknown) { setError(String(e)); }
  };

  const coords = DEFAULT_COORDS;
  const viewshedOpacity = opacity * 0.7;
  const rasters: RasterLayer[] = [
    ...(result?.wildness_png  ? [{ id: 'wild',     png_base64: result.wildness_png, coords, opacity,          visible: showWild     }] : []),
    ...(result?.viewshed_png  ? [{ id: 'viewshed', png_base64: result.viewshed_png, coords, opacity: viewshedOpacity, visible: showViewshed }] : []),
  ];

  return (
    <AnalysisLayout
      controls={
        <div className="control-body">
          <SectionHeader title="Wildness Indicators" tooltip={WILDNESS_TOOLTIP} />
          <IndicatorIntro
            summary='Areas out of sight and sound of human infrastructure and visitor activity — binary classification per IP 39 §6 (New Zealand, 2013).'
            analysis="Run Analysis checks every 50 km grid cell against facility and visitor sight/sound ranges. Cells beyond all thresholds are wild; cells inside any threshold are impacted. Adjust the two range sliders to explore sensitivity; uploads can add infrastructure."
            outputs="The map shows the Wildness Index (100 = wild, 0 = impacted; negligible zeros are transparent) and an optional Impacted/viewshed overlay. Below the map: wild share, share within impact range, wild area (km²), facility count, and a score histogram after you run the analysis."
          />

          <div className="param-section">
            <h4>Analysis Parameters</h4>
            <ParamSlider label="Facility sight/sound range" value={facSight} min={50} max={500} step={25} unit=" km"
              tooltip={SIGHT_FAC_TOOLTIP} onChange={setFacSight} />
            <ParamSlider label="Visitor site sight/sound range" value={visSight} min={25} max={250} step={25} unit=" km"
              tooltip={SIGHT_VIS_TOOLTIP} onChange={setVisSight} />
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
            id: 'wild',
            label: 'Wildness Index',
            visible: showWild,
            onToggle: () => setShowWild(v => !v),
            style: {
              kind: 'gradient',
              colors: ['#b71c1c', '#ef9a9a', '#fff9c4', '#66bb6a', '#1b5e20'],
              labels: ['0 impacted', '100 wild'],
            },
          },
          {
            id: 'viewshed',
            label: 'Impacted (viewshed)',
            visible: showViewshed,
            onToggle: () => setShowViewshed(v => !v),
            style: {
              kind: 'solid',
              color: '#b71c1c',
            },
          },
        ]} />
      }
      charts={
        <>
          <AnalyticsSection title="Summary metrics">
            <div className="stat-cards">
              <StatCard value={result ? `${result.wild_pct}%` : '—'}
                label="Wild share of continent"
                sub="Out of sight and sound of human activity" />
              <StatCard value={result ? `${result.visible_impact_pct}%` : '—'}
                label="Within impact range"
                sub="% of continent inside sight/sound thresholds" />
              <StatCard value={result ? `${(result.wild_area_km2 / 1e6).toFixed(1)} M km²` : '—'}
                label="Wild area"
                sub="Absolute extent classified as wild" />
              <StatCard value={result ? `${result.n_facilities}` : '81'}
                label="Facilities counted"
                sub="COMNAP v3.5.0 (2024)" />
            </div>
          </AnalyticsSection>
          {result?.histogram?.counts.length ? (
            <AnalyticsSection title="Score distribution">
              <HistogramChart
                histogram={result.histogram}
                title="Wildness score histogram"
                color="#1b5e20"
                xLabel="Wildness score (0 = impacted, 100 = wild)"
                yLabel="Grid cells"
              />
            </AnalyticsSection>
          ) : null}
        </>
      }
    />
  );
}
