interface Props {
  items: { id: string; label: string; color: string; visible: boolean; onToggle: () => void }[];
}

export function LayerLegend({ items }: Props) {
  return (
    <div className="layer-legend">
      <h4>Layers</h4>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input type="checkbox" checked={item.visible} onChange={item.onToggle} />
              <span className="swatch" style={{ background: item.color }} />
              {item.label}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
