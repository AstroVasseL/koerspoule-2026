import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Lock, Activity, Mountain, Clock } from "lucide-react";
import type { StageRow } from "@/hooks/useResults";

const TYPE_GRAD: Record<string, string> = {
  vlak: "from-emerald-400 to-emerald-600",
  heuvelachtig: "from-amber-400 to-amber-600",
  bergop: "from-rose-500 to-rose-700",
  tijdrit: "from-sky-400 to-sky-600",
  ploegentijdrit: "from-violet-400 to-violet-600",
};

const TYPE_ICON: Record<string, JSX.Element> = {
  vlak: <Activity className="w-3 h-3" />,
  heuvelachtig: <Mountain className="w-3 h-3" />,
  bergop: <Mountain className="w-3 h-3" />,
  tijdrit: <Clock className="w-3 h-3" />,
  ploegentijdrit: <Clock className="w-3 h-3" />,
};

export interface StageBarsProps {
  stages: StageRow[];
  /** points per stage (e.g. user's stage points). Keyed by stage.id */
  pointsByStageId?: Map<string, number> | Record<string, number>;
  selectedStageId?: string;
  onSelectStage?: (stage: StageRow) => void;
  /** Lock the GC bar until this is true */
  gcUnlocked?: boolean;
  /** Visual height of the bar track in px */
  trackHeight?: number;
  className?: string;
  /** Show points row beneath the bars */
  showPoints?: boolean;
  emptyLabel?: string;
}

/**
 * Reusable premium "RankingBar" — vertical bars per stage scaled by distance_km.
 * Used in: Klassement-tab, Etappes-tab, Mijn Peloton → Punten per etappe.
 * GC stages render as a trophy column instead of a bar.
 */
export default function StageBars({
  stages,
  pointsByStageId,
  selectedStageId,
  onSelectStage,
  gcUnlocked = false,
  trackHeight = 140,
  className,
  showPoints = true,
  emptyLabel = "Nog geen etappes",
}: StageBarsProps) {
  const getPts = (id: string): number => {
    if (!pointsByStageId) return 0;
    if (pointsByStageId instanceof Map) return pointsByStageId.get(id) ?? 0;
    return pointsByStageId[id] ?? 0;
  };

  const maxKm = useMemo(
    () => stages.reduce((m, s) => (s.distance_km && s.distance_km > m ? s.distance_km : m), 0),
    [stages]
  );
  const maxPts = useMemo(
    () => stages.reduce((m, s) => Math.max(m, getPts(s.id)), 0),
    [stages, pointsByStageId]
  );

  if (stages.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground italic">{emptyLabel}</div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-3 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "thin" }}
      >
        {stages.map((s) => {
          const pts = getPts(s.id);
          const isSelected = s.id === selectedStageId;
          const isGc = s.is_gc;
          const locked = isGc && !gcUnlocked;
          const km = s.distance_km ?? 0;
          const heightPct = !isGc && maxKm > 0 ? Math.max((km / maxKm) * 100, 6) : 100;
          const ptsIntensity = maxPts > 0 ? pts / maxPts : 0;

          const grad = TYPE_GRAD[s.stage_type ?? "vlak"] ?? "from-primary to-primary";

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => !locked && onSelectStage?.(s)}
              disabled={locked}
              title={
                isGc
                  ? locked
                    ? "GC vergrendeld tot fiat etappe 21"
                    : "Eindklassement (GC)"
                  : `Rit ${s.stage_number}${s.name ? ` — ${s.name}` : ""}${km ? ` · ${km} km` : ""}${
                      pts ? ` · ${pts} pt` : ""
                    }`
              }
              className={cn(
                "snap-start group relative shrink-0 flex flex-col items-center justify-end",
                "w-10 sm:w-12 rounded-lg p-1 transition-all duration-300 ease-out",
                "hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected && "bg-primary/10 ring-2 ring-primary shadow-lg shadow-primary/20",
                !isSelected && "hover:bg-secondary/60",
                locked && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Bar track */}
              <div
                className="relative w-full flex items-end justify-center"
                style={{ height: trackHeight }}
              >
                {/* Subtle baseline */}
                <div className="absolute inset-x-1 bottom-0 top-0 rounded-md bg-secondary/40" />

                {isGc ? (
                  <div
                    className={cn(
                      "relative w-full rounded-md flex flex-col items-center justify-center gap-1",
                      "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600",
                      "shadow-md shadow-amber-500/30",
                      "transition-transform duration-300 group-hover:scale-[1.03]"
                    )}
                    style={{ height: "100%" }}
                  >
                    {locked ? (
                      <Lock className="w-4 h-4 text-amber-900/80" />
                    ) : (
                      <Trophy className="w-5 h-5 text-amber-950 drop-shadow-sm" />
                    )}
                    <span className="text-[9px] font-extrabold tracking-widest text-amber-950">
                      GC
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "relative w-full rounded-md bg-gradient-to-t shadow-sm",
                      "transition-[height,transform,box-shadow] duration-500 ease-out",
                      grad,
                      "group-hover:shadow-md group-hover:shadow-primary/20",
                      isSelected && "shadow-lg"
                    )}
                    style={{ height: `${heightPct}%` }}
                  >
                    {/* Glow accent when there are points */}
                    {pts > 0 && (
                      <div
                        className="absolute inset-x-0 top-0 h-1 rounded-t-md bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200"
                        style={{ opacity: 0.4 + ptsIntensity * 0.6 }}
                      />
                    )}
                    {/* Type icon at top of bar */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center text-foreground/70 shadow-sm">
                      {TYPE_ICON[s.stage_type ?? "vlak"] ?? <Activity className="w-3 h-3" />}
                    </div>
                  </div>
                )}
              </div>

              {/* Stage label */}
              <div className="mt-2 text-[10px] font-mono font-bold tabular-nums text-foreground/80">
                {isGc ? "GC" : s.stage_number}
              </div>

              {/* Points pill */}
              {showPoints && (
                <div
                  className={cn(
                    "mt-0.5 min-h-[18px] flex items-center justify-center text-[10px] font-bold tabular-nums leading-none transition-all duration-300",
                    pts > 0
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground/50"
                  )}
                >
                  {isGc ? (
                    <Trophy className="w-3 h-3 text-amber-500" />
                  ) : pts > 0 ? (
                    <span className="inline-flex items-center gap-0.5">
                      <span className="text-amber-500">🟡</span>
                      {pts}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
              )}

              {/* km hint on hover */}
              {!isGc && km > 0 && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-foreground text-background text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {km} km
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
