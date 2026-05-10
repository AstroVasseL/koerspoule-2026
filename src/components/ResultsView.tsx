import { useEffect, useMemo, useState } from "react";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useStages, useStageResults, useStagePoints, useEntries } from "@/hooks/useResults";
import { usePointsSchema } from "@/hooks/usePointsSchema";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, User, Users, Mountain, Activity, Clock, MapPin, ArrowUp, ArrowDown, Minus } from "lucide-react";
import ResultsUpdatedBadge from "@/components/ResultsUpdatedBadge";

const STAGE_TYPE_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  vlak: { label: "Vlak", color: "bg-emerald-500", icon: <Activity className="w-4 h-4" /> },
  heuvelachtig: { label: "Heuvelachtig", color: "bg-amber-500", icon: <Mountain className="w-4 h-4" /> },
  bergop: { label: "Bergop", color: "bg-rose-600", icon: <Mountain className="w-4 h-4" /> },
  tijdrit: { label: "Tijdrit", color: "bg-sky-500", icon: <Clock className="w-4 h-4" /> },
  ploegentijdrit: { label: "Ploegentijdrit", color: "bg-violet-500", icon: <Clock className="w-4 h-4" /> },
};

function rankBadge(rank: number) {
  const cls =
    rank === 1
      ? "bg-yellow-500 text-yellow-950"
      : rank === 2
      ? "bg-zinc-300 text-zinc-900"
      : rank === 3
      ? "bg-orange-400 text-orange-950"
      : "bg-secondary text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums", cls)}>
      {rank}
    </span>
  );
}

/** Latest stage that has any results yet (so we don't open on an empty stage) */
function pickInitialStage<T extends { id: string; status: string | null }>(stages: T[], pointsByStage: Map<string, number>) {
  // Prefer last stage with results
  for (let i = stages.length - 1; i >= 0; i--) {
    if ((pointsByStage.get(stages[i].id) ?? 0) > 0) return i;
  }
  // Otherwise first stage
  return 0;
}

