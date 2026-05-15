import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, Swords, ArrowUp, ArrowDown, Flag,
  Activity, Mountain, Clock, MapPin, Route, Calendar, User, Medal,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries, useStages, useStagePoints, useStageResults } from "@/hooks/useResults";
import { usePointsSchema } from "@/hooks/usePointsSchema";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import { supabase } from "@/lib/supabase";
import TeamComparison from "@/components/TeamComparison";
import SubpouleEvolutionChart from "@/components/SubpouleEvolutionChart";
import StageBars from "@/components/StageBars";
import { cn } from "@/lib/utils";

const STAGE_TYPE_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  vlak: { label: "Vlak", color: "bg-emerald-500", icon: <Activity className="w-4 h-4" /> },
  heuvelachtig: { label: "Heuvelachtig", color: "bg-amber-500", icon: <Mountain className="w-4 h-4" /> },
  bergop: { label: "Bergop", color: "bg-rose-600", icon: <Mountain className="w-4 h-4" /> },
  tijdrit: { label: "Tijdrit", color: "bg-sky-500", icon: <Clock className="w-4 h-4" /> },
  ploegentijdrit: { label: "Ploegentijdrit", color: "bg-violet-500", icon: <Clock className="w-4 h-4" /> },
};

function rankBadge(rank: number) {
  const cls =
    rank === 1 ? "bg-yellow-500 text-yellow-950"
    : rank === 2 ? "bg-zinc-300 text-zinc-900"
    : rank === 3 ? "bg-orange-400 text-orange-950"
    : "bg-secondary text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums", cls)}>
      {rank}
    </span>
  );
}

type Props = {
  subpouleId: string;
  subpouleName: string;
};

