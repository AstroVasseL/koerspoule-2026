import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStages, useStagePoints, useEntries } from "@/hooks/useResults";
import { pointsTable } from "@/data/riders";

// ─── Types ───────────────────────────────────────────────────────────────────

export type HorsSummary = {
  monkeyBeatPct: number | null;   // 0..100
  emiratesPct: number | null;     // 0..100
  directorScore: number | null;   // 1.0..10.0
  isLoading: boolean;
};

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };
type JokerStat = { rider_id: string; joker_count: number; total_entries: number };

// ─── Local mirrors of the data hooks used in HorsCategorieTab ────────────────
// We keep these private and side-by-side with the originals; react-query
// dedupes by queryKey so no double-fetch ever happens.

function usePickStats(gameId?: string) {
  return useQuery({
    queryKey: ["game-pick-stats", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PickStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_pick_stats", { p_game_id: gameId });
      if (error) throw error;
      return (data ?? []) as PickStat[];
    },
  });
}

function useJokerStats(gameId?: string) {
  return useQuery({
    queryKey: ["game-joker-stats", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<JokerStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_joker_stats", { p_game_id: gameId });
      if (error) throw error;
      return (data ?? []) as JokerStat[];
    },
  });
}

function useEntryTotals(gameId?: string) {
  return useQuery({
    queryKey: ["game-stage-point-totals", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase!
        .from("stage_points")
        .select("entry_id, points, stages!inner(game_id)")
        .eq("stages.game_id", gameId!);
      if (error) throw error;
      const totalsByEntry = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ entry_id: string; points: number }>) {
        totalsByEntry.set(row.entry_id, (totalsByEntry.get(row.entry_id) ?? 0) + (row.points ?? 0));
      }
      return Array.from(totalsByEntry.values());
    },
  });
}

