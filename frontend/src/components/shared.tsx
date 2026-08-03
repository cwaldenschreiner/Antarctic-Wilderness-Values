import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { UploadResult } from '../api/client';

// ── Tooltip ────────────────────────────────────────────────────────────────────
const BUBBLE_WIDTH = 300;
const BUBBLE_MAX_HEIGHT = 320;

function placeInfoBubble(btn: DOMRect): { top: number; left: number } {
  const pad = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(BUBBLE_WIDTH, vw - pad * 2);

  // Prefer opening below-right of the trigger so top-of-panel tooltips stay visible.
  let top = btn.bottom + 8;
  let left = btn.left;

  if (top + Math.min(BUBBLE_MAX_HEIGHT, 180) > vh - pad) {
    top = Math.max(pad, btn.top - Math.min(BUBBLE_MAX_HEIGHT, 220) - 8);
  }

  left = Math.min(Math.max(pad, left), vw - width - pad);
  top = Math.min(Math.max(pad, top), vh - pad - 48);
  return { top, left };
}

export function InfoTooltip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  const toggle = () => {
    if (pos) {
      setPos(null);
      return;
    }
    if (!btnRef.current) return;
    setPos(placeInfoBubble(btnRef.current.getBoundingClientRect()));
  };

  // Close on outside click, scroll, or resize
  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || bubbleRef.current?.contains(t)) return;
      close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [pos]);

  return (
    <span className="info-tooltip-wrap">
      <button
        ref={btnRef}
        type="button"
        className="info-btn"
        onClick={toggle}
        aria-expanded={!!pos}
        aria-label="Information"
      >
        ?
      </button>
      {pos && (
        <span
          ref={bubbleRef}
          className="info-bubble"
          style={{ top: pos.top, left: pos.left }}
          role="tooltip"
        >
          <button type="button" className="info-close" onClick={() => setPos(null)} aria-label="Close">
            ✕
          </button>
          {text}
        </span>
      )}
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
export function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

/** Labeled group for the analytics strip under the map. */
export function AnalyticsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="analytics-section">
      <h3 className="analytics-section-title">{title}</h3>
      {children}
    </div>
  );
}

/** Visible analysis overview in the left control panel. */
export function IndicatorIntro({
  summary,
  analysis,
  outputs,
  methodologyPath = '/methodology',
}: {
  summary: string;
  analysis: string;
  outputs: string;
  methodologyPath?: string;
}) {
  return (
    <div className="indicator-intro">
      <p className="indicator-note">{summary}</p>
      <div className="indicator-detail">
        <h4>What this analysis does</h4>
        <p>{analysis}</p>
        <h4>What the outputs mean</h4>
        <p>{outputs}</p>
        <Link to={methodologyPath} className="indicator-method-link">
          Full methodology &amp; sources →
        </Link>
      </div>
    </div>
  );
}

// ── Histogram ──────────────────────────────────────────────────────────────────
export function HistogramChart({
  histogram,
  title,
  color = '#3d8bfd',
  xLabel = 'Score (0–100)',
  yLabel = 'Grid cells',
}: {
  histogram?: { counts: number[]; edges: number[] };
  title: string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
}) {
  if (!histogram) return null;
  const data = histogram.counts.map((count, i) => ({
    bin: `${Math.round(histogram.edges[i])}`,
    count,
  }));
  return (
    <div className="chart-block">
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 28, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d4a6a" />
          <XAxis
            dataKey="bin"
            tick={{ fill: '#94a3b8', fontSize: 9 }}
            interval="preserveStartEnd"
            label={{ value: xLabel, position: 'insideBottom', offset: -18, fill: '#94a3b8', fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 9 }}
            width={48}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 4, fill: '#94a3b8', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ background: '#132337', border: '1px solid #2d4a6a', fontSize: 12 }}
            formatter={(v: unknown) => [v as number, yLabel]}
            labelFormatter={(lab) => `${xLabel.replace(/\s*\(.*\)$/, '')}: ${lab}`}
          />
          <Bar dataKey="count" fill={color} radius={[2, 2, 0, 0]} name={yLabel} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Rank bar chart ─────────────────────────────────────────────────────────────
