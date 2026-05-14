/**
 * KoerspouleLogo — race-aware SVG logo
 *
 * Drop dit bestand in: src/components/KoerspouleLogo.tsx
 *
 * Drie varianten:
 *   <KoerspouleLogo variant="wordmark" race="giro" />   // horizontaal, voor masthead/header
 *   <KoerspouleLogo variant="sticker"  race="giro" />   // shield-vorm, voor hero
 *   <KoerspouleLogo variant="mark"     race="giro" />   // alleen renner, voor footer
 *
 * Race-prop is optioneel; default = "giro". Wil je hem automatisch laten meebewegen
 * met het actieve game in Supabase? Gebruik dan in de parent:
 *
 *   import { useCurrentGame } from "@/hooks/useCurrentGame";
 *   const { data: game } = useCurrentGame();
 *   const race = (game?.game_type ?? "giro") as RaceKey;
 *   <KoerspouleLogo variant="wordmark" race={race} />
 */

export type RaceKey = "giro" | "tdf" | "vuelta";

type Variant = "wordmark" | "sticker" | "mark";

interface Theme {
  accent: string;
  dark: string;
  flag: [string, string, string];
}

const PLATE = "#0F1115";

const THEMES: Record<RaceKey, Theme> = {
  giro:   { accent: "#ED1E79", dark: "#A8124F", flag: ["#009246", "#ffffff", "#CE2B37"] },
  tdf:    { accent: "#FCD028", dark: "#B89000", flag: ["#0055A4", "#ffffff", "#EF4135"] },
  vuelta: { accent: "#D81E1E", dark: "#8F0D0D", flag: ["#AA151B", "#F1BF00", "#AA151B"] },
};

