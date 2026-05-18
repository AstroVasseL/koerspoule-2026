import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, ReferenceLine,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStagePoints, useStages } from "@/hooks/useResults";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Lock, Activity, Trophy, BarChart3, Sparkles, Info, X, Swords,
} from "lucide-react";
import BenchmarkTab from "@/components/BenchmarkTab";
import { MobielTabBalk } from "@/components/MobielTabBalk";

// ─── Types ──────────────────────────────────────────────────────────────────

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };
type JokerStat = { rider_id: string; joker_count: number; total_entries: number };
type StagePoint = { entry_id: string; points: number };
type PredictionStat = { classification: string; position: number; rider_id: string; pick_count: number; total_entries: number };

// ─── Ownership colour (unchanged) ────────────────────────────────────────────

function ownershipColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const intensity = 1 - clamped / 100;
  const alpha = 0.18 + intensity * 0.7;
  return `hsl(var(--vintage-gold) / ${alpha.toFixed(2)})`;
}

const CLASSIFICATION_META: Array<{ key: "gc" | "points" | "kom" | "youth"; label: string; emoji: string; tint: string }> = [
  { key: "gc",     label: "Eindwinnaar",  emoji: "🏆", tint: "from-primary/20 to-[hsl(var(--vintage-gold))/0.15]" },
  { key: "points", label: "Groene trui",  emoji: "🟢", tint: "from-emerald-500/15 to-emerald-500/5" },
  { key: "kom",    label: "Bolletjestrui",emoji: "🔴", tint: "from-rose-500/15 to-rose-500/5" },
  { key: "youth",  label: "Witte trui",   emoji: "⚪", tint: "from-slate-200/30 to-slate-200/10" },
];

// ─── Data hooks (all unchanged) ───────────────────────────────────────────────

function usePredictionStats(gameId?: string) {
  return useQuery({
    queryKey: ["game-prediction-stats", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PredictionStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_prediction_stats", { p_game_id: gameId });
      if (error) throw error;
      return (data ?? []) as PredictionStat[];
    },
  });
}
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
      const { data, error } = await supabase
        .from("stage_points")
        .select("entry_id, points, stages!inner(game_id)")
        .eq("stages.game_id", gameId);
      if (error) throw error;
      const totalsByEntry = new Map<string, number>();
      for (const row of (data ?? []) as unknown as StagePoint[]) {
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
function useRiderNames(ids: string[]) {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ["hc-rider-names", sorted],
    enabled: sorted.length > 0,
    queryFn: async () => {
      if (!supabase) return [] as Array<{ id: string; name: string; team: string | null }>;
      const { data, error } = await supabase.from("riders").select("id, name, team").in("id", sorted);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; team: string | null }>;
    },
  });
}

// ─── Monte Carlo helpers (unchanged) ─────────────────────────────────────────

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

// ─── Visual helpers ───────────────────────────────────────────────────────────

function snapToBucket(dist: Array<{ bucket: number }>, value: number): number {
  return dist.reduce((best, b) =>
    Math.abs(b.bucket - value) < Math.abs(best.bucket - value) ? b : best
  ).bucket;
}

function getNickname(beatPct: number) {
  if (beatPct >= 99) return { title: "Koningsklasse",      emoji: "👑", good: true };
  if (beatPct >= 90) return { title: "Wielerdirecteur",    emoji: "🏆", good: true };
  if (beatPct >= 70) return { title: "Aap-Slayer",         emoji: "⚔️", good: true };
  if (beatPct >= 50) return { title: "Menselijk Voordeel", emoji: "💪", good: true };
  if (beatPct >= 30) return { title: "Nek-aan-Nek",        emoji: "🤝", good: false };
  if (beatPct >= 10) return { title: "Monkey Business",    emoji: "🐒", good: false };
  return                    { title: "Koersinstinct",      emoji: "🎯", good: false };
}