function useMyStagePointTotal(entryId?: string) {
  return useQuery({
    queryKey: ["hc-my-stage-point-total", entryId],
    enabled: Boolean(supabase && entryId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<number> => {
      if (!supabase || !entryId) return 0;
      const { data, error } = await supabase.from("stage_points").select("points").eq("entry_id", entryId);
      if (error) throw error;
      return (data ?? []).reduce((sum, row) => sum + (row.points ?? 0), 0);
    },
  });
}

function useAllStageResults(gameId?: string) {
  return useQuery({
    queryKey: ["all-stage-results", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Array<{ stage_id: string; rider_id: string | null; finish_position: number }>> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await (supabase as any)
        .from("stage_results")
        .select("stage_id, rider_id, finish_position, stages!inner(game_id, results_status)")
        .eq("stages.game_id", gameId)
        .eq("stages.results_status", "approved");
      if (error) throw error;
      return (data ?? []) as Array<{ stage_id: string; rider_id: string | null; finish_position: number }>;
    },
  });
}

function useAllGameRiders(gameId?: string) {
  return useQuery({
    queryKey: ["hc-all-game-riders", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Array<{ id: string; name: string; start_number: number | null }>> => {
      if (!supabase || !gameId) return [];
      const { data: teams } = await supabase.from("teams").select("id").eq("game_id", gameId);
      const teamIds = (teams ?? []).map((t: any) => t.id);
      if (teamIds.length === 0) return [];
      const { data, error } = await supabase
        .from("riders")
        .select("id, name, start_number")
        .in("team_id", teamIds);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; start_number: number | null }>;
    },
  });
}

// ─── Monte-Carlo helpers (unchanged copy from HorsCategorieTab) ──────────────

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  if (arr.length <= n) return [...arr];
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Lichte aggregator die enkel de 3 kerncijfers voor de Hors Catégorie-shortcuts
 * teruggeeft (Monkey IQ %, Emirates %, Wielerdirecteur-rapport). Hergebruikt
 * dezelfde RPC's en queryKeys als HorsCategorieTab, dus react-query dedupes.
 *
 * Geen functionele wijziging tov de tab — enkel projectie naar getallen.
 */
export function useHorsCategorieSummary(): HorsSummary {
  const { data: game } = useCurrentGame();
  const isLive = Boolean(
    game?.status && ["live", "locked", "finished", "closed"].includes(String(game.status)),
  );
  const gameId = isLive ? game?.id : undefined;

  const { entry, picksByCategory, jokerIds } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const pickStatsQ = usePickStats(gameId);
  const jokerStatsQ = useJokerStats(gameId);
  const totalsQ = useEntryTotals(gameId);
  const myStageTotalQ = useMyStagePointTotal(entry?.id);
  const stagesQ = useStages(gameId);
  const allStagePointsQ = useStagePoints(gameId);
  const entriesQ = useEntries(gameId);
  const allStageResultsQ = useAllStageResults(gameId);
  const allGameRidersQ = useAllGameRiders(gameId);

  const isLoading =
    pickStatsQ.isLoading ||
    jokerStatsQ.isLoading ||
    totalsQ.isLoading ||
    myStageTotalQ.isLoading ||
    stagesQ.isLoading ||
    allStagePointsQ.isLoading ||
    entriesQ.isLoading ||
    allStageResultsQ.isLoading ||
    allGameRidersQ.isLoading;

  const pickStats = pickStatsQ.data ?? [];
  const jokerStats = jokerStatsQ.data ?? [];
  const totals = totalsQ.data ?? [];
  const myStageTotal = myStageTotalQ.data ?? 0;
  const stages = stagesQ.data ?? [];
  const allStagePoints = allStagePointsQ.data ?? [];
  const entriesList = entriesQ.data ?? [];
  const allStageResults = allStageResultsQ.data ?? [];
  const allGameRiders = allGameRidersQ.data ?? [];

  // ── Monte Carlo (exact dezelfde formule als HorsCategorieTab) ──────────────
  const monte = useMemo(() => {
    const N = 5000;
    if (categories.length === 0 || pickStats.length === 0) return null;
    const meanTotal = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const byCat = new Map<string, PickStat[]>();
    for (const p of pickStats) {
      const arr = byCat.get(p.category_id) ?? [];
      arr.push(p);
      byCat.set(p.category_id, arr);
    }
    const totalSlots = categories.reduce((s, c) => s + (c.max_picks ?? 1), 0) || 1;
    const baselinePerSlot = meanTotal / totalSlots;
    const riderWeight = new Map<string, number>();
    for (const [, list] of byCat) {
      const max = Math.max(1, ...list.map((p) => p.pick_count));
      for (const p of list) {
        const r = p.pick_count / max;
        riderWeight.set(p.rider_id, 0.4 + r * 1.2);
      }
    }
    const rng = seededRandom(game?.id?.split("-").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 42);
    const scoreFromRiderIds = (riderIds: string[]) => {
      let s = 0;
      for (const rid of riderIds) {
        const w = riderWeight.get(rid) ?? 0.7;
        s += baselinePerSlot * w * (0.7 + rng() * 0.6);
      }
      return s;
    };
    const randomScores: number[] = [];
    for (const _ of Array(N).fill(0)) {
      const team: string[] = [];
      for (const cat of categories) {
        const pool = (byCat.get(cat.id) ?? []).map((p) => p.rider_id);
        if (pool.length === 0) continue;
        team.push(...pickN(pool, cat.max_picks ?? 1, rng));
      }
      randomScores.push(scoreFromRiderIds(team));
    }
    randomScores.sort((a, b) => a - b);
    const userPicks: string[] = [];
    for (const cat of categories) {
      const arr = picksByCategory.get(cat.id) ?? [];
      userPicks.push(...arr);
    }
    const userActual = userPicks.length ? myStageTotal : 0;
    const beatPct =
      randomScores.length === 0
        ? 0
        : (randomScores.filter((s) => userActual > s).length / randomScores.length) * 100;
    return { beatPct };
  }, [categories, pickStats, totals, picksByCategory, myStageTotal, game?.id]);

  // ── Emirates (exact dezelfde formule als HorsCategorieTab) ─────────────────
  const emiratesPct = useMemo<number | null>(() => {
    const approvedStages = stages
      .filter((s) => s.results_status === "approved")
      .sort((a, b) => a.stage_number - b.stage_number);
    if (approvedStages.length === 0 || !entry) return null;

    // 1) per-rider totaal aan etappepunten
    const riderTotals = new Map<string, number>();
    for (const r of allStageResults) {
      if (!r.rider_id) continue;
      const pts = pointsTable[r.finish_position] ?? 0;
      if (pts === 0) continue;
      riderTotals.set(r.rider_id, (riderTotals.get(r.rider_id) ?? 0) + pts);
    }

    // 2) droomploeg subtotalen per categorie
    let dreamTotal = 0;
    const categoryRiderIds = new Set<string>();
    for (const cat of categories) {
      const candidates = (cat.category_riders ?? [])
        .map((cr) =>
          cr.riders ? { id: cr.riders.id, points: riderTotals.get(cr.riders.id) ?? 0 } : null,
        )
        .filter((x): x is { id: string; points: number } => Boolean(x))
        .sort((a, b) => b.points - a.points);
      const optimal = candidates.slice(0, cat.max_picks);
      dreamTotal += optimal.reduce((s, r) => s + r.points, 0);
      for (const cr of cat.category_riders ?? []) {
        if (cr.riders) categoryRiderIds.add(cr.riders.id);
      }
    }

    // 2b) 2 jokers — beste renners die in geen categorie zitten
    const jokerPool = allGameRiders
      .filter((r) => !categoryRiderIds.has(r.id))
      .map((r) => ({ id: r.id, points: riderTotals.get(r.id) ?? 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 2);
    dreamTotal += jokerPool.reduce((s, r) => s + r.points, 0);

    if (dreamTotal === 0) return null;

    // 3) mijn totaal in deze game
    const approvedIds = new Set(approvedStages.map((s) => s.id));
    let myPoints = 0;
    for (const sp of allStagePoints) {
      if (sp.entry_id === entry.id && approvedIds.has(sp.stage_id)) {
        myPoints += sp.points ?? 0;
      }
    }
    return Math.round((myPoints / dreamTotal) * 100);
  }, [stages, categories, allStageResults, allGameRiders, allStagePoints, entry]);

  // ── Wielerdirecteur (exact dezelfde formule als HorsCategorieTab) ──────────
  const directorScore = useMemo<number | null>(() => {
    if (!isLive || !entry || !monte) return null;
    const n = totals.length;
    const myRank = n > 0 ? totals.filter((t) => t > myStageTotal).length + 1 : 1;
    const poolScore = n <= 1 ? 0.75 : (n - myRank) / (n - 1);
    const monkeyScore = monte.beatPct / 100;
    let jokerScore = 0.5;
    if (jokerIds.length > 0) {
      const ownerships = jokerIds.map((jid) => {
        const stat = jokerStats.find((j) => j.rider_id === jid);
        return stat ? stat.joker_count / Math.max(1, stat.total_entries) : 0.1;
      });
      const avgOwn = ownerships.reduce((a, b) => a + b, 0) / ownerships.length;
      const monkeyBonus = monte.beatPct > 60 ? 0.15 : 0;
      jokerScore = Math.min(1, 0.4 + (1 - avgOwn) * 0.4 + monkeyBonus);
    }
    const raw = poolScore * 0.5 + monkeyScore * 0.3 + jokerScore * 0.2;
    return Math.max(3.0, Math.round((raw * 9 + 1) * 10) / 10);
  }, [isLive, entry, monte, totals, myStageTotal, jokerIds, jokerStats]);

  return {
    monkeyBeatPct: monte ? Math.round(monte.beatPct) : null,
    emiratesPct,
    directorScore,
    isLoading,
  };
}
