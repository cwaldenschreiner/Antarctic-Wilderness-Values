export function WildernessDiagram() {
  return (
    <svg viewBox="0 0 900 520" className="wilderness-diagram" aria-label="Antarctic Wilderness Values conceptual model">
      <defs>
        <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8f4fc" />
          <stop offset="100%" stopColor="#b8d4e8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="900" height="520" fill="#0b1d33" rx="12" />

      <text x="450" y="36" textAnchor="middle" fill="#7ec8ff" fontSize="14" fontWeight="600">
        Overall Antarctic Wilderness Value / Character
      </text>

      {/* Derived values panel */}
      <rect x="24" y="70" width="200" height="380" rx="10" fill="#1a3d2e" stroke="#4ade80" strokeWidth="2" opacity="0.9" />
      <text x="124" y="98" textAnchor="middle" fill="#86efac" fontSize="11" fontWeight="600">
        Derived Values
      </text>
      <text x="124" y="118" textAnchor="middle" fill="#a7f3d0" fontSize="9">
        (when wilderness is protected)
      </text>
      <text x="40" y="148" fill="#d1fae5" fontSize="10" fontWeight="600">Eco-centric</text>
      <text x="40" y="168" fill="#a7f3d0" fontSize="9">Existence · Non-use</text>
      <text x="40" y="184" fill="#a7f3d0" fontSize="9">Ecosystem health</text>
      <text x="40" y="220" fill="#d1fae5" fontSize="10" fontWeight="600">Anthropocentric</text>
      <text x="40" y="240" fill="#a7f3d0" fontSize="9">Spiritual · Science</text>
      <text x="40" y="256" fill="#a7f3d0" fontSize="9">Educational · Experiential</text>
      <text x="40" y="272" fill="#a7f3d0" fontSize="9">Economic · Vicarious</text>

      <path d="M 230 260 L 300 260" stroke="#4ade80" strokeWidth="3" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#4ade80" />
        </marker>
      </defs>

      {/* Three circles */}
      <g filter="url(#glow)">
        <circle cx="380" cy="160" r="88" fill="url(#iceGrad)" stroke="#60a5fa" strokeWidth="3" />
        <circle cx="620" cy="160" r="88" fill="url(#iceGrad)" stroke="#f472b6" strokeWidth="3" />
        <circle cx="500" cy="360" r="88" fill="url(#iceGrad)" stroke="#34d399" strokeWidth="3" />
      </g>

      <text x="380" y="130" textAnchor="middle" fill="#1e3a5f" fontSize="13" fontWeight="700">Remoteness</text>
      <text x="380" y="155" textAnchor="middle" fill="#334155" fontSize="8">Isolation · Inaccessibility</text>
      <text x="380" y="170" textAnchor="middle" fill="#334155" fontSize="8">Distance from facilities</text>
      <text x="380" y="185" textAnchor="middle" fill="#334155" fontSize="8">Distance from corridors</text>
      <text x="380" y="205" textAnchor="middle" fill="#64748b" fontSize="8" fontStyle="italic">Perception of remoteness</text>

      <text x="620" y="130" textAnchor="middle" fill="#1e3a5f" fontSize="13" fontWeight="700">Pristineness</text>
      <text x="620" y="155" textAnchor="middle" fill="#334155" fontSize="8">Inviolate · Untouched</text>
      <text x="620" y="170" textAnchor="middle" fill="#334155" fontSize="8">Lack of human footprints</text>
      <text x="620" y="185" textAnchor="middle" fill="#334155" fontSize="8">Clean air and water</text>
      <text x="620" y="205" textAnchor="middle" fill="#64748b" fontSize="8" fontStyle="italic">Perception of pristineness</text>

      <text x="500" y="330" textAnchor="middle" fill="#1e3a5f" fontSize="13" fontWeight="700">Wildness</text>
      <text x="500" y="355" textAnchor="middle" fill="#334155" fontSize="8">Out of sight &amp; sound</text>
      <text x="500" y="370" textAnchor="middle" fill="#334155" fontSize="8">Undisturbed wildlife habitats</text>
      <text x="500" y="395" textAnchor="middle" fill="#64748b" fontSize="8" fontStyle="italic">Perception of wildness</text>

      {/* Interconnections */}
      <line x1="455" y1="200" x2="545" y2="200" stroke="#a16207" strokeWidth="2" />
      <line x1="420" y1="230" x2="460" y2="300" stroke="#a16207" strokeWidth="2" />
      <line x1="580" y1="230" x2="540" y2="300" stroke="#a16207" strokeWidth="2" />

      <text x="450" y="500" textAnchor="middle" fill="#64748b" fontSize="9">
        Proposed Conceptual Model of Antarctic Wilderness Values (ver. 20260322)
      </text>
    </svg>
  );
}