// SVG semicircle gauge — animates on mount
function PercentileGauge({ pct }: { pct: number }) {
  const r = 50, cx = 65, cy = 62, sw = 9;
  const circ = Math.PI * r;
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setAnimated(true)); return () => cancelAnimationFrame(id); }, []);
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const color = pct >= 50 ? "#34d399" : "#f43f5e";
  return (
    <svg viewBox="0 0 130 72" className="w-full max-w-[200px] mx-auto">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={sw} strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${animated ? offset : circ}`}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)" }} />
      <text x={cx - r} y={cy + 13} fontSize="8" fill="#888" textAnchor="middle">0%</text>
      <text x={cx + r} y={cy + 13} fontSize="8" fill="#888" textAnchor="middle">100%</text>
    </svg>
  );
}

// Premium stat card on light background
function DarkStatCard({
  label, value, unit, icon, description, accentColor,
}: {
  label: string; value: string; unit?: string; icon: string;
  description: string; accentColor: string;
}) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-card p-4 flex flex-col",
      accentColor === "gold"  && "border-[hsl(var(--vintage-gold))/0.25]",
      accentColor === "blue"  && "border-sky-500/25",
      accentColor === "green" && "border-emerald-500/25",
      accentColor === "red"   && "border-rose-500/25",
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl leading-none">{icon}</span>
        <span className={cn(
          "text-[9px] uppercase tracking-[0.2em] font-semibold",
          accentColor === "gold"  && "text-[hsl(var(--vintage-gold))]",
          accentColor === "blue"  && "text-sky-600",
          accentColor === "green" && "text-emerald-600",
          accentColor === "red"   && "text-rose-600",
        )}>{label}</span>
      </div>
      <div className={cn(
        "font-display text-3xl font-bold tabular-nums",
        accentColor === "gold"  && "text-[hsl(var(--vintage-gold))]",
        accentColor === "blue"  && "text-sky-600",
        accentColor === "green" && "text-emerald-600",
        accentColor === "red"   && "text-rose-600",
      )}>{value}</div>
      {unit && <div className="text-muted-foreground text-xs mt-0.5">{unit}</div>}
      <p className="text-muted-foreground text-[11px] mt-3 leading-relaxed flex-1">{description}</p>
    </div>
  );
}

// ─── Custom tab icon ─────────────────────────────────────────────────────────

function DirectorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="3" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="5.5" y="1.5" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="3.5" y="9.5" width="2" height="2.5" rx="0.3" fill="currentColor" opacity="0.5"/>
      <rect x="7" y="7.5" width="2" height="4.5" rx="0.3" fill="currentColor" opacity="0.7"/>
      <rect x="10.5" y="5.5" width="2" height="6.5" rx="0.3" fill="currentColor"/>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HorsCategorieTab() {
  const { data: game } = useCurrentGame();
  const isLive = Boolean(game?.status && ["live", "locked", "finished", "closed"].includes(String(game.status)));
  const { entry, picksByCategory, jokerIds, predictions: myPredictions } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const { data: pickStats = [] } = usePickStats(isLive ? game?.id : undefined);
  const { data: jokerStats = [] } = useJokerStats(isLive ? game?.id : undefined);
  const { data: predictionStats = [] } = usePredictionStats(isLive ? game?.id : undefined);
  const { data: totals = [] } = useEntryTotals(isLive ? game?.id : undefined);
  const { data: myStageTotal = 0 } = useMyStagePointTotal(entry?.id);

  // Stage-by-stage timeline data
  const { data: stages = [] } = useStages(isLive ? game?.id : undefined);
  const { data: allStagePoints = [] } = useStagePoints(isLive ? game?.id : undefined);

  const myPickedRiderIds = useMemo(() => {
    const s = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) s.add(id);
    for (const id of jokerIds) s.add(id);
    return s;
  }, [picksByCategory, jokerIds]);

  const myPredictionMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of myPredictions) m.set(`${p.classification}:${p.position}`, p.rider_id);
    return m;
  }, [myPredictions]);

  const allRiderIdsSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of pickStats) s.add(p.rider_id);
    for (const j of jokerStats) s.add(j.rider_id);
    for (const p of predictionStats) s.add(p.rider_id);
    for (const arr of picksByCategory.values()) for (const id of arr) s.add(id);
    for (const id of jokerIds) s.add(id);
    for (const p of myPredictions) s.add(p.rider_id);
    return Array.from(s);
  }, [pickStats, jokerStats, predictionStats, picksByCategory, jokerIds, myPredictions]);
  const { data: riders = [] } = useRiderNames(allRiderIdsSet);
  const ridersById = useMemo(() => Object.fromEntries(riders.map((r) => [r.id, r])), [riders]);

  // ── Monte Carlo (logic unchanged) ──────────────────────────────────────────
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
    for (let i = 0; i < N; i++) {
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
    const mean = randomScores.reduce((a, b) => a + b, 0) / randomScores.length;
    const mid = Math.floor(randomScores.length / 2);
    const median = randomScores.length % 2 === 0
      ? (randomScores[mid - 1] + randomScores[mid]) / 2
      : randomScores[mid];
    const top10cut = randomScores[Math.floor(randomScores.length * 0.9)];
    const beatPct = randomScores.length === 0
      ? 0 : (randomScores.filter((s) => userActual > s).length / randomScores.length) * 100;
    const aboveMedian = userActual > median ? 100 : 0;
    const top10 = userActual > top10cut;
    const worseThanApe = beatPct < 50;
    const min = randomScores[0];
    const max = randomScores[randomScores.length - 1];
    const buckets = 20;
    const step = Math.max(1, (max - min) / buckets);
    const dist = Array.from({ length: buckets }, (_, i) => {
      const from = min + i * step;
      const to = from + step;
      const count = randomScores.filter((s) => s >= from && s < to).length;
      return { bucket: Math.round((from + to) / 2), count };
    });
    return { mean, median, top10cut, beatPct, top10, worseThanApe, aboveMedian, userActual, dist };
  }, [categories, pickStats, totals, picksByCategory, myStageTotal, game?.id]);

  // ── Stage timeline ──────────────────────────────────────────────────────────
  const stageTimeline = useMemo(() => {
    if (!entry?.id || stages.length === 0 || allStagePoints.length === 0) return [];
    const myPts = new Map<string, number>();
    const allPts = new Map<string, number[]>();
    for (const sp of allStagePoints) {
      if (sp.entry_id === entry.id) myPts.set(sp.stage_id, (myPts.get(sp.stage_id) ?? 0) + sp.points);
      const arr = allPts.get(sp.stage_id) ?? [];
      arr.push(sp.points);
      allPts.set(sp.stage_id, arr);
    }
    const approved = stages
      .filter((s) => s.results_status === "approved")
      .sort((a, b) => a.stage_number - b.stage_number);
    let userCum = 0, avgCum = 0;
    return approved.map((s) => {
      const u = myPts.get(s.id) ?? 0;
      const pool = allPts.get(s.id) ?? [];
      const avg = pool.length ? pool.reduce((a, b) => a + b, 0) / pool.length : 0;
      userCum += u; avgCum += avg;
      return { stage: `E${s.stage_number}`, user: userCum, avg: Math.round(avgCum), userDelta: u, avgDelta: Math.round(avg) };
    });
  }, [entry?.id, stages, allStagePoints]);

  // ── Derived display values ──────────────────────────────────────────────────
  const diffPct = monte && monte.mean > 0 ? ((monte.userActual - monte.mean) / monte.mean) * 100 : 0;
  const isBeating = diffPct >= 0;
  const nickname = monte ? getNickname(monte.beatPct) : null;
  const oneInX = monte && monte.beatPct < 99.5
    ? Math.max(2, Math.round(100 / Math.max(0.1, 100 - monte.beatPct))) : null;

  // ── Section 2: Pelotonkeuzes ────────────────────────────────────────────────
  const pickStatsByCat = useMemo(() => {
    const m = new Map<string, PickStat[]>();
    for (const p of pickStats) {
      const arr = m.get(p.category_id) ?? [];
      arr.push(p);
      m.set(p.category_id, arr);
    }
    for (const [k, list] of m) m.set(k, list.sort((a, b) => b.pick_count - a.pick_count));
    return m;
  }, [pickStats]);

  // ── Section 3: Wielerdirecteur ──────────────────────────────────────────────
  const directorAnalysis = useMemo(() => {
    if (!isLive || !entry || picksByCategory.size === 0) return null;
    const myPickIds = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) myPickIds.add(id);
    const ownershipByRider = new Map<string, number>();
    const totalEntries = pickStats[0]?.total_entries ?? 1;
    for (const p of pickStats) ownershipByRider.set(p.rider_id, p.pick_count / Math.max(1, totalEntries));
    const myOwnerships = Array.from(myPickIds).map((rid) => ownershipByRider.get(rid) ?? 0);
    const avgOwn = myOwnerships.length ? myOwnerships.reduce((a, b) => a + b, 0) / myOwnerships.length : 0;
    const uniques = myOwnerships.filter((o) => o < 0.15).length;
    const labels: string[] = [];
    if (uniques >= 4) labels.push("Pure chaos");
    if (avgOwn > 0.45) labels.push("Pelotonkoers");
    if (avgOwn < 0.25) labels.push("Aanvallende ploeg");
    const lines: string[] = [];
    if (avgOwn > 0.5) lines.push("Je peloton kiest wat iedereen kiest. Een veilige bidon, geen spektakel.");
    else if (avgOwn < 0.2) lines.push("Met deze differentiëlen mik je óf op het podium óf op de bezemwagen.");
    if (uniques >= 3) lines.push(`${uniques} renners die nauwelijks iemand koos. Lef of waanzin?`);
    const day = new Date().getDate();
    const quotes = [
      "Vandaag zou jouw ploeg waarschijnlijk lossen op de eerste col.",
      "Je ploeg ademt: all-in op chaos.",
      "Vier sprinters meenemen naar deze bergen? Ambitieuze tactiek.",
      "Het peloton vertrouwt op Pogačar. Jij vertrouwt op hoop.",
      "Deze ploeg heeft de organisatie van een vroege vlucht in een regenrit.",
    ];
    return { labels, lines, quote: quotes[day % quotes.length] };
  }, [isLive, entry, picksByCategory, pickStats]);

  // ── Director Report Score ────────────────────────────────────────────────────
  const directorScore = useMemo(() => {
    if (!isLive || !entry || !monte) return null;

    // Pool Ranking (50%): 0 = last place, 1 = first place
    const n = totals.length;
    const myRank = n > 0 ? totals.filter((t) => t > myStageTotal).length + 1 : 1;
    const poolScore = n <= 1 ? 0.75 : (n - myRank) / (n - 1);

    // Monkey comparison (30%)
    const monkeyScore = monte.beatPct / 100;

    // Joker performance (20%): differentiation × monkey bonus
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
    const score = Math.max(3.0, Math.round((raw * 9 + 1) * 10) / 10);
    const toSub = (v: number) => Math.max(1.0, Math.round((v * 9 + 1) * 10) / 10);

    const analysisMap: Array<[number, string]> = [
      [9.0, "Koningsklasse prestatie — jouw peloton rijdt vooraan. De simulatieapen trillen in hun startblokken en je klassement spreekt boekdelen. Ik had je zelf kunnen samenstellen."],
      [8.0, "Uitstekend directeurswerk dit seizoen. Je klassement loopt voor op het peloton en de dartpijlaap zit in de volgauto. Met wat meer differentiëlen pak je de overwinning."],
      [7.0, "Solide Giro tot dusver. Je scoort boven de mediaan, je renners rijden hun loon bij elkaar. We zien ons op de Zoncolan."],
      [6.0, "Respectabele prestatie — de directeur knikt, maar kijkt scherp. Je ploeg levert, al is de marge dunner dan de bandjes van Tadej op de Col de la Loze."],
      [5.0, "Midveld, en dat is eerlijk gezegd precies wat het voelt. De apen rijden mee op jouw wiel — niet verloren, maar ook geen sprint voor de zege."],
      [4.0, "Moeilijk parcours voor jouw ploeg dit seizoen. De simulatieapen presteren vergelijkbaar en je klassering staat onder druk. Herbezin je voor de volgende editie."],
      [0.0, "Zwaar seizoen. De cijfers liegen niet, en ik evenmin. Je ploeg verliest op alle fronten. De bezemwagen wacht — maar Rome werd ook niet in één dag gebouwd."],
    ];
    const analysis = analysisMap.find(([t]) => score >= t)?.[1] ?? analysisMap[analysisMap.length - 1][1];

    return {
      score,
      poolScore, monkeyScore, jokerScore,
      poolSubScore: toSub(poolScore),
      monkeySubScore: toSub(monkeyScore),
      jokerSubScore: toSub(jokerScore),
      analysis,
      rankLabel: `Rang #${myRank} van ${n}`,
      beatLabel: `${monte.beatPct.toFixed(0)}% apen verslagen`,
      jokerLabel: jokerIds.length === 0 ? "Geen jokers" : `${jokerIds.length} joker${jokerIds.length > 1 ? "s" : ""}`,
    };
  }, [isLive, entry, monte, totals, myStageTotal, jokerIds, jokerStats]);

  // ── Sub-tab state (must be declared before any early return to keep hook order stable) ──
  const [activeTab, setActiveTab] = useState<"dartpijl" | "pelotonkeuzes" | "wielerdirecteur" | "benchmark">("dartpijl");
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  // ── Locked state ─────────────────────────────────────────────────────────────
  if (!isLive) {
    return (
      <Card className="ornate-frame retro-border">
        <CardContent className="p-8 text-center space-y-3">
          <Lock className="h-10 w-10 text-muted-foreground/60 mx-auto" />
          <p className="font-display text-xl font-bold">Hors Catégorie nog vergrendeld</p>
          <p className="text-sm text-muted-foreground font-serif italic">
            De data cave gaat open zodra de admin de inschrijving sluit en de koers live zet.
          </p>
        </CardContent>
      </Card>
    );
  }


  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">

      {/* ── Sub-tab navigation ─────────────────────────────────────────────── */}

      {/* Mobile — MobielTabBalk (scrollable chips) */}
      <div className="md:hidden">
        <MobielTabBalk
          tabs={[
            { key: "dartpijl",        label: "Dartpijl",          icon: Activity     },
            { key: "pelotonkeuzes",   label: "Pelotonkeuzes",     icon: BarChart3    },
            { key: "wielerdirecteur", label: "De Wielerdirecteur", icon: DirectorIcon },
            { key: "benchmark",       label: "Benchmark",          icon: Swords       },
          ]}
          active={activeTab}
          onChange={(k) => setActiveTab(k as typeof activeTab)}
        />
      </div>

      {/* Desktop — bestaande chip-balk ongewijzigd */}
      <div className="hidden md:block overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1 rounded-xl border-2 border-foreground/15 bg-secondary/30 p-1 min-w-max md:min-w-0 md:w-full">
          {(
            [
              { key: "dartpijl"        as const, label: "Dartpijl",           short: "Dart",    Icon: Activity     },
              { key: "pelotonkeuzes"   as const, label: "Pelotonkeuzes",      short: "Peloton", Icon: BarChart3    },
              { key: "wielerdirecteur" as const, label: "De Wielerdirecteur",  short: "CEO",    Icon: DirectorIcon },
              { key: "benchmark"       as const, label: "Benchmark",           short: "Bench",   Icon: Swords       },
            ]
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-3 min-h-[44px] text-xs font-semibold uppercase tracking-wider transition-colors flex-1",
                activeTab === key
                  ? "bg-card text-foreground shadow-sm border border-foreground/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Benchmark ───────────────────────────────────────────────── */}
      {activeTab === "benchmark" && (
        <BenchmarkTab gameId={game?.id} />
      )}

      {/* ── Tab 1: Dartpijl (Monte Carlo) ───────────────────────────────────── */}
      {activeTab === "dartpijl" && (
        <div className="space-y-5">
          {!monte ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
              <span className="text-4xl">🐒</span>
              <p className="text-muted-foreground text-sm mt-3 font-serif italic">Nog onvoldoende data om de apen te laten gooien.</p>
            </div>
          ) : (
          <>
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-6 md:p-8">
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-black text-foreground mb-1">
                  🐒 De aap met de dartpijl
                </h2>
                <p className="text-sm text-muted-foreground mb-5">Monte Carlo Simulatie — 5000 simulaties</p>
                <div className={cn(
                  "font-display tabular-nums font-black leading-none mb-2",
                  "text-5xl md:text-6xl",
                  isBeating ? "text-emerald-600" : "text-rose-600"
                )}>
                  {isBeating ? "+" : ""}{diffPct.toFixed(0)}%
                </div>
                <p className="text-foreground/80 text-sm font-medium">
                  {isBeating ? "beter" : "slechter"} dan de gemiddelde aap
                </p>
                <p className="text-muted-foreground/70 text-xs mt-1.5 font-mono">
                  jij {monte.userActual} pt &nbsp;·&nbsp; gem. aap {Math.round(monte.mean)} pt
                </p>
              </div>

              {nickname && (
                <div className="text-center shrink-0">
                  <div className="text-5xl mb-2">{nickname.emoji}</div>
                  <div className={cn(
                    "font-display text-xl font-bold",
                    nickname.good ? "text-emerald-600" : "text-rose-600"
                  )}>{nickname.title}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mt-1">prestatieklasse</div>
                </div>
              )}
            </div>
          </div>

          {/* Distribution chart + Percentile gauge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Distribution chart */}
            <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-border bg-card p-4 md:p-5">
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  <BarChart3 className="h-3 w-3" />
                  Verdeling · 5.000 willekeurige ploegen
                </div>
                <h3 className="font-display text-foreground text-base sm:text-lg mb-1">Aapscore distributie</h3>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Bars links van jou (goud) zijn apen die jij verslaat
                </p>
                <div style={{ height: 190 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monte.dist} margin={{ top: 16, right: 4, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hc-bar-beat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        </linearGradient>
                        <linearGradient id="hc-bar-lose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(0,0,0,0.18)" />
                          <stop offset="100%" stopColor="rgba(0,0,0,0.04)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.08)" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        content={(props: any) => {
                          const { active, payload } = props;
                          if (!active || !payload?.length) return null;
                          const { bucket, count } = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-border backdrop-blur-xl px-3 py-2 text-xs text-foreground shadow-xl" style={{ background: "hsl(var(--card))" }}>
                              <div className="font-mono font-bold text-foreground">{bucket} pt</div>
                              <div className="text-foreground/70">{count} apen</div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={24} animationDuration={800}>
                        {monte.dist.map((b, i) => (
                          <Cell key={i} fill={b.bucket <= monte.userActual ? "url(#hc-bar-beat)" : "url(#hc-bar-lose)"} />
                        ))}
                      </Bar>
                      {/* Reference lines AFTER Bar so they render on top */}
                      {/* Root cause fix: x must match an exact bucket value (categorical axis) */}
                      {/* Jouw score — amber, solid, thick */}
                      <ReferenceLine
                        x={snapToBucket(monte.dist, monte.userActual)}
                        stroke="#fbbf24"
                        strokeWidth={3}
                        label={(props: any) => {
                          const { viewBox } = props;
                          const lx = viewBox?.x ?? 0;
                          const ly = (viewBox?.y ?? 0) + 6;
                          return (
                            <g>
                              <rect x={lx - 34} y={ly} width={68} height={16} rx={3} fill="#fbbf24" />
                              <text x={lx} y={ly + 11} fill="#1c1400" fontSize={9} fontWeight={800} textAnchor="middle">
                                {`Jij · ${monte.userActual} pt`}
                              </text>
                            </g>
                          );
                        }}
                      />
                      {/* Gemiddelde — sky blue, dashed */}
                      <ReferenceLine
                        x={snapToBucket(monte.dist, Math.round(monte.mean))}
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        strokeDasharray="5 3"
                        label={(props: any) => {
                          const { viewBox } = props;
                          const lx = viewBox?.x ?? 0;
                          const ly = (viewBox?.y ?? 0) + 26;
                          return (
                            <g>
                              <rect x={lx - 34} y={ly} width={70} height={16} rx={3} fill="#38bdf8" />
                              <text x={lx} y={ly + 11} fill="#001a27" fontSize={9} fontWeight={800} textAnchor="middle">
                                {`Gem. · ${Math.round(monte.mean)} pt`}
                              </text>
                            </g>
                          );
                        }}
                      />
                      {/* Mediaan — green, dashed */}
                      <ReferenceLine
                        x={snapToBucket(monte.dist, monte.median)}
                        stroke="#4ade80"
                        strokeWidth={2.5}
                        strokeDasharray="5 3"
                        label={(props: any) => {
                          const { viewBox } = props;
                          const lx = viewBox?.x ?? 0;
                          const ly = (viewBox?.y ?? 0) + 46;
                          return (
                            <g>
                              <rect x={lx - 34} y={ly} width={70} height={16} rx={3} fill="#4ade80" />
                              <text x={lx} y={ly + 11} fill="#001a00" fontSize={9} fontWeight={800} textAnchor="middle">
                                {`Med. · ${Math.round(monte.median)} pt`}
                              </text>
                            </g>
                          );
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-foreground/80">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-3 rounded-sm bg-[#fbbf24]" />
                    Jou ({monte.userActual} pt)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-px w-4 border-t-2 border-dashed border-[#38bdf8]" />
                    Gemiddelde ({Math.round(monte.mean)} pt)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-px w-4 border-t-2 border-dashed border-[#4ade80]" />
                    Mediaan ({Math.round(monte.median)} pt)
                  </span>
                </div>
              </div>
            </div>

            {/* Monkey IQ */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex flex-col gap-0">
              <div className="relative flex flex-col h-full">
                <div className="text-base font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">🧠 Monkey IQ</div>

                <div className="mb-1 text-[11px] text-muted-foreground">Jij verslaat</div>
                <div className={cn(
                  "font-display font-black tabular-nums leading-none text-5xl",
                  monte.beatPct >= 50 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {Math.round((monte.beatPct / 100) * 5000).toLocaleString("nl-NL")}
                </div>
                <div className="text-muted-foreground text-xs mt-1.5 mb-4">van de 5.000 apen</div>

                <div className={cn(
                  "font-display font-black tabular-nums text-2xl leading-none",
                  monte.beatPct >= 50 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {monte.beatPct.toFixed(1)}%
                </div>
                <div className="text-muted-foreground text-[10px] mt-0.5 mb-5">van de simulaties verslagen</div>

                {nickname && (
                  <div className={cn(
                    "mt-auto rounded-xl border px-3 py-3 text-center",
                    nickname.good
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-rose-300 bg-rose-50"
                  )}>
                    <div className="text-3xl mb-1.5 leading-none">{nickname.emoji}</div>
                    <div className={cn(
                      "font-display text-sm font-bold",
                      nickname.good ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {nickname.title}
                    </div>
                    <div className="text-muted-foreground/70 text-[9px] uppercase tracking-[0.2em] mt-1">prestatieklasse</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats row: mean · median · fun */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DarkStatCard
              label="Gemiddelde aap"
              value={`${Math.round(monte.mean)}`}
              unit="punten"
              icon="🎯"
              description="Verwacht puntentotaal bij volledig willekeurige rennersselectie op basis van de pool van ingediende teams."
              accentColor="gold"
            />
            <DarkStatCard
              label="Mediaan aap"
              value={`${Math.round(monte.median)}`}
              unit="punten"
              icon="📊"
              description="De middelste aap van 5.000. Minder gevoelig voor uitschieters dan het gemiddelde — een eerlijkere maatstaf."
              accentColor="blue"
            />
            <DarkStatCard
              label={monte.worseThanApe ? "Verlies van de aap" : "Jij vs de aap"}
              value={monte.worseThanApe
                ? `−${Math.abs(Math.round(monte.userActual - monte.mean))} pt`
                : `+${Math.round(monte.userActual - monte.mean)} pt`}
              unit={monte.worseThanApe ? "onder gemiddelde aap" : "boven gemiddelde aap"}
              icon={monte.worseThanApe ? "😬" : "🏆"}
              description={monte.worseThanApe
                ? "Een willekeurige dartpijl had grofweg hetzelfde resultaat. De apen zijn blij."
                : oneInX
                  ? `Slechts 1 op ${oneInX} willekeurige apen scoort hoger dan jij. Dartpijlen staan paf.`
                  : "Uitstekend resultaat — je overtreft het gros van de willekeurige ploegen."}
              accentColor={monte.worseThanApe ? "red" : "green"}
            />
          </div>

          {/* Stage timeline */}
          {stageTimeline.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 md:p-5">
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  <Activity className="h-3 w-3" />
                  Etappe voor etappe
                </div>
                <h3 className="font-display text-foreground text-base sm:text-lg mb-0.5">Jij vs de Gemiddelde Aap</h3>
                <p className="text-[11px] text-muted-foreground mb-4">Cumulatieve punten per goedgekeurde etappe</p>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stageTimeline} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#bbb" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#bbb" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ stroke: "rgba(0,0,0,0.15)", strokeWidth: 1 }}
                        content={(props: any) => {
                          const { active, payload, label } = props;
                          if (!active || !payload?.length) return null;
                          const row = payload[0]?.payload;
                          return (
                            <div className="rounded-xl border border-border backdrop-blur-xl px-3 py-2 text-xs text-foreground shadow-xl space-y-1" style={{ background: "hsl(var(--card))" }}>
                              <div className="font-mono font-bold text-foreground mb-1">{label}</div>
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ background: "hsl(var(--vintage-gold))" }} />
                                <span className="text-foreground/70">Jij</span>
                                <span className="ml-auto font-bold text-foreground">{row.user} pt</span>
                                {row.userDelta > 0 && <span className="text-emerald-600 text-[10px]">+{row.userDelta}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-secondary/60" />
                                <span className="text-foreground/70">Gem. aap</span>
                                <span className="ml-auto font-bold text-foreground/80">{row.avg} pt</span>
                                {row.avgDelta > 0 && <span className="text-muted-foreground text-[10px]">+{row.avgDelta}</span>}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="user" name="Jij"
                        stroke="hsl(var(--vintage-gold))" strokeWidth={2.5}
                        dot={false} activeDot={{ r: 5, fill: "hsl(var(--vintage-gold))", strokeWidth: 0 }}
                        animationDuration={1000} animationEasing="ease-out" />
                      <Line type="monotone" dataKey="avg" name="Gem. aap"
                        stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} strokeDasharray="5 4"
                        dot={false} activeDot={{ r: 4, fill: "rgba(0,0,0,0.3)", strokeWidth: 0 }}
                        animationDuration={1000} animationEasing="ease-out" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-5 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 rounded" style={{ background: "hsl(var(--vintage-gold))" }} />
                    Jouw score
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5" style={{ borderTop: "1.5px dashed rgba(0,0,0,0.25)" }} />
                    Gemiddelde aap
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Commentary */}
          {(monte.worseThanApe || monte.top10) && (
            <div className={cn(
              "rounded-xl border px-4 py-3 text-sm font-serif italic",
              monte.top10
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-rose-300 bg-rose-50 text-rose-700"
            )}>
              {monte.worseThanApe && <span>"Eh… een gemiddelde dartpijl had het ook niet slechter gedaan." 🎯</span>}
              {monte.top10 && <span>"Top 10% van de apen — die dartpijl van jou heeft visie." 🔥</span>}
            </div>
          )}
        </>
          )}
        </div>
      )}

      {/* ── Tab 2: Pelotonkeuzes ─────────────────────────────────────────────── */}
      {activeTab === "pelotonkeuzes" && (
      <Card className="ornate-frame retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Pelotonkeuzes
          </CardTitle>
          <p className="text-xs text-muted-foreground font-serif italic">
            Volg ik hier het peloton of wijk ik juist af? Donker = zeldzame keuze, licht = pelotonlieveling.
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest font-serif text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(5) }} /> Zeldzaam
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(50) }} /> Gemiddeld
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(95) }} /> Pelotonlieveling
            </span>
            <span className="flex items-center gap-1.5 ml-auto">
              <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-primary text-primary-foreground text-[8px] font-bold">★</span>
              Jouw keuze
            </span>
          </div>

          {pickStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen ingediende ploegen.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => {
                const list = (pickStatsByCat.get(cat.id) ?? []).slice(0, 6);
                const totalEntries = list[0]?.total_entries ?? 1;
                if (list.length === 0) return null;
                return (
                  <div key={cat.id} className="rounded-lg border-2 border-border bg-secondary/20 p-3">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">{cat.short_name ?? cat.name}</p>
                    <div className="space-y-2">
                      {list.map((p) => {
                        const pct = (p.pick_count / Math.max(1, totalEntries)) * 100;
                        const rider = ridersById[p.rider_id];
                        const mine = myPickedRiderIds.has(p.rider_id);
                        const badge =
                          pct >= 70 ? "Iedereen-en-z'n-moeder"
                          : pct >= 40 ? "Pelotonlieveling"
                          : pct <= 10 ? "Verborgen parel"
                          : pct <= 25 ? "Differentieel"
                          : null;
                        return (
                          <div key={p.rider_id} className={cn(
                            "rounded-md p-2 transition-all",
                            mine
                              ? "ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.35)] bg-primary/5 border border-primary/40"
                              : "border border-transparent"
                          )}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="font-display font-bold truncate flex items-center gap-1.5">
                                {mine && <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">★</span>}
                                {rider?.name ?? "Onbekend"}
                              </span>
                              <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full transition-all duration-500" style={{ width: `${Math.max(6, pct)}%`, background: ownershipColor(pct) }} />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
                              {mine && <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20">Jouw keuze</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {jokerStats.length > 0 && (
                <div className="rounded-lg border-2 border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.08] p-3 md:col-span-2">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">🃏 Meest gekozen jokers</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[...jokerStats].sort((a, b) => b.joker_count - a.joker_count).slice(0, 6).map((j) => {
                      const pct = (j.joker_count / Math.max(1, j.total_entries)) * 100;
                      const rider = ridersById[j.rider_id];
                      const mine = jokerIds.includes(j.rider_id);
                      return (
                        <div key={j.rider_id} className={cn(
                          "flex items-center justify-between gap-2 text-sm bg-card rounded p-2 border",
                          mine ? "border-primary ring-2 ring-primary/40 shadow-[0_0_10px_hsl(var(--primary)/0.25)]" : "border-border"
                        )}>
                          <span className="font-display font-bold truncate flex items-center gap-1.5">
                            {mine && <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">★</span>}
                            {rider?.name ?? "Onbekend"}
                          </span>
                          <span className="font-mono text-xs tabular-nums">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voorspellingen */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-[hsl(var(--vintage-gold))]" />
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Voorspellingen · Eindklassement &amp; truien
              </p>
            </div>
            {predictionStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen voorspellingen ingediend.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CLASSIFICATION_META.map((meta) => {
                  const rows = predictionStats.filter((p) => p.classification === meta.key);
                  if (rows.length === 0) return null;
                  const totalEntries = rows[0]?.total_entries ?? 1;
                  const top = [...rows].sort((a, b) => b.pick_count - a.pick_count).slice(0, 4);
                  return (
                    <div key={meta.key} className={cn("rounded-lg border-2 border-border p-3 bg-gradient-to-br", meta.tint)}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <span className="text-base leading-none">{meta.emoji}</span>
                          {meta.label}
                        </p>
                        {meta.key === "gc" && <span className="text-[9px] font-mono text-muted-foreground">positie 1–3</span>}
                      </div>
                      <div className="space-y-1.5">
                        {top.map((p) => {
                          const pct = (p.pick_count / Math.max(1, totalEntries)) * 100;
                          const rider = ridersById[p.rider_id];
                          const mine = myPredictionMap.get(`${meta.key}:${p.position}`) === p.rider_id;
                          const label = pct >= 60 ? "Consensus" : pct <= 8 ? "Outsider" : pct <= 20 ? "Differentieel" : null;
                          return (
                            <div key={`${p.rider_id}-${p.position}`} className={cn(
                              "rounded-md p-2 transition-all",
                              mine ? "ring-2 ring-primary bg-primary/5 border border-primary/40" : "border border-transparent bg-card/40"
                            )}>
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="font-display font-bold truncate flex items-center gap-1.5">
                                  {meta.key === "gc" && <span className="text-[10px] font-mono text-muted-foreground tabular-nums">P{p.position}</span>}
                                  {mine && <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">★</span>}
                                  <span className="truncate">{rider?.name ?? "Onbekend"}</span>
                                </span>
                                <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                              </div>
                              <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className="h-full transition-all duration-500" style={{ width: `${Math.max(4, pct)}%`, background: ownershipColor(pct) }} />
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {label && <Badge variant="outline" className="text-[10px]">{label}</Badge>}
                                {mine && <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20">Jouw keuze</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* ── Tab 3: De Wielerdirecteur ────────────────────────────────────────── */}
      {activeTab === "wielerdirecteur" && (
      <Card className="ornate-frame retro-border overflow-hidden" style={{ background: "hsl(var(--bg-wielerdirecteur))" }}>
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <DirectorIcon className="h-5 w-5 text-primary" /> De Wielerdirecteur
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* ── Director Report Score ──────────────────────────────────────── */}
          {directorScore && (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 md:p-6">
              {/* Grade + analysis */}
              <div className="relative flex flex-col md:flex-row items-start gap-5">
                <div className="shrink-0">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Rapport</div>
                  <div className={cn(
                    "font-display text-7xl font-black tabular-nums leading-none",
                    directorScore.score >= 8 ? "text-emerald-600" :
                    directorScore.score >= 6 ? "text-amber-600" :
                    directorScore.score >= 4 ? "text-orange-600" : "text-rose-600"
                  )}>
                    {directorScore.score.toFixed(1)}
                  </div>
                  <div className="text-muted-foreground/70 text-xs mt-1 font-mono">van de 10</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Directeursanalyse</div>
                  <p className="text-foreground text-sm font-serif italic leading-relaxed">"{directorScore.analysis}"</p>
                </div>
              </div>
              {/* Metric breakdown */}
              <div className="relative mt-5 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">Score opbouw</div>
                  <button
                    type="button"
                    onClick={() => setShowScoreInfo((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors",
                      showScoreInfo
                        ? "bg-secondary border-border text-foreground"
                        : "bg-sky-100 border-sky-300 text-sky-700 hover:bg-sky-200"
                    )}
                  >
                    {showScoreInfo ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                    {showScoreInfo ? "Sluiten" : "Hoe werkt dit?"}
                  </button>
                </div>

                {/* Explanation panel */}
                {showScoreInfo && (
                  <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3 text-[11px] text-foreground/70 leading-relaxed">
                    <p className="text-foreground font-semibold text-xs">Hoe wordt de score berekend?</p>
                    <p>De rapportscore loopt van <span className="text-foreground font-mono">1.0</span> tot <span className="text-foreground font-mono">10.0</span> (minimum 3.0) en is opgebouwd uit drie gewogen onderdelen.</p>
                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        <span className="shrink-0">🏆</span>
                        <div>
                          <span className="text-foreground font-semibold">Pool Ranking · 50%</span>
                          <p className="mt-0.5">Jouw positie in de pool ten opzichte van alle andere deelnemers. Rang 1 geeft de maximale bijdrage, de laatste plek de minimale.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0">🐒</span>
                        <div>
                          <span className="text-foreground font-semibold">Monkey Vergelijking · 30%</span>
                          <p className="mt-0.5">Het percentage van 5.000 willekeurige simulatieploegen dat jij verslaat. Meer dan 60% verslaan geeft een extra bonus op de Joker score.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0">🃏</span>
                        <div>
                          <span className="text-foreground font-semibold">Joker Prestatie · 20%</span>
                          <p className="mt-0.5">Hoe zeldzaam jouw jokers zijn in de pool — renners die weinig anderen kozen scoren hoger. Een populaire joker (hoge ownership) verlaagt de deelscore.</p>
                        </div>
                      </div>
                    </div>

                    {/* Berekening knop */}
                    <button
                      type="button"
                      onClick={() => setShowCalc((v) => !v)}
                      className="mt-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      {showCalc ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                      {showCalc ? "Verberg formules" : "Berekening"}
                    </button>

                    {showCalc && (
                      <div className="rounded-lg border border-amber-200 bg-secondary/60 p-3 space-y-3 font-mono text-[10px] text-foreground/70 leading-relaxed">
                        <p className="text-amber-700 font-semibold text-[11px] not-italic">Exacte formules</p>

                        <div className="space-y-1">
                          <p className="text-muted-foreground uppercase tracking-widest text-[9px]">Pool Ranking (50%)</p>
                          <p className="text-foreground">poolScore = (N − rang) / (N − 1)</p>
                          <p className="text-muted-foreground text-[9px]">N = aantal deelnemers · rang = jouw positie</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-muted-foreground uppercase tracking-widest text-[9px]">Monkey Vergelijking (30%)</p>
                          <p className="text-foreground">monkeyScore = beatPct / 100</p>
                          <p className="text-muted-foreground text-[9px]">beatPct = % van 5.000 sim-ploegen verslagen</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-muted-foreground uppercase tracking-widest text-[9px]">Joker Prestatie (20%)</p>
                          <p className="text-foreground">jokerScore = min(1, 0.4 + (1 − avgOwn) × 0.4 + bonus)</p>
                          <p className="text-muted-foreground text-[9px]">avgOwn = gem. ownership jokers · bonus = 0.15 als beatPct &gt; 60%</p>
                          <p className="text-muted-foreground text-[9px]">Geen jokers → jokerScore = 0.5</p>
                        </div>

                        <div className="border-t border-border pt-2 space-y-1">
                          <p className="text-muted-foreground uppercase tracking-widest text-[9px]">Eindscore</p>
                          <p className="text-foreground">raw = poolScore×0.5 + monkeyScore×0.3 + jokerScore×0.2</p>
                          <p className="text-foreground">score = max(3.0, round((raw × 9 + 1) × 10) / 10)</p>
                          <p className="text-muted-foreground text-[9px]">Schaal 1.0 – 10.0 · minimum 3.0</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {[
                  { label: "Pool Ranking",       sub: directorScore.rankLabel,  pct: directorScore.poolScore,   val: directorScore.poolSubScore,   w: 50 },
                  { label: "Monkey Vergelijking", sub: directorScore.beatLabel,  pct: directorScore.monkeyScore, val: directorScore.monkeySubScore, w: 30 },
                  { label: "Joker Prestatie",     sub: directorScore.jokerLabel, pct: directorScore.jokerScore,  val: directorScore.jokerSubScore,  w: 20 },
                ].map(({ label, sub, pct, val, w }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-36 shrink-0">
                      <div className="text-foreground/70 text-xs font-medium leading-none mb-0.5">{label}</div>
                      <div className="text-muted-foreground text-[10px]">{sub}</div>
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-700",
                          pct >= 0.7 ? "bg-emerald-400" : pct >= 0.4 ? "bg-amber-400" : "bg-rose-400"
                        )}
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                    <div className="shrink-0 w-8 text-right">
                      <span className={cn(
                        "font-mono text-xs font-bold tabular-nums",
                        pct >= 0.7 ? "text-emerald-400" : pct >= 0.4 ? "text-amber-400" : "bg-rose-400"
                      )}>{val.toFixed(1)}</span>
                    </div>
                    <div className="shrink-0 w-8 text-right">
                      <span className="text-muted-foreground/70 text-[10px] font-mono">{w}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!directorAnalysis ? (
            <p className="text-sm text-muted-foreground">Stel eerst een team samen — dan praat de directeur graag.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {directorAnalysis.labels.map((l) => (
                  <Badge key={l} variant="secondary" className="font-display">{l}</Badge>
                ))}
              </div>
              <div className="space-y-2">
                {directorAnalysis.lines.map((l, i) => (
                  <p key={i} className="font-serif italic text-foreground/90 border-l-2 border-primary/60 pl-3">"{l}"</p>
                ))}
              </div>
<div className="rounded-md border-2 border-dashed border-[hsl(var(--vintage-gold))/0.6] bg-[hsl(var(--vintage-gold))/0.08] p-3 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0" />
                <p className="text-sm font-serif italic">{directorAnalysis.quote}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="ornate-frame retro-border relative overflow-hidden text-center p-3">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))]" />
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-serif">{label}</p>
      <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground font-sans">{sub}</p>}
    </div>
  );
}
