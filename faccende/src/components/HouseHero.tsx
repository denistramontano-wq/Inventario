/** Casetta illustrata che cambia aspetto in base alla freschezza (0..1) */
export function HouseHero({ freshness }: { freshness: number | null }) {
  const f = freshness ?? 1
  const sparkling = f >= 0.7
  const dusty = f < 0.4
  const wall = dusty ? '#d9d4c7' : '#f8fafc'
  const roof = dusty ? '#5b8fb8' : '#38bdf8'
  const roofDark = dusty ? '#46789f' : '#0ea5e9'
  const glass = sparkling ? '#bae6fd' : dusty ? '#94a3b8' : '#a5d8f5'
  const ink = '#0f172a'

  return (
    <svg viewBox="0 0 320 230" className="w-full" role="img" aria-label="La tua casa">
      <ellipse cx="160" cy="208" rx="130" ry="12" fill="#000" opacity="0.35" />

      {/* cespugli */}
      <g stroke={ink} strokeWidth="3">
        <circle cx="62" cy="186" r="20" fill="#6ee7b7" />
        <circle cx="84" cy="194" r="14" fill="#34d399" />
        <circle cx="258" cy="186" r="20" fill="#6ee7b7" />
        <circle cx="238" cy="195" r="13" fill="#34d399" />
      </g>

      {/* camino */}
      <rect x="200" y="48" width="24" height="38" fill="#f87171" stroke={ink} strokeWidth="4" />
      <rect x="195" y="42" width="34" height="10" rx="2" fill="#fca5a5" stroke={ink} strokeWidth="4" />

      {/* corpo */}
      <rect x="92" y="102" width="136" height="100" fill={wall} stroke={ink} strokeWidth="5" />

      {/* tetto */}
      <path d="M66 112 L160 36 L254 112 Z" fill={roof} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
      <path d="M92 104 L160 50 L228 104" fill="none" stroke={roofDark} strokeWidth="6" strokeLinecap="round" />
      <path d="M160 58 L214 102 L106 102 Z" fill={wall} />

      {/* finestra tonda */}
      <circle cx="160" cy="82" r="13" fill={glass} stroke={ink} strokeWidth="4" />
      <path d="M160 69v26M147 82h26" stroke={ink} strokeWidth="3" />

      {/* finestre */}
      {[106, 180].map((x) => (
        <g key={x}>
          <rect x={x} y="122" width="34" height="30" rx="3" fill={glass} stroke={ink} strokeWidth="4" />
          <path d={`M${x + 17} 122v30M${x} 137h34`} stroke={ink} strokeWidth="3" />
          {sparkling && <path d={`M${x + 22} 127l6 6`} stroke="#fff" strokeWidth="3" strokeLinecap="round" />}
          <rect x={x - 3} y="152" width="40" height="7" rx="2" fill="#fb7185" stroke={ink} strokeWidth="3" />
        </g>
      ))}
      <g fill="#4ade80" stroke={ink} strokeWidth="2">
        <circle cx="187" cy="150" r="4" />
        <circle cx="197" cy="149" r="4" />
        <circle cx="207" cy="150" r="4" />
      </g>

      {/* porta */}
      <path d="M142 202 V160 a18 18 0 0 1 36 0 V202 Z" fill="#fb7185" stroke={ink} strokeWidth="5" />
      <path d="M154 162v38M166 162v38" stroke="#e11d48" strokeWidth="2.5" opacity="0.6" />
      <circle cx="171" cy="182" r="3" fill={ink} />
      <rect x="134" y="200" width="52" height="8" rx="3" fill="#cbd5e1" stroke={ink} strokeWidth="3" />

      {sparkling && (
        <g fill="#fde68a">
          {[
            [58, 60, 0],
            [270, 72, 0.5],
            [96, 30, 1],
            [236, 22, 1.3],
            [284, 140, 0.8],
            [36, 132, 0.3],
          ].map(([x, y, d]) => (
            <path
              key={`${x}-${y}`}
              className="twinkle"
              style={{ animationDelay: `${d}s` }}
              d={`M${x} ${y - 9} Q${x + 1.5} ${y - 1.5} ${x + 9} ${y} Q${x + 1.5} ${y + 1.5} ${x} ${y + 9} Q${x - 1.5} ${y + 1.5} ${x - 9} ${y} Q${x - 1.5} ${y - 1.5} ${x} ${y - 9}Z`}
            />
          ))}
        </g>
      )}

      {dusty && (
        <>
          {/* ragnatela */}
          <g stroke="#e2e8f0" strokeWidth="1.5" fill="none" opacity="0.8">
            <path d="M96 106 L126 106 M96 106 L96 136 M96 106 L118 128" />
            <path d="M106 106 Q104 112 96 114 M116 106 Q112 118 96 124 M124 106 Q120 124 96 134" />
          </g>
          {/* nuvole di polvere */}
          <g fill="#a8a29e">
            <g className="drift">
              <circle cx="104" cy="200" r="10" />
              <circle cx="116" cy="196" r="12" />
              <circle cx="128" cy="202" r="8" />
            </g>
            <g className="drift" style={{ animationDelay: '1.2s' }}>
              <circle cx="200" cy="202" r="9" />
              <circle cx="212" cy="197" r="11" />
              <circle cx="224" cy="203" r="7" />
            </g>
          </g>
        </>
      )}
    </svg>
  )
}
