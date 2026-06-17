import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  histogram?: { counts: number[]; edges: number[] };
  title?: string;
}

export function HistogramChart({ histogram, title = 'Distribution' }: Props) {
  if (!histogram) return null;
  const data = histogram.counts.map((count, i) => ({
    bin: `${Math.round(histogram.edges[i])}-${Math.round(histogram.edges[i + 1])}`,
    count,
  }));
  return (
    <div className="chart-block">
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="bin" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
          <Bar dataKey="count" fill="#3d8bfd" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface RankProps {
  stats: Record<string, number>;
  title?: string;
}

export function RankBarChart({ stats, title = 'Wilderness Rank (% area)' }: RankProps) {
  const data = Object.entries(stats).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));
  return (
    <div className="chart-block">
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
          <Bar dataKey="value" fill="#4ade80" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
