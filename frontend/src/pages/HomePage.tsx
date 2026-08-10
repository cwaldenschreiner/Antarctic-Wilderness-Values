import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-text">
          <h1>Antarctic Wilderness Values Dashboard</h1>
          <p className="subtitle">ANT-MICI · WP3 — Monitoring cumulative impacts on wilderness character</p>
          <p className="hero-byline">
            Dashboard developed by <strong>Dr. Chelsey Walden-Schreiner</strong>
          </p>
          <p>
            Antarctic tourism has grown for over 30 years, raising concerns about cumulative impacts
            on biodiversity and wilderness values. This dashboard is part of{' '}
            <a
              href="https://www.rug.nl/research/arctisch-centrum/projects/pt-repair/ant-mici/?lang=en"
              target="_blank"
              rel="noopener noreferrer"
              className="ext-link"
            >
              ANT-MICI
            </a>
            {' '}(University of Groningen Arctic Centre / NWO PT-REPAIR) and supports
            policymakers and the tourism sector with interactive maps of three wilderness-value
            pillars — alongside the programme’s wider goals of tourism forecasting, biodiversity
            mapping, impact inventory, monitoring, and regulatory tools.
          </p>
          <p>
            Methods follow Summerson &amp; Bishop (2012) and ATCM XXXVI IP 39 (New Zealand, 2013),
            with the inviolate wilderness baseline from Leihy et al. (2020). See the{' '}
            <Link to="/methodology" className="ext-link">Methodology</Link> tab for full detail and
            linked sources.
          </p>
          <div className="hero-badges">
            <span className="badge badge-blue">50 km grid · EPSG:3031</span>
            <span className="badge badge-green">331 visitor sites</span>
            <span className="badge badge-teal">81 COMNAP facilities</span>
            <span className="badge badge-dark">1,733 inviolate cells</span>
          </div>
        </div>
        <div className="hero-diagram">
          <WildernessDiagram />
        </div>
      </section>

      <section className="indicator-cards">
        <a href="/remoteness" className="ind-card ind-card--blue">
          <h2>Remoteness</h2>
          <p>Isolation from human infrastructure, corridors, and visitor sites. Scored by exponential decay from COMNAP facilities and ATS visitor sites.</p>
          <span className="ind-link">Explore →</span>
        </a>
        <a href="/wildness" className="ind-card ind-card--green">
          <h2>Wildness</h2>
          <p>Areas outside the sight and sound range of any human activity. Binary classification per IP 39 §6 thresholds.</p>
          <span className="ind-link">Explore →</span>
        </a>
        <a href="/pristineness" className="ind-card ind-card--teal">
          <h2>Pristineness</h2>
          <p>Inviolate areas with no recorded human visitation 1819–2018 (Leihy et al. 2020), modulated by current visitor intensity.</p>
          <span className="ind-link">Explore →</span>
        </a>
      </section>

      <footer className="home-credits">
        <h2>Project team</h2>
        <p className="home-credits-org">
          Antarctic Wilderness Values project · North Carolina State University
        </p>
        <p className="home-credits-led">
          Led by <strong>Dr. Yu-Fai Leung</strong>, <strong>Courtney Hotchkiss</strong>, and{' '}
          <strong>Dr. Daniela Cajiao</strong>
        </p>
      </footer>
    </div>
  );
}

function WildernessDiagram() {
  return (
    <svg viewBox="0 0 520 460" className="wilderness-svg" aria-label="Antarctic Wilderness Values conceptual model">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d2137" />
          <stop offset="100%" stopColor="#0b1d33" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="520" height="460" fill="url(#bgGrad)" rx="14"/>

      {/* Title */}
      <text x="260" y="36" textAnchor="middle" fill="#7ec8ff" fontSize="15" fontWeight="600">
        Antarctic Wilderness Character
      </text>

      {/* Three circles */}
      <g filter="url(#glow)">
        <circle cx="200" cy="170" r="95" fill="#1a2f47" stroke="#3d8bfd" strokeWidth="2.5" opacity="0.95"/>
        <circle cx="320" cy="170" r="95" fill="#1a3d2e" stroke="#34d399" strokeWidth="2.5" opacity="0.95"/>
        <circle cx="260" cy="310" r="95" fill="#0f3030" stroke="#06b6d4" strokeWidth="2.5" opacity="0.95"/>
      </g>

      {/* Remoteness */}
      <text x="168" y="148" textAnchor="middle" fill="#93c5fd" fontSize="15" fontWeight="700">Remoteness</text>
      <text x="168" y="168" textAnchor="middle" fill="#94a3b8" fontSize="10">Isolation</text>
      <text x="168" y="183" textAnchor="middle" fill="#94a3b8" fontSize="10">Inaccessibility</text>
      <text x="168" y="198" textAnchor="middle" fill="#94a3b8" fontSize="10">Distance from</text>
      <text x="168" y="211" textAnchor="middle" fill="#94a3b8" fontSize="10">infrastructure</text>

      {/* Pristineness */}
      <text x="353" y="148" textAnchor="middle" fill="#6ee7b7" fontSize="15" fontWeight="700">Pristineness</text>
      <text x="353" y="168" textAnchor="middle" fill="#94a3b8" fontSize="10">Inviolate</text>
      <text x="353" y="183" textAnchor="middle" fill="#94a3b8" fontSize="10">No human footprint</text>
      <text x="353" y="198" textAnchor="middle" fill="#94a3b8" fontSize="10">Clean air &amp; water</text>

      {/* Wildness */}
      <text x="260" y="298" textAnchor="middle" fill="#67e8f9" fontSize="15" fontWeight="700">Wildness</text>
      <text x="260" y="318" textAnchor="middle" fill="#94a3b8" fontSize="10">Out of sight &amp; sound</text>
      <text x="260" y="333" textAnchor="middle" fill="#94a3b8" fontSize="10">Undisturbed wildlife</text>
      <text x="260" y="348" textAnchor="middle" fill="#64748b" fontSize="9" fontStyle="italic">Perception of wildness</text>

      {/* Overlap label */}
      <text x="260" y="226" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="600">Overall</text>
      <text x="260" y="238" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="600">Wilderness</text>
      <text x="260" y="250" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="600">Value</text>

      {/* Derived values */}
      <rect x="18" y="380" width="484" height="62" rx="8" fill="#132337" stroke="#2d4a6a" strokeWidth="1"/>
      <text x="260" y="398" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Derived Values (when wilderness is protected)</text>
      <text x="50" y="418" fill="#64748b" fontSize="9">Existence · Ecosystem health</text>
      <text x="200" y="418" fill="#64748b" fontSize="9">Spiritual · Scientific</text>
      <text x="330" y="418" fill="#64748b" fontSize="9">Educational · Experiential</text>
      <text x="260" y="434" textAnchor="middle" fill="#475569" fontSize="8" fontStyle="italic">
        Summerson &amp; Bishop (2012) · ATCM XXXVI IP 39 (New Zealand, 2013)
      </text>
    </svg>
  );
}