function Cyclist({ accent, dark, scale = 1 }: { accent: string; dark: string; scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <circle cx="-72" cy="40" r="44" fill={PLATE} stroke="#fff" strokeWidth="7" />
      <circle cx="-72" cy="40" r="14" fill={accent} stroke={dark} strokeWidth="2" />
      <circle cx="72" cy="40" r="44" fill={PLATE} stroke="#fff" strokeWidth="7" />
      <circle cx="72" cy="40" r="14" fill={accent} stroke={dark} strokeWidth="2" />
      <path
        d="M -72 40 L -18 -8 L 50 -8 L 72 40 M 50 -8 L 60 -20"
        stroke={PLATE}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M -42 -2 C -38 -16, -22 -38, 0 -48 C 22 -58, 48 -62, 60 -58 C 64 -56, 64 -50, 60 -46 L 42 -32 C 50 -26, 54 -16, 50 -6 C 44 6, 30 12, 14 10 L -16 6 C -28 4, -38 4, -42 -2 Z"
        fill={accent}
        stroke={dark}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="62" cy="-58" r="13" fill={accent} stroke={dark} strokeWidth="3" />
      <path
        d="M 50 -64 Q 62 -74 76 -62"
        stroke={dark}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M -8 6 L -26 28 L -56 36"
        stroke={accent}
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M -8 6 L -26 28 L -56 36"
        stroke={dark}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 26 8 L 52 30 L 72 32"
        stroke={accent}
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 26 8 L 52 30 L 72 32"
        stroke={dark}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 36 -28 L 58 -22 L 60 -10"
        stroke={accent}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

function FlagTip({
  cx,
  w,
  h,
  colors,
  pointLeft,
  idSuffix,
}: {
  cx: number;
  w: number;
  h: number;
  colors: [string, string, string];
  pointLeft: boolean;
  idSuffix: string;
}) {
  const halfW = w / 2;
  const halfH = h / 2;
  const tip = pointLeft ? cx - halfW : cx + halfW;
  const flat = pointLeft ? cx + halfW : cx - halfW;
  const clipId = `kp-clip-${idSuffix}`;
  const stripeW = w / 3;
  const rects = [0, 1, 2].map((i) => {
    const x = pointLeft ? tip + i * stripeW : flat + i * stripeW;
    return (
      <rect
        key={i}
        x={x}
        y={-halfH}
        width={stripeW + 0.5}
        height={h}
        fill={colors[i]}
      />
    );
  });
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={`M ${tip} 0 L ${flat} ${-halfH} L ${flat} ${halfH} Z`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{rects}</g>
      <path
        d={`M ${tip} 0 L ${flat} ${-halfH} L ${flat} ${halfH} Z`}
        fill="none"
        stroke={PLATE}
        strokeWidth="1.5"
      />
    </g>
  );
}

function Ribbon({
  width,
  flag,
  suffix,
}: {
  width: number;
  flag: [string, string, string];
  suffix: string;
}) {
  const half = width / 2;
  const innerH = 22;
  const tagH = innerH / 2;
  const midHalf = half * 0.78;
  const tipExtraW = (half - midHalf) * 0.95;
  return (
    <g>
      <path
        d={`M ${-midHalf} 0 L ${-midHalf + 6} ${-tagH} L ${midHalf - 6} ${-tagH} L ${midHalf} 0 L ${midHalf - 6} ${tagH} L ${-midHalf + 6} ${tagH} Z`}
        fill={PLATE}
      />
      <FlagTip
        cx={-midHalf - tipExtraW / 2}
        w={tipExtraW}
        h={innerH}
        colors={flag}
        pointLeft
        idSuffix={`${suffix}L`}
      />
      <FlagTip
        cx={midHalf + tipExtraW / 2}
        w={tipExtraW}
        h={innerH}
        colors={[...flag].reverse() as [string, string, string]}
        pointLeft={false}
        idSuffix={`${suffix}R`}
      />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        fontFamily="'Archivo Black', Impact, sans-serif"
        fontSize="14"
        letterSpacing="1.6"
        fill="#fff"
      >
        "UIT LIEFDE VOOR DE KOERS"
      </text>
    </g>
  );
}

function shieldPath(inset: number) {
  const x = 20 + inset;
  const y = 110 + inset;
  const w = 320 - inset * 2;
  const h = 175 - inset * 2;
  const r = 26 - inset * 0.5;
  return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y}, ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h}, ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h}, ${x} ${y + h - r} V ${y + r} Q ${x} ${y}, ${x + r} ${y} Z`;
}

interface KoerspouleLogoProps {
  variant?: Variant;
  race?: RaceKey;
  className?: string;
  title?: string;
}

export default function KoerspouleLogo({
  variant = "wordmark",
  race = "giro",
  className,
  title = "Koerspoule",
}: KoerspouleLogoProps) {
  const t = THEMES[race];

  // Per render-instantie unieke clipPath-id-suffix om collisions te voorkomen
  // wanneer meerdere logo's op de pagina staan.
  const suffix = `${variant[0]}-${race}`;

  if (variant === "mark") {
    return (
      <svg
        viewBox="-110 -90 220 180"
        className={className}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <Cyclist accent={t.accent} dark={t.dark} scale={1.1} />
      </svg>
    );
  }

  if (variant === "sticker") {
    return (
      <svg
        viewBox="0 0 360 360"
        className={className}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <path d={shieldPath(0)} fill="#fff" />
        <path d={shieldPath(8)} fill={PLATE} />
        <g transform="translate(180, 100)">
          <Cyclist accent={t.accent} dark={t.dark} scale={0.85} />
        </g>
        <text
          x="180"
          y="245"
          textAnchor="middle"
          fontFamily="'Archivo Black', Impact, sans-serif"
          fontSize="56"
          letterSpacing="-1.5"
          fill="#fff"
        >
          <tspan fill={t.accent}>KOERS</tspan>
          <tspan>POULE</tspan>
        </text>
        <g transform="translate(180, 295)">
          <Ribbon width={300} flag={t.flag} suffix={`${suffix}-r`} />
        </g>
      </svg>
    );
  }

  // wordmark (default)
  return (
    <svg
      viewBox="0 0 1000 320"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect x="14" y="86" width="972" height="168" rx="26" fill="#fff" />
      <rect x="22" y="94" width="956" height="152" rx="22" fill={PLATE} />
      <text
        x="76"
        y="222"
        fontFamily="'Archivo Black', Impact, sans-serif"
        fontSize="138"
        letterSpacing="-4"
        fill={t.accent}
        stroke={t.dark}
        strokeWidth="2"
      >
        KOERS
      </text>
      <text
        x="600"
        y="222"
        fontFamily="'Archivo Black', Impact, sans-serif"
        fontSize="138"
        letterSpacing="-4"
        fill="#fff"
      >
        POULE
      </text>
      <g transform="translate(500, 75)">
        <Cyclist accent={t.accent} dark={t.dark} scale={1.15} />
      </g>
      <g transform="translate(500, 286)">
        <Ribbon width={780} flag={t.flag} suffix={`${suffix}-r`} />
      </g>
    </svg>
  );
}
