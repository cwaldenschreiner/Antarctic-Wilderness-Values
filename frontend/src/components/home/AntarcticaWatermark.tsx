/** Stylized Antarctica outline + ATCM-inspired watermark for the home page. */
export function AntarcticaWatermark() {
  return (
    <svg
      className="antarctica-watermark"
      viewBox="0 0 800 800"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="poleGlow" cx="50%" cy="55%" r="45%">
          <stop offset="0%" stopColor="#3d8bfd" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0b1d33" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="800" fill="url(#poleGlow)" />
      {/* Simplified Antarctic continent silhouette (polar stereographic style) */}
      <path
        fill="none"
        stroke="#7ec8ff"
        strokeWidth="2"
        opacity="0.18"
        d="M 400 120
           C 320 130, 260 170, 220 230
           C 190 280, 175 340, 180 400
           C 185 460, 210 510, 260 540
           C 300 560, 350 570, 400 575
           C 450 570, 500 560, 540 540
           C 590 510, 615 460, 620 400
           C 625 340, 610 280, 580 230
           C 540 170, 480 130, 400 120 Z
           M 280 380
           C 250 400, 230 430, 220 470
           C 215 500, 225 530, 250 550
           C 270 520, 285 480, 290 440
           C 292 415, 288 395, 280 380 Z"
      />
      {/* ATCM-inspired compass rose hint */}
      <circle cx="400" cy="400" r="280" fill="none" stroke="#e8eef5" strokeWidth="1" opacity="0.06" />
      <circle cx="400" cy="400" r="220" fill="none" stroke="#e8eef5" strokeWidth="1" opacity="0.05" strokeDasharray="8 12" />
    </svg>
  );
}
