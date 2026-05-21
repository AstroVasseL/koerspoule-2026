import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type StagePoint = { stage_id: string; points: number };
type StageRow = { id: string; stage_number: number; results_status: string | null; name?: string | null };

type FormLevel = {
  key: "topvorm" | "in-vorm" | "stabiel" | "minder" | "zwart";
  label: string;
  tagline: string;
  Icon: typeof TrendingUp;
  color: string;
  borderColor: string;
  bg: string;
};

const LEVELS: Record<FormLevel["key"], FormLevel> = {
  topvorm: {
    key: "topvorm",
    label: "In topvorm",
    tagline: "Wat een grinta — alles loopt op rolletjes.",
    Icon: Flame,
    color: "text-[hsl(var(--maillot-jaune-dark))]",
    borderColor: "border-[hsl(var(--maillot-jaune))/0.7]",
    bg: "bg-[hsl(var(--maillot-jaune))/0.12]",
  },
  "in-vorm": {
    key: "in-vorm",
    label: "In vorm",
    tagline: "Je punten lopen voor op je gemiddelde.",
    Icon: TrendingUp,
    color: "text-[hsl(var(--maillot-groen))]",
    borderColor: "border-[hsl(var(--maillot-groen))/0.5]",
    bg: "bg-[hsl(var(--maillot-groen))/0.08]",
  },
  stabiel: {
    key: "stabiel",
    label: "Stabiel",
    tagline: "Soepele tred — je rijdt op je eigen niveau.",
    Icon: Minus,
    color: "text-muted-foreground",
    borderColor: "border-foreground/20",
    bg: "bg-muted/30",
  },
  minder: {
    key: "minder",
    label: "Mindere periode",
    tagline: "Tijdelijk dipje — herpak je voor de volgende etappe.",
    Icon: TrendingDown,
    color: "text-[hsl(var(--bolletjes-bright))]",
    borderColor: "border-[hsl(var(--bolletjes-bright))/0.4]",
    bg: "bg-[hsl(var(--bolletjes-bright))/0.06]",
  },
  zwart: {
    key: "zwart",
    label: "Zwarte dagen",
    tagline: "Je peren laten zien — even doorbijten.",
    Icon: TrendingDown,
    color: "text-[hsl(var(--bolletjes-bright))]",
    borderColor: "border-[hsl(var(--bolletjes-bright))/0.6]",
    bg: "bg-[hsl(var(--bolletjes-bright))/0.10]",
  },
};

function classifyForm(recentAvg: number, seasonAvg: number): FormLevel["key"] {
  if (seasonAvg <= 0) return "stabiel";
  const ratio = recentAvg / seasonAvg;
  if (ratio >= 1.4) return "topvorm";
  if (ratio >= 1.1) return "in-vorm";
  if (ratio >= 0.9) return "stabiel";
  if (ratio >= 0.7) return "minder";
  return "zwart";
}

export default function FormMeter({
  stagePoints,
  stages,
}: {
  stagePoints: StagePoint[];
  stages: StageRow[];
}) {
  const data = useMemo(() => {
    const stageById = new Map(stages.map((s) => [s.id, s]));
    const approved = stagePoints
      .map((sp) => {
        const stage = stageById.get(sp.stage_id);
        if (!stage || stage.results_status !== "approved") return null;
        return { stage_id: sp.stage_id, stage_number: stage.stage_number, name: stage.name ?? null, points: sp.points };
      })
      .filter((x): x is { stage_id: string; stage_number: number; name: string | null; points: number } => Boolean(x))
      .sort((a, b) => a.stage_number - b.stage_number);
    if (approved.length === 0) return null;

    const recent = approved.slice(-3);
    const recentAvg = recent.reduce((s, r) => s + r.points, 0) / recent.length;
    const seasonAvg = approved.reduce((s, r) => s + r.points, 0) / approved.length;
    const formKey = classifyForm(recentAvg, seasonAvg);
    const level = LEVELS[formKey];
    const diffPct = seasonAvg > 0 ? Math.round(((recentAvg - seasonAvg) / seasonAvg) * 100) : 0;

    return { recent, recentAvg, seasonAvg, level, diffPct, approvedCount: approved.length };
  }, [stagePoints, stages]);

  if (!data) return null;

  const { recent, recentAvg, seasonAvg, level, diffPct, approvedCount } = data;

  return (
    <div className={cn("relative rounded-lg border-2 overflow-hidden", level.borderColor, level.bg)}>
      <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
      <div className="p-3 md:p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <level.Icon className={cn("h-4 w-4 shrink-0", level.color)} />
            <span className="overline-stamp">Form-meter · laatste {recent.length}</span>
          </div>
          <span className={cn("font-display text-xs font-bold uppercase tracking-widest", level.color)}>
            {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className={cn("heading-oswald text-2xl md:text-3xl", level.color)}>{level.label}</span>
        </div>

        <p className="font-serif italic text-sm text-foreground/80 mb-3 leading-snug">
          {level.tagline}
        </p>

        {/* Tegels — laatste etappes naast elkaar */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {Array.from({ length: 3 }).map((_, i) => {
            const r = recent[recent.length - 3 + i] ?? null;
            if (!r) {
              return (
                <div key={i} className="rounded border border-dashed border-foreground/15 bg-background/30 px-2 py-2 text-center">
                  <span className="overline-stamp text-muted-foreground/50">—</span>
                </div>
              );
            }
            return (
              <div
                key={r.stage_id}
                className="rounded border border-foreground/15 bg-background/60 px-2 py-2 text-center"
              >
                <div className="overline-stamp">E{r.stage_number}</div>
                <div className="font-display font-bold text-lg tabular-nums leading-tight">{r.points}</div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">pt</div>
              </div>
            );
          })}
        </div>

        {/* Mini-explainer */}
        <p className="text-[10px] font-serif italic text-muted-foreground">
          Gemiddelde laatste {recent.length}: <span className="font-bold tabular-nums">{recentAvg.toFixed(1)}</span> pt · seizoensgemiddelde over {approvedCount} etappe{approvedCount === 1 ? "" : "s"}: <span className="font-bold tabular-nums">{seasonAvg.toFixed(1)}</span> pt
        </p>
      </div>
    </div>
  );
}
