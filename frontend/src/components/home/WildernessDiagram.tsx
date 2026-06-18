export function WildernessDiagram() {
  return (
    <svg viewBox="0 0 900 580" className="wilderness-diagram" aria-label="Antarctic Wilderness Values conceptual model">
      <defs>
        <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8f4fc" />
          <stop offset="100%" stopColor="#b8d4e8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto">
          <path d="M0,0 L7,4 L0,8 Z" fill="#4ade80" />
        </marker>
      </defs>

      <rect width="900" height="580" fill="rgba(11, 29, 51, 0.88)" rx="16" />

      <text x="450" y="44" textAnchor="middle" fill="#7ec8ff" fontSize="22" fontWeight="600">
        Overall Antarctic Wilderness Value / Character
      </text>

      {/* Derived values panel */}
      <rect x="28" y="78" width="220" height="420" rx="12" fill="#1a3d2e" stroke="#4ade80" strokeWidth="2.5" opacity="0.95" />
      <text x="138" y="112" textAnchor="middle" fill="#86efac" fontSize="17" fontWeight="600">
        Derived Values
      </text>
      <text x="138" y="136" textAnchor="middle" fill="#a7f3d0" fontSize="13">
        (when wilderness is protected)
      </text>
      <text x="48" y="172" fill="#d1fae5" fontSize="15" fontWeight="600">Eco-centric</text>
      <text x="48" y="198" fill="#a7f3d0" fontSize="13">Existence · Non-use</text>
      <text x="48" y="220" fill="#a7f3d0" fontSize="13">Ecosystem health</text>
      <text x="48" y="262" fill="#d1fae5" fontSize="15" fontWeight="600">Anthropocentric</text>
      <text x="48" y="288" fill="#a7f3d0" fontSize="13">Spiritual · Science</text>
      <text x="48" y="310" fill="#a7f3d0" fontSize="13">Educational · Experiential</text>
      <text x="48" y="332" fill="#a7f3d0" fontSize="13">Economic · Vicarious</text>

      <path d="M 255 288 L 320 288" stroke="#4ade80" strokeWidth="4" markerEnd="url(#arrow)" />

      {/* Three circles */}
      <g filter="url(#glow)">
        <circle cx="380" cy="175" r="105" fill="url(#iceGrad)" stroke="#60a5fa" strokeWidth="3.5" />
        <circle cx="620" cy="175" r="105" fill="url(#iceGrad)" stroke="#f472b6" strokeWidth="3.5" />
        <circle cx="500" cy="395" r="105" fill="url(#iceGrad)" stroke="#34d399" strokeWidth="3.5" />
      </g>

      <text x="380" y="138" textAnchor="middle" fill="#1e3a5f" fontSize="20" fontWeight="700">Remoteness</text>
      <text x="380" y="168" textAnchor="middle" fill="#334155" fontSize="12">Isolation · Inaccessibility</text>
      <text x="380" y="188" textAnchor="middle" fill="#334155" fontSize="12">Distance from facilities</text>
      <text x="380" y="208" textAnchor="middle" fill="#334155" fontSize="12">Distance from corridors</text>
      <text x="380" y="232" textAnchor="middle" fill="#64748b" fontSize="12" fontStyle="italic">Perception of remoteness</text>

      <text x="620" y="138" textAnchor="middle" fill="#1e3a5f" fontSize="20" fontWeight="700">Pristineness</text>
      <text x="620" y="168" textAnchor="middle" fill="#334155" fontSize="12">Inviolate · Untouched</text>
      <text x="620" y="188" textAnchor="middle" fill="#334155" fontSize="12">Lack of human footprints</text>
      <text x="620" y="208" textAnchor="middle" fill="#334155" fontSize="12">Clean air and water</text>
      <text x="620" y="232" textAnchor="middle" fill="#64748b" fontSize="12" fontStyle="italic">Perception of pristineness</text>

      <text x="500" y="358" textAnchor="middle" fill="#1e3a5f" fontSize="20" fontWeight="700">Wildness</text>
      <text x="500" y="388" textAnchor="middle" fill="#334155" fontSize="12">Out of sight &amp; sound</text>
      <text x="500" y="408" textAnchor="middle" fill="#334155" fontSize="12">Undisturbed wildlife habitats</text>
      <text x="500" y="436" textAnchor="middle" fill="#64748b" fontSize="12" fontStyle="italic">Perception of wildness</text>

      {/* Interconnections */}
      <line x1="460" y1="225" x2="540" y2="225" stroke="#a16207" strokeWidth="2.5" />
      <line x1="415" y1="265" x2="455" y2="335" stroke="#a16207" strokeWidth="2.5" />
      <line x1="585" y1="265" x2="545" y2="335" stroke="#a16207" strokeWidth="2.5" />

      <text x="450" y="548" textAnchor="middle" fill="#94a3b8" fontSize="13">
        Proposed Conceptual Model of Antarctic Wilderness Values (ver. 20260322)
      </text>
    </svg>
  );
}