export default function SubpouleStandings({ subpouleId, subpouleName }: Props) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data: members = [], isLoading: membersLoading } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: stagePoints = [] } = useStagePoints(game?.id);
  const { data: schema = [] } = usePointsSchema(game?.id);

  const [compareId, setCompareId] = useState<string | null>(null);
  const [etappeIdx, setEtappeIdx] = useState<number>(0);

  // Initialize etappeIdx to last stage with any points
  useEffect(() => {
    if (stages.length === 0) return;
    const totals = new Map<string, number>();
    stagePoints.forEach((sp) => totals.set(sp.stage_id, (totals.get(sp.stage_id) ?? 0) + sp.points));
    for (let i = stages.length - 1; i >= 0; i--) {
      if ((totals.get(stages[i].id) ?? 0) > 0) { setEtappeIdx(i); return; }
    }
  }, [stages.length, stagePoints.length]);

  const selectedEtappe = stages[etappeIdx];
  const { data: results = [], isLoading: resultsLoading } = useStageResults(selectedEtappe?.id);
  const gcUnlocked = stages.filter((x) => !x.is_gc).some((x) => x.stage_number === 21 && x.results_status === "approved");

  // My entry in this game
  const myEntry = useMemo(() => entries.find((e) => e.user_id === user?.id), [entries, user?.id]);

  // Points schema: position → points
  const stagePtsTable = useMemo(() => {
    const m = new Map<number, number>();
    schema.filter((s) => s.classification === "stage").forEach((s) => m.set(s.position, s.points));
    return m;
  }, [schema]);

  // My picks + jokers (for "Jouw team" column)
  const myPicksQuery = useQuery({
    queryKey: ["my-entry-riders", myEntry?.id],
    enabled: Boolean(myEntry?.id && game?.id),
    queryFn: async () => {
      if (!supabase || !myEntry?.id) return [];
      const [picksRes, jokersRes] = await Promise.all([
        supabase.from("entry_picks").select("rider_id").eq("entry_id", myEntry.id),
        supabase.from("entry_jokers").select("rider_id").eq("entry_id", myEntry.id),
      ]);
      const jokerIds = new Set((jokersRes.data ?? []).map((j: { rider_id: string }) => j.rider_id));
      const pickIds = (picksRes.data ?? []).map((p: { rider_id: string }) => p.rider_id);
      const allIds = Array.from(new Set([...pickIds, ...jokerIds]));
      return allIds.map((id) => ({ id, is_joker: jokerIds.has(id) }));
    },
  });
  const myEntryRiders = myPicksQuery.data;

  // My points per stage (drives StageBars bar height highlight)
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

  // Subpoule members ranked by stage points for the selected stage
  const subpouleStageStandings = useMemo(() => {
    if (!selectedEtappe) return [];
    const memberUserIds = new Set(members.map((m) => m.user_id));
    const memberEntries = entries.filter((e) => memberUserIds.has(e.user_id));
    const map = new Map<string, number>();
    stagePoints
      .filter((sp) => sp.stage_id === selectedEtappe.id)
      .forEach((sp) => map.set(sp.entry_id, (map.get(sp.entry_id) ?? 0) + sp.points));
    return memberEntries
      .map((e) => ({ ...e, stagePts: map.get(e.id) ?? 0 }))
      .sort((a, b) => b.stagePts - a.stagePts)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }, [members, entries, stagePoints, selectedEtappe]);

  // My total points for the selected stage
  const myStagePoints = useMemo(() => {
    if (!myEntry || !selectedEtappe) return 0;
    return stagePoints
      .filter((sp) => sp.entry_id === myEntry.id && sp.stage_id === selectedEtappe.id)
      .reduce((s, r) => s + r.points, 0);
  }, [myEntry, selectedEtappe, stagePoints]);

  // My riders who scored in the selected stage
  const myStageScorers = useMemo(() => {
    if (!myEntryRiders) return [];
    const myIds = new Set(myEntryRiders.map((r) => r.id));
    return results
      .filter((r) => r.finish_position != null && myIds.has(r.rider_id))
      .map((r) => ({
        rider_id: r.rider_id,
        name: r.riders?.name ?? r.rider_name ?? "—",
        position: r.finish_position!,
        is_joker: myEntryRiders.find((mr) => mr.id === r.rider_id)?.is_joker ?? false,
      }))
      .sort((a, b) => a.position - b.position);
  }, [myEntryRiders, results]);

  // ── Existing cumulative standings logic ──

  // Last stage that has any points recorded
  const lastStageInfo = useMemo(() => {
    const totals = new Map<string, number>();
    stagePoints.forEach((sp) => totals.set(sp.stage_id, (totals.get(sp.stage_id) ?? 0) + sp.points));
    for (let i = stages.length - 1; i >= 0; i--) {
      if ((totals.get(stages[i].id) ?? 0) > 0) return { stage: stages[i], idx: i };
    }
    return null;
  }, [stages, stagePoints]);

  // Member rows: rank, stage_points, delta — built from real stage data
  const memberRows = useMemo(() => {
    if (!lastStageInfo) {
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
            rank: 0,
            delta: null as number | null,
          };
        })
        .sort((a, b) => b.total_points - a.total_points)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }

    const { stage: lastStage, idx: lastIdx } = lastStageInfo;

    const cumUpTo = (upToIdx: number) => {
      const allowed = new Set(stages.slice(0, upToIdx + 1).map((s) => s.id));
      const m = new Map<string, number>();
      stagePoints
        .filter((sp) => allowed.has(sp.stage_id))
        .forEach((sp) => m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points));
      return m;
    };

    const curMap = cumUpTo(lastIdx);
    const prevMap = lastIdx > 0 ? cumUpTo(lastIdx - 1) : new Map<string, number>();

    const lastStagePts = new Map<string, number>();
    stagePoints
      .filter((sp) => sp.stage_id === lastStage.id)
      .forEach((sp) => lastStagePts.set(sp.entry_id, (lastStagePts.get(sp.entry_id) ?? 0) + sp.points));

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
          total_points: entry ? (curMap.get(entry.id) ?? entry.total_points ?? 0) : 0,
          stage_points: entry ? (lastStagePts.get(entry.id) ?? 0) : 0,
        };
      })
      .sort((a, b) => b.total_points - a.total_points);

    return rows.map((row, i) => {
      const rank = i + 1;
      const prevRank = prevRankByUser.get(row.user_id);
      const delta = lastIdx > 0 && prevRank != null ? prevRank - rank : null;
      return { ...row, rank, delta };
    });
  }, [members, entries, stagePoints, stages, lastStageInfo]);

  const maxStagePts = useMemo(
    () => Math.max(0, ...memberRows.map((r) => r.stage_points)),
    [memberRows]
  );

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

      {/* ── Etappe dashboard ── */}
      {stages.length > 0 && (
        <>
          {/* Stage selector */}
          <div className="retro-border bg-gradient-to-br from-card via-card to-secondary/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-display text-sm font-bold tracking-wide uppercase text-foreground/80">
                  Etappe selecteren
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {selectedEtappe
                    ? `Rit ${selectedEtappe.stage_number}${selectedEtappe.name ? ` — ${selectedEtappe.name}` : ""}`
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

          {/* Stage info header */}
          {selectedEtappe && !selectedEtappe.is_gc && (
            <div className="retro-border bg-secondary/30 p-3 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-white",
                  STAGE_TYPE_META[selectedEtappe.stage_type ?? "vlak"]?.color
                )}>
                  {STAGE_TYPE_META[selectedEtappe.stage_type ?? "vlak"]?.icon}
                </div>
                <div>
                  <span className="font-display font-bold">Rit {selectedEtappe.stage_number}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {STAGE_TYPE_META[selectedEtappe.stage_type ?? "vlak"]?.label}
                  </span>
                </div>
              </div>
              {selectedEtappe.name && (
                <span className="text-muted-foreground font-sans flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />{selectedEtappe.name}
                </span>
              )}
              {selectedEtappe.distance_km != null && (
                <span className="font-sans flex items-center gap-1 font-bold">
                  <Route className="w-3.5 h-3.5" />{selectedEtappe.distance_km} km
                </span>
              )}
              {selectedEtappe.date && (
                <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selectedEtappe.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" })}
                </span>
              )}
            </div>
          )}

          {/* 3-column etappe detail */}
          {selectedEtappe && !selectedEtappe.is_gc && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Column 1: Stage finish (global) */}
              <div className="retro-border bg-card">
                <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                  <h2 className="font-display text-base font-bold flex items-center gap-2">
                    <Medal className="h-5 w-5 text-accent" />
                    Etappe-uitslag
                  </h2>
                </div>
                {resultsLoading ? (
                  <div className="p-4 text-sm text-muted-foreground italic text-center">Laden...</div>
                ) : results.filter((r) => r.finish_position != null).length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground italic text-center">
                    Nog geen uitslag voor deze rit.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {results
                      .filter((r) => r.finish_position != null)
                      .sort((a, b) => (a.finish_position ?? 999) - (b.finish_position ?? 999))
                      .slice(0, 20)
                      .map((r) => {
                        const inMyTeam = myEntryRiders?.some((mr) => mr.id === r.rider_id);
                        const pts = stagePtsTable.get(r.finish_position!) ?? 0;
                        return (
                          <div
                            key={r.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 text-sm",
                              inMyTeam && "ring-1 ring-inset ring-primary/30 bg-primary/5"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {rankBadge(r.finish_position!)}
                              <span className={cn("font-sans font-medium text-sm truncate text-slate-800", inMyTeam && "text-primary")}>
                                {r.riders?.name ?? r.rider_name ?? "—"}
                              </span>
                            </div>
                            <span className="font-bold text-accent text-xs whitespace-nowrap">{pts} pt</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Column 2: Subpoule standings for this stage */}
              <div className="retro-border bg-card h-fit">
                <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                  <h2 className="font-display text-base font-bold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Tussenstand rit
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {members.length} {members.length === 1 ? "subpoule-lid" : "subpoule-leden"}
                  </p>
                </div>
                {subpouleStageStandings.every((s) => s.stagePts === 0) ? (
                  <div className="p-4 text-sm text-muted-foreground italic text-center">
                    Nog geen punten voor deze rit.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {subpouleStageStandings.map((s) => {
                      const isMe = s.user_id === user?.id;
                      return (
                        <div
                          key={s.id}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 text-sm",
                            isMe && "bg-primary/10"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {rankBadge(s.rank)}
                            <span className={cn("font-sans truncate", isMe && "font-bold text-primary")}>
                              {s.team_name ?? s.display_name ?? "—"}
                            </span>
                          </div>
                          <span className="font-bold text-xs">{s.stagePts} pt</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Column 3: My team this stage */}
              <div className="retro-border bg-card h-fit">
                <div className="p-4 border-b-2 border-foreground bg-primary/10">
                  <h2 className="font-display text-base font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />Jouw team
                    </span>
                    <span className="font-display text-xl text-primary">{myStagePoints} pt</span>
                  </h2>
                </div>
                {!myEntry ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Je hebt nog geen team ingestuurd voor deze koers.
                  </div>
                ) : myStageScorers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Geen van jouw renners scoorde punten in deze rit.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {myStageScorers.map((r) => {
                      const basePts = stagePtsTable.get(r.position) ?? 0;
                      const finalPts = r.is_joker ? basePts * 2 : basePts;
                      return (
                        <div key={r.rider_id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground tabular-nums">
                              {r.position}
                            </span>
                            <span className="font-sans font-medium truncate">{r.name}</span>
                            {r.is_joker && (
                              <span className="text-[9px] uppercase font-bold text-accent">Joker</span>
                            )}
                          </div>
                          <span className="font-bold text-primary text-sm">{finalPts} pt</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Cumulative standings table ── */}
      <div className="retro-border bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />

        <div className="p-4 border-b-2 border-foreground bg-secondary/50 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[hsl(var(--vintage-gold))]" />
            {subpouleName}
          </h2>
          {lastStageInfo && (
            <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
              Rit {lastStageInfo.stage.stage_number}
              {lastStageInfo.stage.name ? ` — ${lastStageInfo.stage.name}` : ""}
            </span>
          )}
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
              m.stage_points === 0 ? null
              : m.stage_points === maxStagePts
                ? "bg-amber-500/15 border-amber-400/50 text-amber-500"
              : m.stage_points >= maxStagePts * 0.65
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
              : m.stage_points >= maxStagePts * 0.35
                ? "bg-sky-500/15 border-sky-400/30 text-sky-400"
              : "bg-secondary/80 border-border text-muted-foreground/60";

            return (
              <div
                key={m.user_id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 border-b border-border/40 transition-colors",
                  rowAccentCls,
                  isMe && "bg-primary/[0.08] ring-1 ring-inset ring-primary/30",
                  isComparing && "bg-accent/10"
                )}
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
                    <span className="text-[10px] font-bold tabular-nums">{m.stage_points}</span>
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