const RANK_COLORS = ['#ef5350', '#ff9800', '#fdd835', '#66bb6a'];
export function RankChart({
  pcts,
  title = 'Remoteness Rank Distribution',
  xLabel = '% of continent',
}: {
  pcts: Record<string, number>;
  title?: string;
  xLabel?: string;
  yLabel?: string;
}) {
  const data = Object.entries(pcts).map(([name, value]) => ({ name, value }));
  return (
    <div className="chart-block">
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, left: 4, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d4a6a" />
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 9 }}
            unit="%"
            domain={[0, 100]}
            label={{ value: xLabel, position: 'insideBottom', offset: -18, fill: '#94a3b8', fontSize: 10 }}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={100}
            tick={{ fill: '#94a3b8', fontSize: 9 }}
          />
          <Tooltip
            contentStyle={{ background: '#132337', border: '1px solid #2d4a6a', fontSize: 12 }}
            formatter={(v: unknown) => [`${v}%`, xLabel]}
          />
          <Bar dataKey="value" radius={[0, 2, 2, 0]} name={xLabel}>
            {data.map((_, i) => <Cell key={i} fill={RANK_COLORS[i % RANK_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Parameter slider ───────────────────────────────────────────────────────────
export function ParamSlider({ label, value, min, max, step = 1, unit = '', tooltip, onChange }:
  { label: string; value: number; min: number; max: number; step?: number;
    unit?: string; tooltip?: string; onChange: (v: number) => void }) {
  return (
    <div className="param-row">
      <div className="param-label-row">
        <label className="param-label">{label}: <strong>{value}{unit}</strong></label>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} className="param-slider" />
    </div>
  );
}

// ── Upload panel ───────────────────────────────────────────────────────────────
export function UploadPanel({ uploadResult, onUpload, onMergeChange, merge }:
  { uploadResult: UploadResult | null; onUpload: (f: File) => void;
    onMergeChange: (v: boolean) => void; merge: boolean }) {
  return (
    <div className="upload-panel">
      <div className="upload-label-row">
        <span className="control-label">Upload custom dataset</span>
        <InfoTooltip text="Upload a GeoJSON, Shapefile (.zip), or GeoPackage with point or polygon features. Must be in WGS84 (EPSG:4326) or EPSG:3031." />
      </div>
      <label className="upload-btn">
        Choose file…
        <input type="file" accept=".geojson,.json,.zip,.gpkg" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
      </label>
      {uploadResult && (
        <div className="upload-result">
          <span className="upload-ok">✓ {uploadResult.feature_count} features loaded</span>
          <label className="merge-toggle">
            <input type="checkbox" checked={merge} onChange={e => onMergeChange(e.target.checked)} />
            Merge with default dataset
          </label>
        </div>
      )}
    </div>
  );
}

// ── Layer legend ───────────────────────────────────────────────────────────────

export type LegendGradient = {
  kind: 'gradient';
  colors: string[];
  /** Labels along the ramp, typically [min, …, max]. */
  labels: string[];
};

export type LegendClasses = {
  kind: 'classes';
  classes: { color: string; label: string }[];
};

export type LegendSolid = {
  kind: 'solid';
  color: string;
};

export type LegendStyle = LegendGradient | LegendClasses | LegendSolid;

export type LegendItem = {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
  style: LegendStyle;
};

function LegendRamp({ colors, labels }: { colors: string[]; labels: string[] }) {
  return (
    <div className="legend-ramp" aria-hidden>
      <div
        className="legend-ramp-bar"
        style={{ background: `linear-gradient(90deg, ${colors.join(', ')})` }}
      />
      <div
        className="legend-ramp-labels"
        style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
      >
        {labels.map((lab, i) => (
          <span
            key={`${lab}-${i}`}
            className={
              i === 0 ? 'is-start' : i === labels.length - 1 ? 'is-end' : 'is-mid'
            }
          >
            {lab}
          </span>
        ))}
      </div>
    </div>
  );
}

function LegendClassList({ classes }: { classes: { color: string; label: string }[] }) {
  return (
    <div className="legend-classes" aria-hidden>
      {classes.map(c => (
        <div key={c.label} className="legend-class-row">
          <span className="swatch" style={{ background: c.color }} />
          <span className="legend-class-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LayerLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="layer-legend">
      <h4>Layers</h4>
      <ul>
        {items.map(it => (
          <li key={it.id}>
            <label className="legend-toggle">
              <input type="checkbox" checked={it.visible} onChange={it.onToggle} />
              {it.style.kind === 'solid' && (
                <span className="swatch" style={{ background: it.style.color }} />
              )}
              <span className="legend-item-title">{it.label}</span>
            </label>
            {it.style.kind === 'gradient' && (
              <LegendRamp colors={it.style.colors} labels={it.style.labels} />
            )}
            {it.style.kind === 'classes' && (
              <LegendClassList classes={it.style.classes} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Section header with tooltip ────────────────────────────────────────────────
export function SectionHeader({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <div className="section-header">
      <h3>{title}</h3>
      <InfoTooltip text={tooltip} />
    </div>
  );
}

// ── Loading / error states ─────────────────────────────────────────────────────
export function LoadingOverlay({ message = 'Running analysis…' }: { message?: string }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      <p>{message}</p>
    </div>
  );
}

export function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div className="error-banner">
      <span>⚠ {error}</span>
      <button onClick={onDismiss}>✕</button>
    </div>
  );
}

// ── Analysis layout ────────────────────────────────────────────────────────────
export function AnalysisLayout({ controls, map, charts, legend }: {
  controls: ReactNode; map: ReactNode; charts: ReactNode; legend: ReactNode;
}) {
  return (
    <div className="analysis-layout">
      <aside className="control-panel">{controls}</aside>
      <div className="map-column">
        {map}
        <div className="legend-overlay">{legend}</div>
      </div>
      <section className="chart-panel">{charts}</section>
    </div>
  );
}
