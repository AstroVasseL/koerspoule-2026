import { useMemo } from "react";
import { Activity, Mountain, Clock, TrendingUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = "vlak" | "heuvel" | "berg" | "tijdrit";

const PROFILE_META: Record<Profile, { label: string; icon: JSX.Element; hue: number }> = {
  vlak:    { label: "Vlak",    icon: <Activity className="h-3.5 w-3.5" />, hue: 142 },
  heuvel:  { label: "Heuvel",  icon: <Mountain className="h-3.5 w-3.5" />, hue: 38 },
  berg:    { label: "Berg",    icon: <Mountain className="h-3.5 w-3.5" />, hue: 0 },
  tijdrit: { label: "Tijdrit", icon: <Clock className="h-3.5 w-3.5" />,    hue: 210 },
};

// Realistic Giro 2026 stage profile distribution (21 stages).
const STAGE_PROFILES: Profile[] = [
  "vlak", "vlak", "heuvel", "tijdrit", "vlak",
  "heuvel", "vlak", "berg", "berg", "vlak",
  "heuvel", "vlak", "tijdrit", "berg", "berg",
  "vlak", "berg", "heuvel", "berg", "tijdrit",
  "vlak",
];

// Deterministic pseudo-intensity 0..1 per (profile × stage), so the heatmap
// looks "realistic" without random flicker between renders.
function intensity(profile: Profile, stageIdx: number): number {
  const seed = (profile.charCodeAt(0) * 31 + stageIdx * 17) % 100;
  const baseline = profile === STAGE_PROFILES[stageIdx] ? 0.85 : 0.18;
  const wobble = (Math.sin(seed) + 1) / 2; // 0..1
  return Math.max(0, Math.min(1, baseline + (wobble - 0.5) * 0.35));
}

type Props = {
  className?: string;
  /** Optional: render a smaller variant for previews */
  compact?: boolean;
};

/**
 * Giro d'Italia 2026 race-intensity heatmap.
 * Rows = profile types (vlak / heuvel / berg / tijdrit).
 * Columns = 21 etappes.
 * Cell darkness = expected raceactiviteit voor dat profiel op die etappe.
 *
 * Pure presentational: no data fetching. Drop in anywhere.
 */
export default function GiroHeatmap({ className, compact = false }: Props) {
  const rows = useMemo(() => (Object.keys(PROFILE_META) as Profile[]), []);
  const stages = useMemo(() => Array.from({ length: 21 }, (_, i) => i + 1), []);

  const cellSize = compact ? "h-5 sm:h-6" : "h-6 sm:h-7";
  const labelWidth = compact ? "w-20" : "w-24";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10",
        "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
        "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-60 w-60 rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-60 w-60 rounded-full blur-3xl opacity-15"
        style={{ background: "radial-gradient(circle, hsl(var(--vintage-gold)) 0%, transparent 70%)" }}
      />

      <div className={cn("relative", compact ? "p-4" : "p-5 sm:p-6")}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
              <Flame className="h-3 w-3 text-rose-400" />
              Giro 2026 · race intensity
            </div>
            <h3 className={cn("mt-1 font-display text-white flex items-center gap-2", compact ? "text-base" : "text-lg sm:text-xl")}>
              <TrendingUp className="h-4 w-4 text-primary" />
              Heatmap per profiel
            </h3>
            <p className="text-[11px] text-white/50 mt-0.5">
              Verwachte raceactiviteit per etappe-profiel · donker = hoge intensiteit
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/50">
            <span>laag</span>
            <div className="flex h-3 w-20 rounded-sm overflow-hidden border border-white/10">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{ background: `hsl(0 0% ${100 - v * 70}% / ${0.15 + v * 0.7})` }}
                />
              ))}
            </div>
            <span>hoog</span>
          </div>
        </div>

        {/* Heatmap grid */}
        <div className="space-y-1">
          {/* X-axis: stage numbers */}
          <div className="flex items-center gap-1">
            <div className={cn("shrink-0 text-[9px] text-white/30", labelWidth)}>Etappe</div>
            <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
              {stages.map((n) => (
                <div
                  key={n}
                  className="text-center text-[8px] sm:text-[9px] tabular-nums text-white/40 font-mono"
                >
                  {n}
                </div>
              ))}
            </div>
          </div>

          {rows.map((profile) => {
            const meta = PROFILE_META[profile];
            return (
              <div key={profile} className="flex items-center gap-1">
                <div
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-white/80 font-medium",
                    labelWidth
                  )}
                >
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: `hsl(${meta.hue} 70% 50% / 0.25)`, color: `hsl(${meta.hue} 80% 70%)` }}
                  >
                    {meta.icon}
                  </span>
                  <span className="truncate">{meta.label}</span>
                </div>
                <div
                  className="flex-1 grid gap-[2px]"
                  style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
                >
                  {stages.map((n, i) => {
                    const v = intensity(profile, i);
                    const isPrimary = STAGE_PROFILES[i] === profile;
                    const lightness = 90 - v * 65; // 25..90
                    const saturation = isPrimary ? 65 : 25;
                    return (
                      <div
                        key={n}
                        className={cn(
                          cellSize,
                          "rounded-sm transition-transform hover:scale-110 hover:z-10 relative cursor-default",
                          isPrimary && "ring-1 ring-white/20"
                        )}
                        style={{
                          background: `hsl(${meta.hue} ${saturation}% ${lightness}% / ${0.25 + v * 0.7})`,
                        }}
                        title={`Etappe ${n} · ${meta.label} · intensiteit ${Math.round(v * 100)}%`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/30">
          <span className="h-px w-8 bg-white/20" />
          <span>21 etappes · 4 profielen</span>
          <span className="h-px w-8 bg-white/20" />
        </div>
      </div>
    </div>
  );
}
