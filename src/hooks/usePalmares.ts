import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type StageDagzege = {
  stage_id: string;
  stage_number: number;
  stage_name: string | null;
  stage_type: string | null;
  date: string | null;
  points: number;
};

export type PalmaresGame = {
  game_id: string;
  game_name: string;
  game_type: string | null;
  year: number | null;
  status: string;
  entry_id: string;
  approved_points: number;
  my_rank: number;
  total_participants: number;
  stage_wins: number;
  stage_podiums: number;
  best_stage_points: number;
  dagzeges: StageDagzege[];
};

export type PalmaresSubpoule = {
  subpoule_id: string;
  subpoule_name: string;
  game_id: string;
  game_name: string;
  game_type: string | null;
  my_rank: number;
  total_members: number;
  is_winner: boolean;
  stage_wins: number;
  stage_podiums: number;
};

export function usePalmares() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["palmares", user?.id],
    enabled: Boolean(supabase && user?.id),
    queryFn: async (): Promise<{ games: PalmaresGame[]; subpoules: PalmaresSubpoule[] }> => {
      if (!supabase || !user?.id) return { games: [], subpoules: [] };

      // 1) All my submitted entries
      const { data: myEntries, error: e1 } = await supabase
        .from("entries")
        .select("id, game_id, status")
        .eq("user_id", user.id);
      if (e1) throw e1;
      const entries = (myEntries ?? []).filter((e) => e.status === "submitted");
      if (entries.length === 0) return { games: [], subpoules: [] };

      const gameIds = Array.from(new Set(entries.map((e) => e.game_id)));

      // 2) Games metadata
      const { data: games } = await supabase
        .from("games")
        .select("id, name, game_type, year, status")
        .in("id", gameIds);
      const gameMap = new Map((games ?? []).map((g) => [g.id, g]));

      // 3) All submitted entries per game (for ranking)
      const { data: allEntries } = await supabase
        .from("entries")
        .select("id, game_id, user_id")
        .in("game_id", gameIds)
        .eq("status", "submitted");

      // 4) Stage points — only for admin-approved stages
      type SPRow = {
        entry_id: string;
        stage_id: string;
        points: number;
        stages: {
          game_id: string;
          stage_number: number;
          name: string | null;
          stage_type: string | null;
          date: string | null;
        };
      };

      const { data: rawSP } = await supabase
        .from("stage_points")
        .select(
          "entry_id, stage_id, points, stages!inner(game_id, stage_number, name, stage_type, date, results_status)"
        )
        .in("stages.game_id", gameIds)
        .eq("stages.results_status", "approved");

      const stagePoints = (rawSP ?? []) as unknown as SPRow[];

      // Index: stage_id → sorted [{ entry_id, points }]
      const stageGroups = new Map<string, { entry_id: string; points: number }[]>();
      type StageMeta = { game_id: string; stage_number: number; name: string | null; stage_type: string | null; date: string | null };
      const stageMeta = new Map<string, StageMeta>();

      for (const sp of stagePoints) {
        if (!stageGroups.has(sp.stage_id)) stageGroups.set(sp.stage_id, []);
        stageGroups.get(sp.stage_id)!.push({ entry_id: sp.entry_id, points: sp.points });
        if (!stageMeta.has(sp.stage_id)) stageMeta.set(sp.stage_id, sp.stages);
      }
      for (const arr of stageGroups.values()) arr.sort((a, b) => b.points - a.points);

      // Approved points sum per entry (used for ranking)
      const approvedPtsMap = new Map<string, number>();
      for (const ranked of stageGroups.values()) {
        for (const r of ranked) {
          approvedPtsMap.set(r.entry_id, (approvedPtsMap.get(r.entry_id) ?? 0) + r.points);
        }
      }

      // Lookup: game_id → my submitted entry_id (used in subpoule loop to ensure we
      // always reference the same entry that has rows in stageGroups)
      const myEntryByGameId = new Map(entries.map((e) => [e.game_id, e.id]));

      // 5) Build per-game palmares
      const palmaresGames: PalmaresGame[] = entries
        .map((myEntry) => {
          const game = gameMap.get(myEntry.game_id);
          if (!game) return null;

          const gameEntries = (allEntries ?? []).filter((e) => e.game_id === myEntry.game_id);
          const ranked = gameEntries
            .map((e) => ({ id: e.id, pts: approvedPtsMap.get(e.id) ?? 0 }))
            .sort((a, b) => b.pts - a.pts);
          const myRank = ranked.findIndex((e) => e.id === myEntry.id) + 1;

          let wins = 0;
          let podiums = 0;
          let bestStage = 0;
          const dagzeges: StageDagzege[] = [];

          for (const [stageId, stageRanked] of stageGroups) {
            const meta = stageMeta.get(stageId);
            if (!meta || meta.game_id !== myEntry.game_id) continue;
            const idx = stageRanked.findIndex((r) => r.entry_id === myEntry.id);
            if (idx === -1) continue;
            const pts = stageRanked[idx].points;
            if (pts > bestStage) bestStage = pts;
            if (idx === 0 && pts > 0) {
              wins++;
              dagzeges.push({
                stage_id: stageId,
                stage_number: meta.stage_number,
                stage_name: meta.name,
                stage_type: meta.stage_type,
                date: meta.date,
                points: pts,
              });
            }
            if (idx <= 2 && pts > 0) podiums++;
          }
          dagzeges.sort((a, b) => a.stage_number - b.stage_number);

          return {
            game_id: game.id,
            game_name: game.name,
            game_type: game.game_type ?? null,
            year: game.year ?? null,
            status: game.status,
            entry_id: myEntry.id,
            approved_points: approvedPtsMap.get(myEntry.id) ?? 0,
            my_rank: myRank || gameEntries.length,
            total_participants: gameEntries.length,
            stage_wins: wins,
            stage_podiums: podiums,
            best_stage_points: bestStage,
            dagzeges,
          };
        })
        .filter((p): p is PalmaresGame => p !== null);

      // 6) Subpoules where I am a member
      const { data: myMemberships } = await supabase
        .from("subpoule_members")
        .select("subpoule_id, subpoules!inner(id, name, game_id)")
        .eq("user_id", user.id);

      type MembershipRow = {
        subpoule_id: string;
        subpoules: { id: string; name: string; game_id: string };
      };
      const memberships = (myMemberships ?? []) as unknown as MembershipRow[];
      const subpouleIds = memberships.map((m) => m.subpoule_id);

      const { data: allMembers } = subpouleIds.length
        ? await supabase
            .from("subpoule_members")
            .select("subpoule_id, user_id")
            .in("subpoule_id", subpouleIds)
        : { data: [] };

      // Fetch ALL entries for subpoule member users without a status filter — this
      // ensures the per-stage subpoule ranking uses the same population that exists
      // in stage_points, which is not limited to "submitted" entries.
      const allMemberUserIds = Array.from(new Set((allMembers ?? []).map((mm) => mm.user_id)));
      const { data: subpouleMemberEntries } = allMemberUserIds.length
        ? await supabase
            .from("entries")
            .select("id, game_id, user_id")
            .in("game_id", gameIds)
            .in("user_id", allMemberUserIds)
        : { data: [] };
      const subpouleMemberEntriesArr = (subpouleMemberEntries ?? []) as Array<{ id: string; game_id: string; user_id: string }>;

      const palmaresSubpoules: PalmaresSubpoule[] = memberships
        .map((m) => {
          const sp = m.subpoules;
          const game = gameMap.get(sp.game_id);
          if (!game) return null;

          // Use the same submitted entry ID as the poule section — this is the entry
          // that has rows in stageGroups (stage_points references submitted entries).
          const mySubmittedEntryId = myEntryByGameId.get(sp.game_id);
          if (!mySubmittedEntryId) return null;

          const memberUserIds = new Set(
            (allMembers ?? [])
              .filter((mm) => mm.subpoule_id === sp.id)
              .map((mm) => mm.user_id)
          );

          // Overall rank + total_members: submitted entries only (same source as poule ranking)
          const memberEntriesSubmitted = (allEntries ?? []).filter(
            (e) => e.game_id === sp.game_id && memberUserIds.has(e.user_id)
          );
          if (!memberEntriesSubmitted.some((e) => e.id === mySubmittedEntryId)) return null;

          const subRanked = memberEntriesSubmitted
            .map((e) => ({ id: e.id, pts: approvedPtsMap.get(e.id) ?? 0 }))
            .sort((a, b) => b.pts - a.pts);
          const myRank = subRanked.findIndex((e) => e.id === mySubmittedEntryId) + 1;

          // Per-stage dagzeges/podiums: include all member entries (mirroring how stageGroups
          // is built from all stage_points rows regardless of entry status)
          const memberEntryIdsAll = new Set(
            subpouleMemberEntriesArr
              .filter((e) => e.game_id === sp.game_id && memberUserIds.has(e.user_id))
              .map((e) => e.id)
          );
          let wins = 0;
          let podiums = 0;

          for (const [stageId, stageRanked] of stageGroups) {
            const meta = stageMeta.get(stageId);
            if (!meta || meta.game_id !== sp.game_id) continue;
            const subGroupRanked = stageRanked.filter((r) => memberEntryIdsAll.has(r.entry_id));
            if (subGroupRanked.length === 0) continue;
            const idx = subGroupRanked.findIndex((r) => r.entry_id === mySubmittedEntryId);
            if (idx === -1) continue;
            const pts = subGroupRanked[idx].points;
            if (idx === 0 && pts > 0) wins++;
            if (idx <= 2 && pts > 0) podiums++;
          }

          return {
            subpoule_id: sp.id,
            subpoule_name: sp.name,
            game_id: sp.game_id,
            game_name: game.name,
            game_type: game.game_type ?? null,
            my_rank: myRank || memberEntriesSubmitted.length,
            total_members: memberEntriesSubmitted.length,
            is_winner: myRank === 1,
            stage_wins: wins,
            stage_podiums: podiums,
          };
        })
        .filter((p): p is PalmaresSubpoule => p !== null);

      return { games: palmaresGames, subpoules: palmaresSubpoules };
    },
  });
}
