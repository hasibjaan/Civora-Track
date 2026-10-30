/**
 * Hand-drawn illustrations for the landing page. They are inline SVG, so they need no image
 * requests, scale on any screen, and fit the Content-Security-Policy. All of them are decorative:
 * the text next to each one says the same thing, so they are hidden from screen readers.
 */

const INK = "#0d3220";
const GREEN = "#1d5a3b";
const LEAF = "#acd3bb";
const MINT = "#eef6f1";
const MARIGOLD = "#f2b544";
const TERRACOTTA = "#a8462a";
const PAPER = "#ffffff";
const ROAD = "#e7e4da";

interface IllustrationProps {
  className?: string;
}

function Pin({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M0 0c-9 0-16 7-16 16 0 12 16 28 16 28s16-16 16-28C16 7 9 0 0 0z"
        fill={fill}
        stroke={PAPER}
        strokeWidth="3"
      />
      <circle cx="0" cy="16" r="5.5" fill={PAPER} />
    </g>
  );
}

/** A city map seen from above: streets, a river, a park, report pins and one hotspot. */
export function CityMapIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 480 400" className={className} aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="464" height="384" rx="28" fill={PAPER} />
      <rect
        x="8"
        y="8"
        width="464"
        height="384"
        rx="28"
        fill="none"
        stroke={LEAF}
        strokeWidth="2"
      />
      {/* Blocks */}
      <g fill={MINT}>
        <rect x="40" y="40" width="120" height="90" rx="10" />
        <rect x="190" y="40" width="100" height="90" rx="10" />
        <rect x="40" y="160" width="120" height="100" rx="10" />
        <rect x="320" y="200" width="120" height="70" rx="10" />
        <rect x="40" y="290" width="200" height="70" rx="10" />
        <rect x="270" y="300" width="170" height="60" rx="10" />
      </g>
      {/* Park */}
      <rect x="190" y="160" width="100" height="100" rx="14" fill={LEAF} />
      <circle cx="220" cy="190" r="12" fill={GREEN} opacity="0.55" />
      <circle cx="255" cy="225" r="16" fill={GREEN} opacity="0.55" />
      <circle cx="232" cy="238" r="9" fill={GREEN} opacity="0.55" />
      {/* River */}
      <path
        d="M320 32c30 40-10 70 30 110s60 20 100 40"
        fill="none"
        stroke="#bfe0ec"
        strokeWidth="26"
        strokeLinecap="round"
      />
      {/* Roads */}
      <g stroke={ROAD} strokeWidth="14" strokeLinecap="round">
        <path d="M24 145h432" />
        <path d="M24 275h432" />
        <path d="M175 24v352" />
        <path d="M305 150v226" />
      </g>
      <g stroke={PAPER} strokeWidth="2" strokeDasharray="8 8">
        <path d="M24 145h432" />
        <path d="M175 24v352" />
      </g>
      {/* A hotspot: several reports close together */}
      <circle
        cx="118"
        cy="214"
        r="58"
        fill={MARIGOLD}
        fillOpacity="0.18"
        stroke={TERRACOTTA}
        strokeWidth="2.5"
        strokeDasharray="7 6"
      />
      <Pin x={98} y={170} fill={TERRACOTTA} />
      <Pin x={136} y={186} fill={TERRACOTTA} />
      <Pin x={112} y={208} fill={MARIGOLD} />
      <Pin x={250} y={78} fill={GREEN} />
      <Pin x={380} y={214} fill={MARIGOLD} />
      <Pin x={350} y={300} fill={GREEN} />
      {/* A report card floating over the map */}
      <g transform="translate(262 52)">
        <rect width="178" height="96" rx="16" fill={INK} />
        <circle cx="26" cy="28" r="10" fill={MARIGOLD} />
        <rect x="44" y="20" width="96" height="8" rx="4" fill={LEAF} />
        <rect x="44" y="34" width="64" height="6" rx="3" fill={LEAF} opacity="0.6" />
        <rect x="16" y="56" width="70" height="22" rx="11" fill={MARIGOLD} />
        <rect x="96" y="60" width="66" height="14" rx="7" fill={GREEN} />
      </g>
    </svg>
  );
}

