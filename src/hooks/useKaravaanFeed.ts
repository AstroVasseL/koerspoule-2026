import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type KaravaanRanking = {
  entry_id: string;
  rank: number;
  team_name: string;
  display_name: string | null;
  points: number;
  delta_rank: number; // positief = gestegen, negatief = gezakt, 0 = gelijk
  is_me: boolean;
};

export type KaravaanEtappe = {
  stage_id: string;
  stage_number: number;
  stage_name: string | null;
  approved_at: string;
  michel_tekst: string | null;
  jose_tekst: string | null;
  subpouleStandings: KaravaanRanking[];
  overallStandings: KaravaanRanking[];
  personalFlash: PersonalFlash | null;
};

export type PersonalFlash = {
  kind: "stijging" | "daling" | "podium" | "off-podium" | "leider" | "verloren-leider";
  rank: number;
  delta: number;
  context: "subpoule" | "overall";
};

export type MiniStripData = {
  subpoule: { rank: number; delta: number };
  overall: { rank: number; delta: number };
  points: number;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * De Karavaan-feed: bouwt chronologisch overzicht op per gefiatteerde etappe
 * voor de huidige user × subpoule × game. Computeert klassement-deltas en
 * persoonlijke flashes client-side uit bestaande tabellen.
 */
export function useKaravaanFeed(params: {
  gameId: string | undefined;
  subpouleId: string | undefined;
  userId: string | undefined;
}) {
  const { gameId, subpouleId, userId } = params;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["karavaan-feed", gameId, subpouleId, userId],
    enabled: Boolean(supabase && gameId && subpouleId && userId),
    staleTime: 30 * 1000,
    queryFn: async (): Promise<{
      etappes: KaravaanEtappe[];
      ministrip: MiniStripData | null;
      myEntryId: string | null;
      lastVisited: string | null;
    }> => {
      if (!supabase || !gameId || !subpouleId || !userId) {
        return { etappes: [], ministrip: null, myEntryId: null, lastVisited: null };
      }

      // 1. Gefiatteerde etappes (chronologisch)
      const { data: stagesRaw } = await supabase
        .from("stages")
        .select("id, stage_number, name, approved_at, results_status")
        .eq("game_id", gameId)
        .eq("results_status", "approved")
        .order("stage_number", { ascending: true });
      const approvedStages = (stagesRaw ?? []) as Array<{
        id: string;
        stage_number: number;
        name: string | null;
        approved_at: string;
      }>;
      if (approvedStages.length === 0) {
        return { etappes: [], ministrip: null, myEntryId: null, lastVisited: null };
      }
      const stageIds = approvedStages.map((s) => s.id);
      const stageById = new Map(approvedStages.map((s) => [s.id, s]));

      // 2. Subpoule members (om scope te bepalen)
      const { data: memberRows } = await supabase
        .from("subpoule_members")
        .select("user_id")
        .eq("subpoule_id", subpouleId);
      const subpouleUserIds = ((memberRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
      if (subpouleUserIds.length === 0) {
        return { etappes: [], ministrip: null, myEntryId: null, lastVisited: null };
      }

      // 3. Alle entries in deze game (voor overall + subpoule scope)
      const { data: entryRows } = await supabase
        .from("entries")
        .select("id, user_id, team_name")
        .eq("game_id", gameId);
      const allEntries = (entryRows ?? []) as Array<{ id: string; user_id: string; team_name: string | null }>;

      // 4. Profiles voor display_name
      const allUserIds = Array.from(new Set(allEntries.map((e) => e.user_id)));
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, display_name, last_visited_karavaan")
        .in("id", allUserIds.length > 0 ? allUserIds : [userId]);
      const profileById = new Map(
        (profileRows ?? []).map((p: any) => [p.id as string, p as { id: string; display_name: string | null; last_visited_karavaan: string | null }]),
      );

      const myProfile = profileById.get(userId);
      const lastVisited = myProfile?.last_visited_karavaan ?? null;

      // 5. Stage points (per-etappe, voor cumulatieve deltas in oudere stages)
      const { data: spRows } = await supabase
        .from("stage_points")
        .select("entry_id, stage_id, points")
        .in("stage_id", stageIds);
      const stagePoints = (spRows ?? []) as Array<{ entry_id: string; stage_id: string; points: number }>;

      // 5b. Officiële totalen per entry — zelfde RPC als Uitslagen-tab gebruikt.
      // Bevat alle bonussen (classification-voorspellingen e.d.) naast stage-punten.
      const { data: standingsRows } = await (supabase as any).rpc("game_entries_standings", {
        p_game_id: gameId,
      });
      const officialTotalByEntry = new Map<string, number>();
      for (const r of (standingsRows ?? []) as Array<{ id: string; total_points: number }>) {
        officialTotalByEntry.set(r.id, r.total_points ?? 0);
      }

      // Cumulatieve totalen per entry, per stage — terugrekenen vanuit de
      // officiële totalen (RPC = zelfde bron als Uitslagen). Voor de laatste
      // etappe = officieel totaal; oudere etappes = officieel totaal min stage-
      // punten die ná dat moment zijn verdiend. Zo matcht ELKE etappe Uitslagen
      // op classification-bonussen incl., en blijven deltas correct.
      const sortedStages = [...approvedStages].sort((a, b) => a.stage_number - b.stage_number);
      const cumByEntryByStage = new Map<string, Map<string, number>>(); // entry_id -> stage_id -> cum
      for (const entry of allEntries) {
        const inner = new Map<string, number>();
        let running = officialTotalByEntry.get(entry.id) ?? 0;
        for (let i = sortedStages.length - 1; i >= 0; i--) {
          const stage = sortedStages[i];
          inner.set(stage.id, running);
          const pts = stagePoints.find((sp) => sp.entry_id === entry.id && sp.stage_id === stage.id)?.points ?? 0;
          running -= pts;
        }
        cumByEntryByStage.set(entry.id, inner);
      }

      const myEntry = allEntries.find((e) => e.user_id === userId);
      const myEntryId = myEntry?.id ?? null;

      // Helper: bouw ranglijst op basis van de teruggerekende cumulatieve
      // totalen (per-stage snapshot, inclusief classification-bonussen).
      const buildRanking = (entryIds: string[], stageId: string): KaravaanRanking[] => {
        const rows = entryIds.map((eid) => {
          const entry = allEntries.find((e) => e.id === eid)!;
          const prof = profileById.get(entry.user_id);
          const points = cumByEntryByStage.get(eid)?.get(stageId) ?? 0;
          const teamName = entry.team_name?.trim() || prof?.display_name?.trim() || "Naamloze ploeg";
          return {
            entry_id: eid,
            team_name: teamName,
            display_name: prof?.display_name ?? null,
            points,
            is_me: entry.user_id === userId,
          };
        });
        rows.sort((a, b) => b.points - a.points);
        return rows.map((r, i) => ({ ...r, rank: i + 1, delta_rank: 0 }));
      };

      // 6. Bouw per stage een subpoule-ranking en overall-ranking
      const subpouleEntryIds = allEntries
        .filter((e) => subpouleUserIds.includes(e.user_id))
        .map((e) => e.id);
      const allEntryIds = allEntries.map((e) => e.id);

      const etappes: KaravaanEtappe[] = [];

      for (let i = 0; i < sortedStages.length; i++) {
        const stage = sortedStages[i];
        const sub = buildRanking(subpouleEntryIds, stage.id);
        const overall = buildRanking(allEntryIds, stage.id);

        // Bereken delta_rank t.o.v. vorige stage (positief = gestegen = ↑)
        if (i > 0) {
          const prevStage = sortedStages[i - 1];
          const prevSub = buildRanking(subpouleEntryIds, prevStage.id);
          const prevOverall = buildRanking(allEntryIds, prevStage.id);
          const prevRankSub = new Map(prevSub.map((r) => [r.entry_id, r.rank]));
          const prevRankOver = new Map(prevOverall.map((r) => [r.entry_id, r.rank]));
          for (const r of sub) r.delta_rank = (prevRankSub.get(r.entry_id) ?? r.rank) - r.rank;
          for (const r of overall) r.delta_rank = (prevRankOver.get(r.entry_id) ?? r.rank) - r.rank;
        }

        // Persoonlijke flash detecteren — focus op subpoule
        let personalFlash: PersonalFlash | null = null;
        const myRowSub = sub.find((r) => r.is_me);
        if (myRowSub && i > 0) {
          const myDelta = myRowSub.delta_rank;
          const myRank = myRowSub.rank;
          if (myRank === 1 && myDelta > 0) {
            personalFlash = { kind: "leider", rank: 1, delta: myDelta, context: "subpoule" };
          } else if (myRank <= 3 && myRank + myDelta > 3) {
            personalFlash = { kind: "podium", rank: myRank, delta: myDelta, context: "subpoule" };
          } else if (myRank > 3 && myRank - myDelta <= 3 && myDelta < 0) {
            personalFlash = { kind: "off-podium", rank: myRank, delta: myDelta, context: "subpoule" };
          } else if (myDelta >= 2) {
            personalFlash = { kind: "stijging", rank: myRank, delta: myDelta, context: "subpoule" };
          } else if (myDelta <= -2) {
            personalFlash = { kind: "daling", rank: myRank, delta: myDelta, context: "subpoule" };
          }
        }

        // Etappe-commentaar (uit eerder gebouwde tabel)
        const { data: commentRows } = await (supabase as any)
          .from("etappe_commentaren")
          .select("michel_tekst, jose_tekst")
          .eq("stage_id", stage.id)
          .eq("subpoule_id", subpouleId)
          .maybeSingle();
        const michel = (commentRows as any)?.michel_tekst ?? null;
        const jose = (commentRows as any)?.jose_tekst ?? null;

        etappes.push({
          stage_id: stage.id,
          stage_number: stage.stage_number,
          stage_name: stage.name,
          approved_at: stage.approved_at,
          michel_tekst: michel,
          jose_tekst: jose,
          subpouleStandings: sub,
          overallStandings: overall,
          personalFlash,
        });
      }

      // 7. Mini-strip: baseer op de laatste etappe
      let ministrip: MiniStripData | null = null;
      if (myEntryId && etappes.length > 0) {
        const last = etappes[etappes.length - 1];
        const sub = last.subpouleStandings.find((r) => r.is_me);
        const over = last.overallStandings.find((r) => r.is_me);
        if (sub && over) {
          ministrip = {
            subpoule: { rank: sub.rank, delta: sub.delta_rank },
            overall: { rank: over.rank, delta: over.delta_rank },
            points: sub.points,
          };
        }
      }

      // Nieuwste eerst voor weergave
      etappes.reverse();
      return { etappes, ministrip, myEntryId, lastVisited };
    },
  });

  // Realtime: vernieuw bij nieuwe commentaren of stage_points
  useEffect(() => {
    if (!supabase || !subpouleId) return;
    const ch = supabase
      .channel(`karavaan-${subpouleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "etappe_commentaren", filter: `subpoule_id=eq.${subpouleId}` },
        () => qc.invalidateQueries({ queryKey: ["karavaan-feed", gameId, subpouleId, userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId, subpouleId, userId, qc]);

  return query;
}

// ─── Helper: markeer bezoek ──────────────────────────────────────────────────

export async function markKaravaanVisited() {
  if (!supabase) return;
  try {
    await (supabase as any).rpc("touch_karavaan_visit");
  } catch (e) {
    // Faalt stil — geen blocking, gewoon volgende keer opnieuw proberen
    console.warn("touch_karavaan_visit failed", e);
  }
}

// ─── Helper: bepaal "nieuwe items"-grens ─────────────────────────────────────

export function findNewMarkerIndex(etappes: KaravaanEtappe[], lastVisited: string | null): number {
  // Returnt de index waar de "nieuw sinds laatste bezoek"-lijn moet komen,
  // of -1 als er niets te markeren is.
  if (!lastVisited) return -1;
  const lastTs = new Date(lastVisited).getTime();
  // etappes is nieuw → oud gesorteerd; we vinden de eerste oude
  for (let i = 0; i < etappes.length; i++) {
    const t = new Date(etappes[i].approved_at).getTime();
    if (t <= lastTs) return i;
  }
  // Alles is nieuw — marker zou dan helemaal onderaan komen, niet bovenaan
  return etappes.length > 0 ? etappes.length : -1;
}
