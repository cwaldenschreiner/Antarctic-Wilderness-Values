import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/',             label: 'Home' },
  { to: '/remoteness',   label: 'Remoteness' },
  { to: '/wildness',     label: 'Wildness' },
  { to: '/pristineness', label: 'Pristineness' },
  { to: '/data-sources', label: 'Data Sources' },
];

export function TabNav() {
  return (
    <nav className="tab-nav">
      <div className="brand">
        <span className="brand-icon">❄</span>
        <div>
          <strong>ANT-MICI</strong>
          <small>Antarctic Wilderness Values · WP3</small>
        </div>
      </div>
      <div className="tab-links">
        {TABS.map(t => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'}
            className={({ isActive }) => isActive ? 'active' : ''}>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