/** Blocked drains along one street, gathered into a single hotspot. */
export function DrainScene({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 180" className={className} aria-hidden="true" focusable="false">
      <rect width="320" height="180" fill={MINT} />
      <rect y="112" width="320" height="68" fill={ROAD} />
      <path d="M0 146h320" stroke={PAPER} strokeWidth="3" strokeDasharray="14 12" />
      <path d="M0 112h320" stroke="#cfcab9" strokeWidth="4" />
      {[50, 140, 230].map((x) => (
        <g key={x}>
          <rect x={x} y="104" width="40" height="14" rx="3" fill="#5b6b62" />
          <path d={`M${x + 6} 108h28M${x + 6} 113h28`} stroke={ROAD} strokeWidth="2" />
          <ellipse cx={x + 20} cy="130" rx="34" ry="8" fill="#bfe0ec" />
        </g>
      ))}
      <circle
        cx="160"
        cy="112"
        r="100"
        fill="none"
        stroke={TERRACOTTA}
        strokeWidth="2.5"
        strokeDasharray="8 7"
      />
      <Pin x={70} y={44} fill={TERRACOTTA} />
      <Pin x={160} y={30} fill={TERRACOTTA} />
      <Pin x={250} y={44} fill={MARIGOLD} />
    </svg>
  );
}

/** An open manhole at a bus stop, flagged as urgent. */
export function ManholeScene({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 180" className={className} aria-hidden="true" focusable="false">
      <rect width="320" height="180" fill={MARIGOLD} fillOpacity="0.22" />
      <rect y="118" width="320" height="62" fill={ROAD} />
      {/* Bus stop */}
      <rect x="34" y="42" width="8" height="76" fill={INK} />
      <rect x="20" y="30" width="80" height="16" rx="4" fill={GREEN} />
      <rect x="48" y="62" width="44" height="34" rx="4" fill={PAPER} stroke={INK} strokeWidth="2" />
      {/* Open manhole */}
      <ellipse cx="200" cy="148" rx="46" ry="14" fill={INK} />
      <ellipse cx="200" cy="146" rx="36" ry="9" fill="#2a2a2a" />
      {/* Warning sign */}
      <g transform="translate(244 40)">
        <path
          d="M30 0l30 52H0z"
          fill={MARIGOLD}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="27" y="16" width="6" height="20" rx="3" fill={INK} />
        <circle cx="30" cy="43" r="3.5" fill={INK} />
      </g>
      <rect x="130" y="24" width="86" height="26" rx="13" fill={TERRACOTTA} />
      <rect x="146" y="34" width="54" height="6" rx="3" fill={PAPER} />
    </svg>
  );
}

/** A dark street with a broken light, reported twice and merged into one report. */
export function StreetlightScene({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 180" className={className} aria-hidden="true" focusable="false">
      <rect width="320" height="180" fill={INK} />
      {[
        [40, 30],
        [110, 18],
        [270, 26],
        [210, 50],
        [72, 64],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill={MINT} opacity="0.8" />
      ))}
      <circle cx="262" cy="40" r="16" fill={MINT} opacity="0.9" />
      <circle cx="270" cy="34" r="14" fill={INK} />
      <rect y="132" width="320" height="48" fill="#24372d" />
      {/* Broken lamp post */}
      <rect x="96" y="54" width="8" height="80" fill="#5b6b62" />
      <path d="M100 56c0-14 18-18 34-14" fill="none" stroke="#5b6b62" strokeWidth="7" />
      <ellipse cx="138" cy="46" rx="14" ry="7" fill="#3c4a42" />
      {/* Two reports become one */}
      <g transform="translate(186 92)">
        <rect x="0" y="0" width="54" height="34" rx="8" fill={LEAF} opacity="0.55" />
        <rect x="14" y="8" width="54" height="34" rx="8" fill={MARIGOLD} />
        <rect x="24" y="18" width="34" height="5" rx="2.5" fill={INK} />
        <rect x="24" y="28" width="22" height="5" rx="2.5" fill={INK} opacity="0.6" />
      </g>
    </svg>
  );
}
