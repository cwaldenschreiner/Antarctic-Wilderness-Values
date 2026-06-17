import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
}

export function ControlPanel({ title, children }: Props) {
  return (
    <aside className="control-panel">
      <h3>{title}</h3>
      <div className="control-body">{children}</div>
    </aside>
  );
}
