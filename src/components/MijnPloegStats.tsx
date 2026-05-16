import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useEntries, useStages, useStagePoints } from "@/hooks/useResults";
import { usePointsSchema } from "@/hooks/usePointsSchema";
import { useSubpoules, useSubpouleMembers } from "@/hooks/useSubpoules";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

// ── Pure helpers ──────────────────────────────────────────────────────────────

function buildCumMap(
  stages: Array<{ id: string }>,
  stagePoints: Array<{ stage_id: string; entry_id: string; points: number }>,
  upToIdx: number
): Map<string, number> {
  const allowed = new Set(stages.slice(0, upToIdx + 1).map((s) => s.id));
  const m = new Map<string, number>();
  stagePoints
    .filter((sp) => allowed.has(sp.stage_id))
    .forEach((sp) => m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points));
  return m;
}

function rankInMap(
  map: Map<string, number>,
  entryId: string,
  pool: Array<{ id: string }>
): number {
  const sorted = pool.map((e) => ({ id: e.id, pts: map.get(e.id) ?? 0 })).sort((a, b) => b.pts - a.pts);
  return sorted.findIndex((e) => e.id === entryId) + 1;
}

// ── Animation hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 650, delay = 0) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>();
  const triggered = useRef(false);

  useEffect(() => {
    if (target <= 0 || triggered.current) return;
    triggered.current = true;
    const t0 = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
        setVal(Math.round(target * eased));
        if (p < 1) raf.current = requestAnimationFrame(tick);
        else setVal(target);
      };
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(t0);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  // target > 0 triggers once when data arrives; after that the ref blocks re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target > 0]);

  return val;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Delta({ n }: { n: number }) {
  if (n === 0) return <span className="text-[10px] font-bold tabular-nums" style={{ color: "#9A9A9A" }}>—</span>;
  return (
    <span
      className="inline-flex items-center gap-px text-[10px] font-bold tabular-nums leading-none"
      style={{ color: n > 0 ? "#2E8B57" : "#C0392B" }}
    >
      {n > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {Math.abs(n)}
    </span>
  );
}

function rankColor(rank: number | null): string {
  if (rank === 1) return "hsl(var(--primary))";
  if (rank !== null && rank <= 3) return "hsl(var(--vintage-gold))";
  return "hsl(25 20% 12%)";
}

function StatCard({
  label,
  delay,
  isEmpty,
  children,
}: {
  label: string;
  delay: number;
  isEmpty: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded-[5px] opacity-0 min-h-[88px]"
      style={{
        background: "hsl(var(--bg-wielerdirecteur))",
        border: "1px solid #C8B89A",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        animation: `ploegStatsFadeIn 0.45s ease-out ${delay}ms forwards`,
      }}
    >
      <span
        className="text-[9px] tracking-[0.25em] uppercase font-mono font-bold leading-none"
        style={{ color: "#8B7355" }}
      >
        {label}
      </span>
      {isEmpty ? (
        <span className="font-display text-3xl font-black leading-none" style={{ color: "#C8B89A" }}>
          —
        </span>
      ) : children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MijnPloegStats() {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { entry, jokerIds, picksByCategory } = useEntry(game?.id);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: allStagePoints = [] } = useStagePoints(game?.id);
  const { data: schema = [] } = usePointsSchema(game?.id);
  const { subpoules } = useSubpoules(game?.id);
  const firstSubpoule = subpoules[0] ?? null;
  const { data: subpouleMembers = [] } = useSubpouleMembers(firstSubpoule?.id);

  // All picked + joker rider IDs
  const allRiderIds = useMemo(() => {
    const set = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) set.add(id);
    for (const id of jokerIds) set.add(id);
    return Array.from(set);
  }, [picksByCategory, jokerIds]);

  // All stage results for my riders — needed for best-scorer calc
  const { data: ridersAllResults = [] } = useQuery({
    queryKey: ["my-riders-all-stage-results", entry?.id, allRiderIds.slice().sort().join(",")],
    enabled: Boolean(supabase && entry?.id && allRiderIds.length > 0),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!supabase || !allRiderIds.length) return [];
      const { data } = await supabase
        .from("stage_results")
        .select("rider_id, finish_position, stage_id, riders(name)")
        .in("rider_id", allRiderIds)
        .not("finish_position", "is", null);
      return (data ?? []) as Array<{
        rider_id: string;
        finish_position: number;
        stage_id: string;
        riders: { name: string } | null;
      }>;
    },
  });

  const myEntry = useMemo(() => entries.find((e) => e.user_id === user?.id), [entries, user?.id]);

  // Stages that actually have any points recorded
  const stagesWithData = useMemo(() => {
    const totals = new Map<string, number>();
    allStagePoints.forEach((sp) => totals.set(sp.stage_id, (totals.get(sp.stage_id) ?? 0) + sp.points));
    return stages.filter((s) => (totals.get(s.id) ?? 0) > 0);
  }, [stages, allStagePoints]);

  // ── STAT 1: Best stage rank in the full pool ──────────────────────────────
  const bestStageRank = useMemo(() => {
    if (!myEntry || !allStagePoints.length || !stages.length) return null;

    const perStage = new Map<string, Map<string, number>>();
    allStagePoints.forEach((sp) => {
      if (!perStage.has(sp.stage_id)) perStage.set(sp.stage_id, new Map());
      const m = perStage.get(sp.stage_id)!;
      m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points);
    });

    let best: { rank: number; stageId: string } | null = null;
    perStage.forEach((entryPts, stageId) => {
      const myPts = entryPts.get(myEntry.id) ?? 0;
      if (myPts === 0) return;
      const sorted = [...entryPts.entries()].sort((a, b) => b[1] - a[1]);
      const rank = sorted.findIndex(([id]) => id === myEntry.id) + 1;
      if (!best || rank < best.rank) best = { rank, stageId };
    });

    if (!best) return null;
    const stage = stages.find((s) => s.id === best!.stageId);
    return { rank: best.rank, stage: stage ?? null };
  }, [myEntry, allStagePoints, stages]);

  // ── STAT 2: Overall pool rank + delta ────────────────────────────────────
  const overallStat = useMemo(() => {
    if (!myEntry || !entries.length) return null;
    const sorted = [...entries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
    const rank = sorted.findIndex((e) => e.id === myEntry.id) + 1;
    if (!rank) return null;

    let delta = 0;
    if (stagesWithData.length >= 2) {
      const lastIdx = stages.indexOf(stagesWithData[stagesWithData.length - 1]);
      const prevIdx = stages.indexOf(stagesWithData[stagesWithData.length - 2]);
      const curMap = buildCumMap(stages, allStagePoints, lastIdx);
      const prevMap = buildCumMap(stages, allStagePoints, prevIdx);
      delta = rankInMap(prevMap, myEntry.id, entries) - rankInMap(curMap, myEntry.id, entries);
    }

    return { rank, total: entries.length, delta };
  }, [myEntry, entries, stagesWithData, stages, allStagePoints]);

  // ── STAT 3: Subpoule rank + delta ────────────────────────────────────────
  const subpouleStat = useMemo(() => {
    if (!myEntry || !firstSubpoule || !subpouleMembers.length) return null;

    const memberUserIds = new Set(subpouleMembers.map((m) => m.user_id));
    const memberEntries = entries.filter((e) => memberUserIds.has(e.user_id));
    if (!memberEntries.length) return null;

    const sorted = [...memberEntries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
    const rank = sorted.findIndex((e) => e.id === myEntry.id) + 1;
    if (!rank) return null;

    let delta = 0;
    if (stagesWithData.length >= 2) {
      const memberEntryIds = new Set(memberEntries.map((e) => e.id));
      const lastIdx = stages.indexOf(stagesWithData[stagesWithData.length - 1]);
      const prevIdx = stages.indexOf(stagesWithData[stagesWithData.length - 2]);

      const subCum = (upToIdx: number) => {
        const allowed = new Set(stages.slice(0, upToIdx + 1).map((s) => s.id));
        const m = new Map<string, number>();
        allStagePoints
          .filter((sp) => allowed.has(sp.stage_id) && memberEntryIds.has(sp.entry_id))
          .forEach((sp) => m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points));
        return m;
      };

      delta = rankInMap(subCum(prevIdx), myEntry.id, memberEntries) - rankInMap(subCum(lastIdx), myEntry.id, memberEntries);
    }

    return { rank, total: memberEntries.length, name: firstSubpoule.name, delta };
  }, [myEntry, firstSubpoule, subpouleMembers, entries, stagesWithData, stages, allStagePoints]);

  // ── STAT 4: Best scoring rider ───────────────────────────────────────────
  const bestRiderStat = useMemo(() => {
    if (!schema.length || !ridersAllResults.length) return null;

    const jokerSet = new Set(jokerIds);
    const ptsTable = new Map(
      schema.filter((s) => s.classification === "stage").map((s) => [s.position, s.points])
    );

    const riderTotals = new Map<string, { pts: number; name: string }>();
    for (const r of ridersAllResults) {
      const base = ptsTable.get(r.finish_position) ?? 0;
      if (base === 0) continue;
      const pts = jokerSet.has(r.rider_id) ? base * 2 : base;
      const name = (r.riders as { name: string } | null)?.name ?? "—";
      const cur = riderTotals.get(r.rider_id);
      riderTotals.set(r.rider_id, { pts: (cur?.pts ?? 0) + pts, name: cur?.name ?? name });
    }

    let best: { pts: number; name: string } | null = null;
    for (const info of riderTotals.values()) {
      if (!best || info.pts > best.pts) best = info;
    }
    return best?.pts ? best : null;
  }, [schema, ridersAllResults, jokerIds]);

  // ── Animated counters ─────────────────────────────────────────────────────
  const aBestRank     = useCountUp(bestStageRank?.rank ?? 0,  650,   0);
  const aOverallRank  = useCountUp(overallStat?.rank ?? 0,    650,  80);
  const aSubpouleRank = useCountUp(subpouleStat?.rank ?? 0,   650, 160);
  const aRiderPts     = useCountUp(bestRiderStat?.pts ?? 0,   650, 240);

  if (!entry || !user) return null;

  const Num = ({ n, rank }: { n: number; rank: number | null }) => (
    <span className="font-display font-black leading-none tabular-nums" style={{ fontSize: "2rem", color: rankColor(rank) }}>
      {n}<span style={{ fontSize: "1.3rem" }}>e</span>
    </span>
  );

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">

      {/* 1 — Beste etappe */}
      <StatCard label="Beste etappe" delay={0} isEmpty={!bestStageRank}>
        {bestStageRank && (
          <>
            <Num n={aBestRank} rank={bestStageRank.rank} />
            <span className="text-[10px] font-mono leading-tight" style={{ color: "#8B7355" }}>
              {bestStageRank.stage
                ? `Rit ${bestStageRank.stage.stage_number}${bestStageRank.stage.name ? ` · ${bestStageRank.stage.name}` : ""}`
                : "—"}
            </span>
          </>
        )}
      </StatCard>

      {/* 2 — Overall poule */}
      <StatCard label="Overall poule" delay={80} isEmpty={!overallStat}>
        {overallStat && (
          <>
            <div className="flex items-baseline gap-2">
              <Num n={aOverallRank} rank={overallStat.rank} />
              <Delta n={overallStat.delta} />
            </div>
            <span className="text-[10px] font-mono leading-tight" style={{ color: "#8B7355" }}>
              van {overallStat.total} deelnemers
            </span>
          </>
        )}
      </StatCard>

      {/* 3 — Subpoule */}
      <StatCard label="Subpoule" delay={160} isEmpty={!subpouleStat}>
        {subpouleStat && (
          <>
            <div className="flex items-baseline gap-2">
              <Num n={aSubpouleRank} rank={subpouleStat.rank} />
              <Delta n={subpouleStat.delta} />
            </div>
            <span className="text-[10px] font-mono leading-tight truncate" style={{ color: "#8B7355" }}>
              van {subpouleStat.total} · {subpouleStat.name}
            </span>
          </>
        )}
      </StatCard>

      {/* 4 — Topscorer */}
      <StatCard label="Topscorer" delay={240} isEmpty={!bestRiderStat}>
        {bestRiderStat && (
          <>
            <span
              className={cn("font-display font-black leading-tight", bestRiderStat.name.length > 12 ? "text-base" : "text-lg")}
              style={{ color: rankColor(1) }}
            >
              {bestRiderStat.name}
            </span>
            <span className="text-[10px] font-mono" style={{ color: "#8B7355" }}>
              +{aRiderPts} pts totaal
            </span>
          </>
        )}
      </StatCard>

    </div>
  );
}
