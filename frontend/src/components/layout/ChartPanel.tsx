import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ChartPanel({ children }: Props) {
  return <section className="chart-panel">{children}</section>;
}
