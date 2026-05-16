import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Swords, ArrowUp, ArrowDown, Flag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries, useStages, useStagePoints } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import TeamComparison from "@/components/TeamComparison";
import SubpouleEvolutionChart from "@/components/SubpouleEvolutionChart";
import StageBars from "@/components/StageBars";
import { cn } from "@/lib/utils";

type Props = {
  subpouleId: string;
  subpouleName: string;
};

function GapBadge({
  rank,
  gap,
  movement,
  aboveName,
}: {
  rank: number;
  gap: number | null;
  movement: number | null;
  aboveName: string | null;
}) {
  if (gap === null) return null;

  const isLeader = rank === 1;
  const gaining = movement !== null && (isLeader ? movement > 0 : movement < 0);
  const falling = movement !== null && (isLeader ? movement < 0 : movement > 0);
  const state: "up" | "down" | "flat" = gaining ? "up" : falling ? "down" : "flat";

  const palette = {
    up:   { background: "#D4EDDA", color: "#1E6B3C" },
    down: { background: "#FADBD8", color: "#922B21" },
    flat: { background: "#EAECEE", color: "#7A7A7A" },
  } as const;

  const movAbs = movement !== null ? Math.abs(movement) : null;
  const tooltip = aboveName
    ? isLeader
      ? `Voorsprong op ${aboveName}: ${gap} pt${movAbs !== null ? ` · ${gaining ? "+" : "-"}${movAbs} pt t.o.v. vorige rit` : ""}`
      : `Achterstand op ${aboveName}: ${gap} pt${movAbs !== null ? ` · ${gaining ? "ingelopen" : "verder achterop"} ${movAbs} pt` : ""}`
    : undefined;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        minWidth: "64px",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        border: "1px solid rgba(0,0,0,0.08)",
        ...palette[state],
      }}
      title={tooltip}
    >
      {state === "up"   && <ArrowUp   className="w-3 h-3 shrink-0" />}
      {state === "down" && <ArrowDown className="w-3 h-3 shrink-0" />}
      {state === "flat" && <span className="leading-none">—</span>}
      {gap}pt
    </span>
  );
}

