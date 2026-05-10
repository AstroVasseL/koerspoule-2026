import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, TrendingUp, Crown, Swords, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries, useStages, useStagePoints } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import TeamComparison from "@/components/TeamComparison";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  subpouleId: string;
  subpouleName: string;
};

// Bold contrasting palette for max distinguishability
const LINE_COLORS = [
  "#E6194B", "#3CB44B", "#4363D8", "#F58231",
  "#911EB4", "#42D4F4", "#F032E6", "#9A6324",
  "#469990", "#800000", "#808000", "#000075",
  "#FF6F00", "#00BFA5", "#C71585", "#1E88E5",
];

export default function SubpouleStandings({ subpouleId, subpouleName }: Props) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data: members = [], isLoading: membersLoading, error: membersError } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: stagePoints = [] } = useStagePoints(game?.id);

  // eslint-disable-next-line no-console
  console.log("[SubpouleStandings]", { subpouleId, membersLoading, membersCount: members.length, membersError });

  // Members → entries
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

  // Default highlight = current user, fallback to leader
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    if (highlightId) return;
    const me = memberRows.find((m) => m.user_id === user?.id);
    setHighlightId(me?.user_id ?? memberRows[0]?.user_id ?? null);
  }, [memberRows, user?.id, highlightId]);

  // Compare opponent
  const [compareId, setCompareId] = useState<string | null>(null);
  const compareMember = memberRows.find((m) => m.user_id === compareId);

  // Visibility per member (default: all visible)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const toggleVisible = (uid: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };
  const allHidden = memberRows.length > 0 && memberRows.every((m) => hiddenIds.has(m.user_id));
  const toggleAll = () => {
    if (allHidden) setHiddenIds(new Set());
    else setHiddenIds(new Set(memberRows.map((m) => m.user_id)));
  };
  // Build per-stage ranking data: x = stage, value per member = rank (1=best)
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
      const deltas = new Map<string, number>();
      for (const m of memberRows) {
        const prev = cumulative.get(m.user_id) ?? 0;
        const got = m.entry_id ? ptsByEntryStage.get(m.entry_id)?.get(stage.id) ?? 0 : 0;
        const next = prev + got;
        cumulative.set(m.user_id, next);
        deltas.set(m.user_id, got);
        row[`pts_${m.user_id}`] = next;
        row[`delta_${m.user_id}`] = got;
      }
      // Rank by cumulative pts desc; ties share rank
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

  // Determine current/latest stage = highest stage_number with any points
  const currentStageLabel = useMemo(() => {
    if (chartData.length === 0) return null;
    const stagesWithPts = new Set<number>();
    const stageById = new Map(stages.map((s) => [s.id, s.stage_number]));
    for (const sp of stagePoints) {
      const n = stageById.get(sp.stage_id);
      if (n !== undefined && (sp.points ?? 0) !== 0) stagesWithPts.add(n);
    }
    if (stagesWithPts.size === 0) return null;
    const latest = Math.max(...stagesWithPts);
    return `E${latest}`;
  }, [chartData, stages, stagePoints]);

  if (membersLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Klassement laden…</CardContent>
      </Card>
    );
  }
  if (memberRows.length === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Nog geen leden in deze subpoule.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Standings table */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Subpoule klassement — {subpouleName}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {memberRows.map((m, idx) => {
              const isMe = m.user_id === user?.id;
              const isHighlighted = m.user_id === highlightId;
              const isComparing = m.user_id === compareId;
              const colorIdx = memberRows.findIndex((r) => r.user_id === m.user_id) % LINE_COLORS.length;
              return (
                <div
                  key={m.user_id}
                  className={cn(
                    "p-3 flex items-center justify-between gap-3 transition-colors",
                    isHighlighted && "bg-primary/10",
                    isComparing && "bg-accent/10"
                  )}
                >
                  <button
                    onClick={() => setHighlightId(m.user_id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80"
                  >
                    <span className="font-display text-lg font-bold w-6 text-center text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: LINE_COLORS[colorIdx] }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate text-slate-800">{m.display_name}</span>
                        {idx === 0 && <Crown className="h-3 w-3 text-primary" />}
                        {isMe && (
                          <Badge variant="outline" className="text-xs">jij</Badge>
                        )}
                        {!m.entry_id && (
                          <Badge variant="secondary" className="text-xs">geen team</Badge>
                        )}
                      </div>
                      {m.team_name && (
                        <div className="text-xs text-muted-foreground truncate">{m.team_name}</div>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="font-display font-bold text-lg tabular-nums">
                      {m.total_points}
                      <span className="text-xs font-normal text-muted-foreground ml-1">pt</span>
                    </div>
                    <button
                      onClick={() => toggleVisible(m.user_id)}
                      className={cn(
                        "p-1.5 rounded border border-border hover:bg-secondary transition-colors",
                        hiddenIds.has(m.user_id) ? "opacity-50" : "bg-secondary/40"
                      )}
                      title={hiddenIds.has(m.user_id) ? "Toon in grafiek" : "Verberg uit grafiek"}
                    >
                      {hiddenIds.has(m.user_id)
                        ? <EyeOff className="h-3.5 w-3.5" />
                        : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    {!isMe && m.entry_id && (
                      <button
                        onClick={() => setCompareId(isComparing ? null : m.user_id)}
                        className={cn(
                          "p-1.5 rounded border border-border hover:bg-accent/20 transition-colors",
                          isComparing && "bg-accent/30 border-accent"
                        )}
                        title={isComparing ? "Vergelijking sluiten" : "Vergelijk met jouw team"}
                      >
                        <Swords className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Head-to-head comparison: alleen zichtbaar zodra de koers live is */}
      {compareMember && ["live", "locked", "finished", "closed"].includes(String(game?.status ?? "")) && (
        <TeamComparison
          opponentUserId={compareMember.user_id}
          opponentName={compareMember.display_name}
          subpouleId={subpouleId}
        />
      )}

      {/* Per-stage cumulative line chart — premium dashboard look */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)" }}
        />
        {/* Subtle grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
                Live performance
              </div>
              <h3 className="mt-1 font-display text-xl sm:text-2xl text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Verloop per etappe
              </h3>
              <p className="text-xs text-white/50 mt-1">
                Cumulatieve punten · klik op een naam om te markeren
              </p>
            </div>
            <button
              onClick={toggleAll}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/25 backdrop-blur-md transition-all"
            >
              {allHidden ? "Toon alles" : "Verberg alles"}
            </button>
          </div>

          {/* Legend pills */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {memberRows.map((m, idx) => {
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
                    "group flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border backdrop-blur-md transition-all",
                    visible
                      ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:border-white/30"
                      : "border-white/5 bg-white/[0.02] text-white/30 hover:text-white/60",
                    isHighlighted && visible && "ring-1 ring-white/40 bg-white/10"
                  )}
                  title={visible ? "Dubbelklik om te verbergen" : "Klik om te tonen"}
                >
                  <span
                    className="h-2 w-2 rounded-full transition-all"
                    style={{
                      backgroundColor: visible ? color : "transparent",
                      border: visible ? "none" : `1.5px solid ${color}`,
                      boxShadow: isHighlighted && visible ? `0 0 8px ${color}` : "none",
                    }}
                  />
                  <span className="truncate max-w-[110px]">{m.display_name}</span>
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div className="mt-5">
            {chartData.length === 0 ? (
              <div className="text-sm text-white/50 py-12 text-center">
                Nog geen etappes beschikbaar.
              </div>
            ) : (
              <div className={cn("w-full", isMobile ? "h-72" : "h-[420px]")}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 20, right: isMobile ? 8 : 24, left: -8, bottom: 4 }}
                  >
                    <defs>
                      {memberRows.map((m, idx) => {
                        const color = LINE_COLORS[idx % LINE_COLORS.length];
                        return (
                          <filter key={`glow-${m.user_id}`} id={`glow-${m.user_id}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        );
                      })}
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray="0"
                    />
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(255,255,255,0.45)", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      interval={isMobile && chartData.length > 10 ? 1 : 0}
                      padding={{ left: 12, right: 12 }}
                      dy={6}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(255,255,255,0.4)", fontWeight: 500 }}
                      width={40}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, (dataMax: number) => {
                        const max = Math.max(10, Math.ceil(dataMax || 0));
                        const step = max <= 50 ? 10 : max <= 100 ? 20 : max <= 500 ? 50 : max <= 1000 ? 100 : 200;
                        return Math.ceil(max / step) * step;
                      }]}
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
                      cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1, strokeDasharray: "3 4" }}
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
                            className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl text-xs text-white/90 overflow-hidden"
                            style={{ padding: "10px 12px", maxWidth: 280 }}
                          >
                            <div className="font-display font-semibold text-sm mb-2 text-white flex items-baseline gap-1.5">
                              <span className="text-[10px] uppercase tracking-widest text-white/40">Etappe</span>
                              <span>{String(label).replace("E", "")}</span>
                              {stageName && (
                                <span className="text-[11px] text-white/50 truncate font-normal">· {stageName}</span>
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
                                      isMe && "bg-white/10"
                                    )}
                                  >
                                    <span
                                      className="h-2 w-2 rounded-full shrink-0"
                                      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
                                    />
                                    <span className="w-5 tabular-nums text-white/40 text-[10px]">#{rank}</span>
                                    <span className={cn("truncate flex-1", isMe ? "font-semibold text-white" : "text-white/80")}>
                                      {m.display_name}
                                    </span>
                                    <span className="tabular-nums font-medium text-white">{pts}</span>
                                    {delta > 0 && (
                                      <span className="tabular-nums text-emerald-400 text-[10px] font-semibold">+{delta}</span>
                                    )}
                                  </div>
                                );
                              })}
                              {sorted.length > 8 && (
                                <div className="text-[10px] text-white/40 pt-1 text-center">+{sorted.length - 8} meer</div>
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
                          strokeOpacity={dimmed ? 0.35 : 1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter={isHighlighted ? `url(#glow-${m.user_id})` : undefined}
                          dot={false}
                          activeDot={{
                            r: isHighlighted ? 6 : 4,
                            strokeWidth: 2,
                            stroke: "rgba(15,23,42,0.95)",
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

          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/30">
            <span className="h-px w-8 bg-white/20" />
            <span>Cumulatieve punten</span>
            <span className="h-px w-8 bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
