import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries, useStages, useStagePoints } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import { useIsMobile } from "@/hooks/use-mobile";

// Bold contrasting palette for max distinguishability — must match SubpouleStandings.
export const LINE_COLORS = [
  "#E6194B", "#3CB44B", "#4363D8", "#F58231",
  "#911EB4", "#42D4F4", "#F032E6", "#9A6324",
  "#469990", "#800000", "#808000", "#000075",
  "#FF6F00", "#00BFA5", "#C71585", "#1E88E5",
];

type Props = {
  subpouleId: string;
  /** Compact mode: smaller header, smaller chart, fewer legend pills shown */
  compact?: boolean;
  /** Optional title override */
  title?: string;
  /** Optional subtitle override */
  subtitle?: string;
  className?: string;
};

/**
 * Premium dark "etappe-evolutie" line chart for subpoules.
 * Extracted from SubpouleStandings so it can be reused on the homepage preview.
 */
export default function SubpouleEvolutionChart({
  subpouleId,
  compact = false,
  title = "Verloop per etappe",
  subtitle = "Cumulatieve punten · klik op een naam om te markeren",
  className,
}: Props) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data: members = [] } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: stagePoints = [] } = useStagePoints(game?.id);

  const memberRows = useMemo(() => {
    return members
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return {
          user_id: m.user_id,
          display_name: m.display_name,
          team_name: entry?.team_name ?? null,
          entry_id: entry?.id ?? null,
          total_points: entry?.total_points ?? 0,
        };
      })
      .sort((a, b) => b.total_points - a.total_points);
  }, [members, entries]);

  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    if (highlightId) return;
    const me = memberRows.find((m) => m.user_id === user?.id);
    setHighlightId(me?.user_id ?? memberRows[0]?.user_id ?? null);
  }, [memberRows, user?.id, highlightId]);

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const toggleVisible = (uid: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };
  const allHidden =
    memberRows.length > 0 && memberRows.every((m) => hiddenIds.has(m.user_id));
  const toggleAll = () => {
    if (allHidden) setHiddenIds(new Set());
    else setHiddenIds(new Set(memberRows.map((m) => m.user_id)));
  };

  const chartData = useMemo(() => {
    const sortedStages = [...stages].sort((a, b) => a.stage_number - b.stage_number);
    if (sortedStages.length === 0) return [];

    const ptsByEntryStage = new Map<string, Map<string, number>>();
    for (const sp of stagePoints) {
      if (!ptsByEntryStage.has(sp.entry_id)) ptsByEntryStage.set(sp.entry_id, new Map());
      ptsByEntryStage.get(sp.entry_id)!.set(sp.stage_id, sp.points);
    }

    const cumulative = new Map<string, number>();
    return sortedStages.map((stage) => {
      const row: Record<string, number | string> = {
        stage: `E${stage.stage_number}`,
        stageNumber: stage.stage_number,
        stageName: stage.name ?? "",
      };
      for (const m of memberRows) {
        const prev = cumulative.get(m.user_id) ?? 0;
        const got = m.entry_id ? ptsByEntryStage.get(m.entry_id)?.get(stage.id) ?? 0 : 0;
        const next = prev + got;
        cumulative.set(m.user_id, next);
        row[`pts_${m.user_id}`] = next;
        row[`delta_${m.user_id}`] = got;
      }
      const sorted = [...memberRows]
        .map((m) => ({ id: m.user_id, pts: cumulative.get(m.user_id) ?? 0 }))
        .sort((a, b) => b.pts - a.pts);
      let lastPts = -Infinity;
      let lastRank = 0;
      sorted.forEach((s, i) => {
        const rank = s.pts === lastPts ? lastRank : i + 1;
        lastPts = s.pts;
        lastRank = rank;
        row[`rank_${s.id}`] = rank;
      });
      return row;
    });
  }, [stages, stagePoints, memberRows]);

  const currentStageLabel = useMemo(() => {
    if (chartData.length === 0) return null;
    const stagesWithPts = new Set<number>();
    const stageById = new Map(stages.map((s) => [s.id, s.stage_number]));
    for (const sp of stagePoints) {
      const n = stageById.get(sp.stage_id);
      if (n !== undefined && (sp.points ?? 0) !== 0) stagesWithPts.add(n);
    }
    if (stagesWithPts.size === 0) return null;
    return `E${Math.max(...stagesWithPts)}`;
  }, [chartData, stages, stagePoints]);

  const chartHeight = compact ? (isMobile ? 220 : 260) : isMobile ? 288 : 420;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border",
        "shadow-sm",
        className
      )}
      style={{ background: "hsl(var(--bg-wielerdirecteur))" }}
    >
      <div className={cn("relative", compact ? "p-4" : "p-5 sm:p-6")}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgba(52,211,153,0.4)]" />
              Live performance
            </div>
            <h3
              className={cn(
                "mt-1 font-display text-foreground flex items-center gap-2",
                compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
              )}
            >
              <TrendingUp className={compact ? "h-4 w-4 text-primary" : "h-5 w-5 text-primary"} />
              {title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {memberRows.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:border-foreground/20 transition-all"
            >
              {allHidden ? "Toon alles" : "Verberg alles"}
            </button>
          )}
        </div>

        {/* Legend pills */}
        {memberRows.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(compact ? memberRows.slice(0, 8) : memberRows).map((m, idx) => {
              const color = LINE_COLORS[idx % LINE_COLORS.length];
              const visible = !hiddenIds.has(m.user_id);
              const isHighlighted = m.user_id === highlightId;
              return (
                <button
                  key={m.user_id}
                  onClick={() => {
                    setHighlightId(m.user_id);
                    if (!visible) toggleVisible(m.user_id);
                  }}
                  onDoubleClick={() => toggleVisible(m.user_id)}
                  className={cn(
                    "group flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all",
                    visible
                      ? "border-border bg-secondary/50 text-foreground/90 hover:bg-secondary hover:border-foreground/20"
                      : "border-border/30 bg-secondary/20 text-muted-foreground/40 hover:text-muted-foreground",
                    isHighlighted && visible && "ring-1 ring-foreground/20 bg-secondary"
                  )}
                  title={visible ? "Dubbelklik om te verbergen" : "Klik om te tonen"}
                >
                  <span
                    className="h-2 w-2 rounded-full transition-all"
                    style={{
                      backgroundColor: visible ? color : "transparent",
                      border: visible ? "none" : `1.5px solid ${color}`,
                      boxShadow: isHighlighted && visible ? `0 0 6px ${color}` : "none",
                    }}
                  />
                  <span className="truncate max-w-[110px]">{m.display_name}</span>
                </button>
              );
            })}
            {compact && memberRows.length > 8 && (
              <span className="text-[10px] text-muted-foreground/60 self-center px-1">
                +{memberRows.length - 8}
              </span>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="mt-4">
          {chartData.length === 0 || memberRows.length === 0 ? (
            <div
              className="flex items-center justify-center text-sm text-muted-foreground italic"
              style={{ height: chartHeight }}
            >
              Nog geen etappes beschikbaar.
            </div>
          ) : (
            <div className="w-full" style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: isMobile ? 8 : 24, left: -8, bottom: 4 }}
                >
                  <defs>
                    {memberRows.map((m) => (
                      <filter
                        key={`glow-${m.user_id}`}
                        id={`glow-${m.user_id}`}
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                      >
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    ))}
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.07)" />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(0,0,0,0.45)", fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    interval={isMobile && chartData.length > 10 ? 1 : 0}
                    padding={{ left: 12, right: 12 }}
                    dy={6}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(0,0,0,0.4)", fontWeight: 500 }}
                    width={40}
                    axisLine={false}
                    tickLine={false}
                    domain={[
                      0,
                      (dataMax: number) => {
                        const max = Math.max(10, Math.ceil(dataMax || 0));
                        const step =
                          max <= 50 ? 10 : max <= 100 ? 20 : max <= 500 ? 50 : max <= 1000 ? 100 : 200;
                        return Math.ceil(max / step) * step;
                      },
                    ]}
                    tickCount={isMobile ? 5 : 6}
                  />
                  {currentStageLabel && (
                    <ReferenceLine
                      x={currentStageLabel}
                      stroke="hsl(var(--primary))"
                      strokeWidth={1}
                      strokeDasharray="3 4"
                      strokeOpacity={0.6}
                      label={{
                        value: "NU",
                        position: "top",
                        fill: "hsl(var(--primary))",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}
                    />
                  )}
                  <Tooltip
                    cursor={{ stroke: "rgba(0,0,0,0.15)", strokeWidth: 1, strokeDasharray: "3 4" }}
                    content={(props: any) => {
                      const { active, payload, label } = props;
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as Record<string, any>;
                      const visibleMembers = memberRows.filter((m) => !hiddenIds.has(m.user_id));
                      const sorted = [...visibleMembers].sort(
                        (a, b) => (row[`rank_${a.user_id}`] ?? 999) - (row[`rank_${b.user_id}`] ?? 999)
                      );
                      const stageName = row.stageName as string;
                      return (
                        <div
                          className="rounded-xl border border-border bg-card/95 shadow-lg text-xs text-foreground/90 overflow-hidden"
                          style={{ padding: "10px 12px", maxWidth: 280 }}
                        >
                          <div className="font-display font-semibold text-sm mb-2 text-foreground flex items-baseline gap-1.5">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Etappe
                            </span>
                            <span>{String(label).replace("E", "")}</span>
                            {stageName && (
                              <span className="text-[11px] text-muted-foreground truncate font-normal">
                                · {stageName}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {sorted.slice(0, 8).map((m) => {
                              const idx = memberRows.findIndex((r) => r.user_id === m.user_id);
                              const color = LINE_COLORS[idx % LINE_COLORS.length];
                              const rank = row[`rank_${m.user_id}`];
                              const pts = row[`pts_${m.user_id}`] ?? 0;
                              const delta = row[`delta_${m.user_id}`] ?? 0;
                              const isMe = m.user_id === user?.id;
                              return (
                                <div
                                  key={m.user_id}
                                  className={cn(
                                    "flex items-center gap-2 py-0.5 px-1 -mx-1 rounded",
                                    isMe && "bg-secondary/60"
                                  )}
                                >
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="w-5 tabular-nums text-muted-foreground/60 text-[10px]">
                                    #{rank}
                                  </span>
                                  <span
                                    className={cn(
                                      "truncate flex-1",
                                      isMe ? "font-semibold text-foreground" : "text-foreground/80"
                                    )}
                                  >
                                    {m.display_name}
                                  </span>
                                  <span className="tabular-nums font-medium text-foreground">{pts}</span>
                                  {delta > 0 && (
                                    <span className="tabular-nums text-emerald-600 text-[10px] font-semibold">
                                      +{delta}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {sorted.length > 8 && (
                              <div className="text-[10px] text-muted-foreground/60 pt-1 text-center">
                                +{sorted.length - 8} meer
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {memberRows.map((m, idx) => {
                    if (hiddenIds.has(m.user_id)) return null;
                    const color = LINE_COLORS[idx % LINE_COLORS.length];
                    const isHighlighted = m.user_id === highlightId;
                    const dimmed = highlightId && !isHighlighted;
                    return (
                      <Line
                        key={m.user_id}
                        type="monotone"
                        dataKey={`pts_${m.user_id}`}
                        name={m.user_id}
                        stroke={color}
                        strokeWidth={isHighlighted ? 3 : 1.75}
                        strokeOpacity={dimmed ? 0.25 : 1}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter={isHighlighted ? `url(#glow-${m.user_id})` : undefined}
                        dot={false}
                        activeDot={{
                          r: isHighlighted ? 6 : 4,
                          strokeWidth: 2,
                          stroke: "hsl(var(--bg-wielerdirecteur))",
                          fill: color,
                        }}
                        animationDuration={700}
                        animationEasing="ease-out"
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
          <span className="h-px w-8 bg-foreground/15" />
          <span>Cumulatieve punten</span>
          <span className="h-px w-8 bg-foreground/15" />
        </div>
      </div>
    </div>
  );
}