export default function SubpouleStandings({ subpouleId, subpouleName }: Props) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data: members = [], isLoading: membersLoading } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: stagePoints = [] } = useStagePoints(game?.id);

  const [compareId, setCompareId] = useState<string | null>(null);
  const [etappeIdx, setEtappeIdx] = useState<number>(0);

  // Initialize to last stage with any points
  useEffect(() => {
    if (stages.length === 0) return;
    const totals = new Map<string, number>();
    stagePoints.forEach((sp) => totals.set(sp.stage_id, (totals.get(sp.stage_id) ?? 0) + sp.points));
    for (let i = stages.length - 1; i >= 0; i--) {
      if ((totals.get(stages[i].id) ?? 0) > 0) { setEtappeIdx(i); return; }
    }
  }, [stages.length, stagePoints.length]);

  const selectedEtappe = stages[etappeIdx];
  const gcUnlocked = stages.filter((x) => !x.is_gc).some((x) => x.stage_number === 21 && x.results_status === "approved");

  // My entry
  const myEntry = useMemo(() => entries.find((e) => e.user_id === user?.id), [entries, user?.id]);

  // My points per stage (drives StageBars bar highlight)
  const myPointsPerStage = useMemo(() => {
    if (!myEntry) return new Map<string, number>();
    const m = new Map<string, number>();
    stagePoints.filter((sp) => sp.entry_id === myEntry.id).forEach((sp) => m.set(sp.stage_id, (m.get(sp.stage_id) ?? 0) + sp.points));
    return m;
  }, [myEntry, stagePoints]);

  // My rank per stage among subpoule members (drives StageBars rank pill)
  const myRankPerStage = useMemo(() => {
    if (!myEntry) return new Map<string, number>();
    const memberEntryIds = new Set(
      members.map((m) => entries.find((e) => e.user_id === m.user_id)?.id).filter((id): id is string => id != null)
    );
    const perStage = new Map<string, Map<string, number>>();
    stagePoints
      .filter((sp) => memberEntryIds.has(sp.entry_id))
      .forEach((sp) => {
        if (!perStage.has(sp.stage_id)) perStage.set(sp.stage_id, new Map());
        const sm = perStage.get(sp.stage_id)!;
        sm.set(sp.entry_id, (sm.get(sp.entry_id) ?? 0) + sp.points);
      });
    const result = new Map<string, number>();
    perStage.forEach((entryPts, stageId) => {
      const myPts = entryPts.get(myEntry.id) ?? 0;
      if (myPts === 0) return;
      const sorted = [...entryPts.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([id]) => id === myEntry.id);
      if (idx >= 0) result.set(stageId, idx + 1);
    });
    return result;
  }, [myEntry, stagePoints, members, entries]);

  // Cumulative points up to a given stage index
  const cumUpTo = (upToIdx: number) => {
    if (upToIdx < 0) return new Map<string, number>();
    const allowed = new Set(stages.slice(0, upToIdx + 1).map((s) => s.id));
    const m = new Map<string, number>();
    stagePoints.filter((sp) => allowed.has(sp.stage_id)).forEach((sp) => m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points));
    return m;
  };

  // Member rows ranked by cumulative pts up to the selected stage
  const memberRows = useMemo(() => {
    if (stages.length === 0) {
      return members
        .map((m) => {
          const entry = entries.find((e) => e.user_id === m.user_id);
          return {
            user_id: m.user_id,
            display_name: m.display_name,
            team_name: entry?.team_name ?? null,
            entry_id: entry?.id ?? null,
            total_points: entry?.total_points ?? 0,
            stage_points: 0,
            stage_rank: null as number | null,
            rank: 0,
            delta: null as number | null,
            gap_to_above: null as number | null,
            gap_movement: null as number | null,
            above_name: null as string | null,
          };
        })
        .sort((a, b) => b.total_points - a.total_points)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }

    const curMap = cumUpTo(etappeIdx);
    const prevMap = etappeIdx > 0 ? cumUpTo(etappeIdx - 1) : new Map<string, number>();

    // Stage pts for the selected stage (used for ranking within subpoule)
    const selStagePts = new Map<string, number>();
    if (selectedEtappe) {
      stagePoints
        .filter((sp) => sp.stage_id === selectedEtappe.id)
        .forEach((sp) => selStagePts.set(sp.entry_id, (selStagePts.get(sp.entry_id) ?? 0) + sp.points));
    }

    // Stage rank within subpoule for the selected stage
    const stageRankByUser = new Map<string, number>();
    [...members]
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return { user_id: m.user_id, pts: entry ? (selStagePts.get(entry.id) ?? 0) : 0 };
      })
      .filter((r) => r.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .forEach((r, i) => stageRankByUser.set(r.user_id, i + 1));

    const prevRankByUser = new Map(
      [...members]
        .map((m) => {
          const entry = entries.find((e) => e.user_id === m.user_id);
          return { user_id: m.user_id, pts: entry ? (prevMap.get(entry.id) ?? 0) : 0 };
        })
        .sort((a, b) => b.pts - a.pts)
        .map((r, i) => [r.user_id, i + 1] as [string, number])
    );

    const rows = members
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return {
          user_id: m.user_id,
          display_name: m.display_name,
          team_name: entry?.team_name ?? null,
          entry_id: entry?.id ?? null,
          total_points: entry ? (curMap.get(entry.id) ?? 0) : 0,
          stage_points: entry ? (selStagePts.get(entry.id) ?? 0) : 0,
          stage_rank: stageRankByUser.get(m.user_id) ?? null,
        };
      })
      .sort((a, b) => b.total_points - a.total_points);

    return rows.map((row, i) => {
      const rank = i + 1;
      const prevRank = prevRankByUser.get(row.user_id);
      const delta = etappeIdx > 0 && prevRank != null ? prevRank - rank : null;

      let gap_to_above: number | null = null;
      let gap_movement: number | null = null;
      let above_name: string | null = null;

      const myPts = row.total_points;
      const myPrevPts = row.entry_id ? (prevMap.get(row.entry_id) ?? 0) : 0;

      if (rank === 1 && rows.length >= 2) {
        const r2 = rows[1];
        above_name = r2.team_name ?? r2.display_name;
        gap_to_above = myPts - r2.total_points;
        if (etappeIdx > 0) {
          const r2PrevPts = r2.entry_id ? (prevMap.get(r2.entry_id) ?? 0) : 0;
          gap_movement = gap_to_above - (myPrevPts - r2PrevPts);
        }
      } else if (rank > 1) {
        const above = rows[i - 1];
        above_name = above.team_name ?? above.display_name;
        gap_to_above = above.total_points - myPts;
        if (etappeIdx > 0) {
          const abovePrevPts = above.entry_id ? (prevMap.get(above.entry_id) ?? 0) : 0;
          gap_movement = gap_to_above - (abovePrevPts - myPrevPts);
        }
      }

      return { ...row, rank, delta, gap_to_above, gap_movement, above_name };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, entries, stagePoints, stages, etappeIdx]);

  const compareMember = memberRows.find((m) => m.user_id === compareId);

  if (membersLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-4 text-sm text-muted-foreground">Klassement laden…</CardContent>
      </Card>
    );
  }
  if (memberRows.length === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Nog geen leden in deze subpoule.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Stage selector — drives the standings table below */}
      {stages.length > 0 && (
        <div className="retro-border bg-gradient-to-br from-card via-card to-secondary/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-display text-sm font-bold tracking-wide uppercase text-foreground/80">
                Tussenstand selecteren
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {selectedEtappe
                  ? `T/m rit ${selectedEtappe.stage_number}${selectedEtappe.name ? ` — ${selectedEtappe.name}` : ""}`
                  : "Kies een rit"}
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:block">
              {stages.filter((s) => !s.is_gc).length} ritten
            </span>
          </div>
          <StageBars
            stages={stages}
            pointsByStageId={myPointsPerStage}
            rankByStageId={myRankPerStage}
            selectedStageId={selectedEtappe?.id}
            onSelectStage={(s) => {
              const idx = stages.findIndex((x) => x.id === s.id);
              if (idx >= 0) setEtappeIdx(idx);
            }}
            gcUnlocked={gcUnlocked}
            trackHeight={130}
          />
        </div>
      )}

      {/* Cumulative standings up to the selected stage */}
      <div className="retro-border bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />

        <div className="p-4 border-b-2 border-foreground bg-secondary/50 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[hsl(var(--vintage-gold))]" />
            {subpouleName}
          </h2>
          {selectedEtappe && (
            <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
              T/m rit {selectedEtappe.stage_number}
              {selectedEtappe.name ? ` — ${selectedEtappe.name}` : ""}
            </span>
          )}
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-3 px-3 py-1 border-b border-border bg-secondary/30">
          <div className="shrink-0 w-9" />
          <div className="flex-1 min-w-0 text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/60">Naam</div>
          {stages.length > 0 && <div className="shrink-0 w-8 text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/60 text-center">Rit</div>}
          <div className="shrink-0 min-w-[3rem] text-right text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/60">Pts</div>
          <div className="shrink-0 min-w-[64px] text-right text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/60">Gap</div>
          <div className="shrink-0 w-7" />
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {memberRows.map((m) => {
            const isMe = m.user_id === user?.id;
            const isComparing = m.user_id === compareId;

            const rankNumCls =
              m.rank === 1 ? "text-amber-400"
              : m.rank === 2 ? "text-zinc-400"
              : m.rank === 3 ? "text-orange-400"
              : "text-muted-foreground/40";

            const rowAccentCls =
              m.rank === 1 ? "border-l-[3px] border-amber-400/70 bg-amber-500/[0.04]"
              : m.rank === 2 ? "border-l-[3px] border-zinc-400/50 bg-zinc-500/[0.03]"
              : m.rank === 3 ? "border-l-[3px] border-orange-400/50 bg-orange-500/[0.03]"
              : "border-l-[3px] border-transparent";

            const stageBadgeCls =
              m.stage_rank == null ? null
              : m.stage_rank === 1 ? "bg-amber-500/15 border-amber-400/50 text-amber-500"
              : m.stage_rank <= 3 ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
              : m.stage_rank <= 5 ? "bg-sky-500/15 border-sky-400/30 text-sky-400"
              : "bg-secondary/80 border-border text-muted-foreground/60";

            return (
              <div
                key={m.user_id}
                className={cn(
                  "flex items-center gap-3 px-3 border-b border-border/40 transition-colors",
                  rowAccentCls,
                  isMe && "bg-primary/[0.08] ring-1 ring-inset ring-primary/30",
                  isComparing && "bg-accent/10"
                )}
                style={{ minHeight: "44px" }}
              >
                <div className={cn(
                  "shrink-0 font-display font-black tabular-nums leading-none text-center",
                  m.rank <= 3 ? "text-2xl w-9" : "text-sm w-7",
                  rankNumCls
                )}>
                  {m.rank}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "font-sans text-sm truncate",
                      isMe ? "font-bold text-primary" : m.rank <= 3 ? "font-semibold" : "font-medium"
                    )}>
                      {m.team_name ?? m.display_name ?? "—"}
                    </span>
                    {isMe && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded px-1 py-px leading-4">
                        jij
                      </span>
                    )}
                    {!m.entry_id && (
                      <Badge variant="secondary" className="text-xs">geen team</Badge>
                    )}
                  </div>
                  {m.delta != null && m.delta !== 0 && (
                    <div className={cn(
                      "flex items-center gap-0.5 text-[10px] font-semibold tabular-nums mt-0.5 leading-none",
                      m.delta > 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {m.delta > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                      {Math.abs(m.delta)}
                    </div>
                  )}
                </div>

                {stageBadgeCls && (
                  <div className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                    stageBadgeCls
                  )}>
                    <Flag className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[10px] font-bold tabular-nums">#{m.stage_rank}</span>
                  </div>
                )}

                <div className="shrink-0 text-right min-w-[3rem]">
                  <span className={cn(
                    "font-display font-bold tabular-nums",
                    m.rank === 1 ? "text-xl text-amber-500" : "text-base"
                  )}>
                    {m.total_points}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono ml-0.5">pt</span>
                </div>

                <div className="shrink-0 flex justify-end" style={{ minWidth: "64px" }}>
                  <GapBadge
                    rank={m.rank}
                    gap={m.gap_to_above}
                    movement={m.gap_movement}
                    aboveName={m.above_name}
                  />
                </div>

                {!isMe && m.entry_id && (
                  <button
                    onClick={() => setCompareId(isComparing ? null : m.user_id)}
                    className={cn(
                      "shrink-0 p-1.5 rounded border border-border hover:bg-accent/20 transition-colors",
                      isComparing && "bg-accent/30 border-accent"
                    )}
                    title={isComparing ? "Vergelijking sluiten" : "Vergelijk met jouw team"}
                  >
                    <Swords className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Head-to-head comparison */}
      {compareMember && ["live", "locked", "finished", "closed"].includes(String(game?.status ?? "")) && (
        <TeamComparison
          opponentUserId={compareMember.user_id}
          opponentName={compareMember.display_name}
          subpouleId={subpouleId}
        />
      )}

      {/* Cumulative evolution chart */}
      <SubpouleEvolutionChart subpouleId={subpouleId} />
    </div>
  );
}