export default function Results() {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const gameId = game?.id;

  const { data: stages = [], isLoading: stagesLoading } = useStages(gameId);
  const { data: stagePoints = [] } = useStagePoints(gameId);
  const { data: entries = [] } = useEntries(gameId);
  const { data: schema = [] } = usePointsSchema(gameId);

  const stagePointsByStage = useMemo(() => {
    const m = new Map<string, number>();
    stagePoints.forEach((sp) => m.set(sp.stage_id, (m.get(sp.stage_id) ?? 0) + sp.points));
    return m;
  }, [stagePoints]);

  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);

  useEffect(() => {
    if (stages.length > 0) {
      setSelectedStageIdx(pickInitialStage(stages, stagePointsByStage));
    }
  }, [stages.length, stagePointsByStage.size]);

  const selectedStage = stages[selectedStageIdx];
  const { data: results = [], isLoading: resultsLoading } = useStageResults(selectedStage?.id);

  // My entry in this game
  const myEntry = useMemo(
    () => entries.find((e) => e.user_id === user?.id),
    [entries, user?.id]
  );

  // My team's points for the selected stage
  const myStagePoints = useMemo(() => {
    if (!myEntry || !selectedStage) return 0;
    return stagePoints
      .filter((sp) => sp.entry_id === myEntry.id && sp.stage_id === selectedStage.id)
      .reduce((s, r) => s + r.points, 0);
  }, [myEntry, selectedStage, stagePoints]);

  // Points per stage for "my points per etappe" bar chart
  const myPointsPerStage = useMemo(() => {
    if (!myEntry) return new Map<string, number>();
    const m = new Map<string, number>();
    stagePoints
      .filter((sp) => sp.entry_id === myEntry.id)
      .forEach((sp) => m.set(sp.stage_id, (m.get(sp.stage_id) ?? 0) + sp.points));
    return m;
  }, [myEntry, stagePoints]);

  // Stage standings: total per entry for selected stage
  const stageStandings = useMemo(() => {
    if (!selectedStage) return [];
    const map = new Map<string, number>();
    stagePoints
      .filter((sp) => sp.stage_id === selectedStage.id)
      .forEach((sp) => map.set(sp.entry_id, (map.get(sp.entry_id) ?? 0) + sp.points));
    return entries
      .map((e) => ({ ...e, stagePts: map.get(e.id) ?? 0 }))
      .sort((a, b) => b.stagePts - a.stagePts)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }, [entries, stagePoints, selectedStage]);

  // Overall standings up to selected klassement stage (cumulative)
  const [klassementStageIdx, setKlassementStageIdx] = useState<number>(0);
  useEffect(() => {
    if (stages.length > 0) {
      setKlassementStageIdx(pickInitialStage(stages, stagePointsByStage));
    }
  }, [stages.length, stagePointsByStage.size]);

  const klassementStage = stages[klassementStageIdx];

  const cumulativeUpTo = (upToIdx: number) => {
    if (upToIdx < 0) return new Map<string, number>();
    const allowed = new Set(stages.slice(0, upToIdx + 1).map((s) => s.id));
    const m = new Map<string, number>();
    stagePoints
      .filter((sp) => allowed.has(sp.stage_id))
      .forEach((sp) => m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points));
    return m;
  };

  const overallStandings = useMemo(() => {
    const cur = cumulativeUpTo(klassementStageIdx);
    const prev = cumulativeUpTo(klassementStageIdx - 1);
    const prevSorted = [...entries]
      .map((e) => ({ id: e.id, pts: prev.get(e.id) ?? 0 }))
      .sort((a, b) => b.pts - a.pts);
    const prevRank = new Map<string, number>();
    prevSorted.forEach((r, i) => prevRank.set(r.id, i + 1));

    return [...entries]
      .map((e) => ({ ...e, cumPts: cur.get(e.id) ?? 0 }))
      .sort((a, b) => b.cumPts - a.cumPts)
      .map((row, i) => {
        const prevR = prevRank.get(row.id) ?? i + 1;
        return { ...row, rank: i + 1, delta: prevR - (i + 1) };
      });
  }, [entries, stagePoints, stages, klassementStageIdx]);

  // Stage points lookup for schema
  const stagePtsTable = useMemo(() => {
    const m = new Map<number, number>();
    schema.filter((s) => s.classification === "stage").forEach((s) => m.set(s.position, s.points));
    return m;
  }, [schema]);

  // Riders in my team scoring this stage
  const myEntryRiders = useMyEntryRiders(myEntry?.id, gameId);
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

  // Render

  if (!game && !stagesLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground italic">Er is nog geen actieve koers ingesteld.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Uitslagen & Klassement</h1>
        {game && (
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-sans">
            {game.name}
          </p>
        )}
        <div className="mt-3 flex justify-center">
          <ResultsUpdatedBadge gameId={gameId} />
        </div>
        <div className="vintage-divider max-w-xs mx-auto mt-4" />
      </div>

      <Tabs defaultValue="klassement" className="max-w-7xl mx-auto">
        <TabsList className="w-full retro-border">
          <TabsTrigger value="klassement" className="flex-1 font-display">🏆 Klassement</TabsTrigger>
          <TabsTrigger value="etappes" className="flex-1 font-display">📋 Etappes</TabsTrigger>
        </TabsList>

        {/* ── ETAPPES TAB ── */}
        <TabsContent value="etappes">
          {stagesLoading ? (
            <p className="text-center text-muted-foreground py-12">Etappes laden...</p>
          ) : stages.length === 0 ? (
            <EmptyState message="Nog geen etappes aangemaakt voor deze koers." />
          ) : (
            <>
              {/* Stage roadbook strip */}
              <div className="mt-4 mb-6 retro-border bg-card p-3 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {stages.map((s, idx) => {
                    const pts = myPointsPerStage.get(s.id) ?? 0;
                    const meta = STAGE_TYPE_META[s.stage_type ?? "vlak"];
                    const active = idx === selectedStageIdx;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStageIdx(idx)}
                        className={cn(
                          "flex flex-col items-center gap-1 px-2 py-1.5 rounded transition min-w-[44px]",
                          active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                        )}
                      >
                        <span className="text-[10px] font-bold tabular-nums">{s.stage_number}</span>
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white", meta?.color ?? "bg-muted")}>
                          {meta?.icon}
                        </div>
                        <span className="text-[9px] tabular-nums opacity-70">{pts || ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected stage info */}
              {selectedStage && (
                <div className="mb-4 retro-border bg-secondary/30 p-3 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-white",
                      STAGE_TYPE_META[selectedStage.stage_type ?? "vlak"]?.color
                    )}>
                      {STAGE_TYPE_META[selectedStage.stage_type ?? "vlak"]?.icon}
                    </div>
                    <div>
                      <span className="font-display font-bold">Rit {selectedStage.stage_number}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {STAGE_TYPE_META[selectedStage.stage_type ?? "vlak"]?.label}
                      </span>
                    </div>
                  </div>
                  {selectedStage.name && (
                    <span className="text-muted-foreground font-sans flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />{selectedStage.name}
                    </span>
                  )}
                  {selectedStage.date && (
                    <span className="text-xs text-muted-foreground ml-auto">{selectedStage.date}</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Column 1: Stage results (top 20 finish) */}
                <div className="retro-border bg-card">
                  <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                    <h2 className="font-display text-base font-bold flex items-center gap-2">
                      <Medal className="h-5 w-5 text-accent" />
                      Etappe-uitslag
                    </h2>
                  </div>
                  {resultsLoading ? (
                    <div className="p-6 text-sm text-muted-foreground italic text-center">Laden...</div>
                  ) : results.filter((r) => r.finish_position != null).length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground italic text-center">
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

                {/* Column 2: Pool standings for stage */}
                <div className="retro-border bg-card h-fit">
                  <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                    <h2 className="font-display text-base font-bold flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Tussenstand rit
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entries.length} {entries.length === 1 ? "deelnemer" : "deelnemers"}
                    </p>
                  </div>
                  {stageStandings.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground italic text-center">
                      Nog geen deelnemers met punten.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {stageStandings.slice(0, 10).map((s) => {
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
                      <span className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Jouw team</span>
                      <span className="font-display text-xl text-primary">{myStagePoints} pt</span>
                    </h2>
                  </div>
                  {!myEntry ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Je hebt nog geen team ingestuurd voor deze koers.
                    </div>
                  ) : myStageScorers.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
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
            </>
          )}
        </TabsContent>

        {/* ── KLASSEMENT TAB ── */}
        <TabsContent value="klassement">
          {/* Stage selector for klassement */}
          {stages.length > 0 && (
            <div className="mt-4 mb-4 retro-border bg-card p-3 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {stages.map((s, idx) => {
                  const meta = STAGE_TYPE_META[s.stage_type ?? "vlak"];
                  const active = idx === klassementStageIdx;
                  const hasPts = (stagePointsByStage.get(s.id) ?? 0) > 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setKlassementStageIdx(idx)}
                      className={cn(
                        "flex flex-col items-center gap-1 px-2 py-1.5 rounded transition min-w-[44px]",
                        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                        !hasPts && "opacity-60"
                      )}
                    >
                      <span className="text-[10px] font-bold tabular-nums">{s.stage_number}</span>
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white", meta?.color ?? "bg-muted")}>
                        {meta?.icon}
                      </div>
                    </button>
                  );
                })}
              </div>
              {klassementStage && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Tussenstand t/m rit {klassementStage.stage_number}
                  {klassementStage.name && ` — ${klassementStage.name}`}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pool overall standings */}
            <div className="retro-border bg-card">
              <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Algemeen klassement alle deelnemers
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {overallStandings.length} {overallStandings.length === 1 ? "deelnemer" : "deelnemers"}
                </p>
              </div>
              {overallStandings.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground italic text-center">
                  Nog geen ingestuurde teams.
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {overallStandings.map((s) => {
                    const isMe = s.user_id === user?.id;
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 text-sm transition-all duration-300",
                          isMe && "bg-primary/10"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {rankBadge(s.rank)}
                          <span className={cn("font-sans truncate", isMe && "font-bold text-primary")}>
                            {s.team_name ?? s.display_name ?? "—"}
                          </span>
                          {klassementStageIdx > 0 && (
                            <span className={cn(
                              "inline-flex items-center text-[10px] font-bold tabular-nums",
                              s.delta > 0 ? "text-emerald-600" : s.delta < 0 ? "text-rose-600" : "text-muted-foreground"
                            )}>
                              {s.delta > 0 ? <ArrowUp className="w-3 h-3" /> : s.delta < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {s.delta !== 0 && Math.abs(s.delta)}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-sm tabular-nums">{s.cumPts} pt</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Race classifications (4 jerseys) */}
            <RaceClassifications stageId={klassementStage?.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Helper components / hooks ── */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 px-6">
      <p className="text-muted-foreground italic">{message}</p>
    </div>
  );
}

/** Get rider IDs in user's entry, marked with joker flag */
function useMyEntryRiders(entryId?: string, gameId?: string) {
  return useQuery({
    queryKey: ["my-entry-riders", entryId],
    enabled: Boolean(entryId && gameId && supabase),
    queryFn: async () => {
      if (!supabase || !entryId) return [];
      const [picksRes, jokersRes] = await Promise.all([
        supabase.from("entry_picks").select("rider_id").eq("entry_id", entryId),
        supabase.from("entry_jokers").select("rider_id").eq("entry_id", entryId),
      ]);
      const jokerIds = new Set((jokersRes.data ?? []).map((j: { rider_id: string }) => j.rider_id));
      const pickIds = (picksRes.data ?? []).map((p: { rider_id: string }) => p.rider_id);
      const allIds = Array.from(new Set([...pickIds, ...jokerIds]));
      return allIds.map((id) => ({ id, is_joker: jokerIds.has(id) }));
    },
  }).data;
}

function RaceClassifications({ stageId }: { stageId: string | undefined }) {
  const { data: results = [], isLoading } = useStageResults(stageId);

  const buildList = (key: "gc_position" | "points_position" | "mountain_position" | "youth_position") =>
    results
      .filter((r) => r[key] != null)
      .sort((a, b) => (a[key] ?? 999) - (b[key] ?? 999))
      .slice(0, 20);

  const tabs = [
    { id: "gc", label: "Algemeen", icon: "🟡", rows: buildList("gc_position") },
    { id: "points", label: "Punten", icon: "🟢", rows: buildList("points_position") },
    { id: "kom", label: "Berg", icon: "🔴", rows: buildList("mountain_position") },
    { id: "youth", label: "Jongeren", icon: "⚪", rows: buildList("youth_position") },
  ];

  return (
    <div className="retro-border bg-card">
      <div className="p-4 border-b-2 border-foreground bg-secondary/50">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Medal className="h-5 w-5 text-accent" />
          Klassementen koers
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Stand na laatst geüploade rit
        </p>
      </div>

      {!stageId ? (
        <div className="p-6 text-sm text-muted-foreground italic text-center">
          Selecteer een rit om de klassementen te zien.
        </div>
      ) : isLoading ? (
        <div className="p-6 text-sm text-muted-foreground italic text-center">Laden...</div>
      ) : (
        <Tabs defaultValue="gc">
          <TabsList className="w-full grid grid-cols-4 rounded-none">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="text-xs">
                <span className="mr-1">{t.icon}</span>{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.id} value={t.id} className="mt-0">
              {t.rows.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground italic text-center">
                  Nog geen {t.label.toLowerCase()}klassement ingevuld voor deze rit.
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {t.rows.map((r) => {
                    const pos =
                      t.id === "gc" ? r.gc_position
                      : t.id === "points" ? r.points_position
                      : t.id === "kom" ? r.mountain_position
                      : r.youth_position;
                    return (
                      <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {rankBadge(pos!)}
                          <span className="font-sans truncate">{r.riders?.name ?? r.rider_name ?? "—"}</span>
                          {r.riders?.teams?.name && (
                            <span className="text-xs text-muted-foreground truncate hidden md:inline">· {r.riders.teams.name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
