import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { Lock, Sparkles, BarChart3, Megaphone, Trophy } from "lucide-react";

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };
type JokerStat = { rider_id: string; joker_count: number; total_entries: number };
type StagePoint = { entry_id: string; points: number };
type PredictionStat = { classification: string; position: number; rider_id: string; pick_count: number; total_entries: number };

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

// Heatmap-kleur: zeldzame keuzes (lage ownership) = donker/intens, populair = licht/muted
function ownershipColor(pct: number): string {
  // pct 0..100. Lage pct → goud-intens; hoge pct → muted lichtgrijs.
  const clamped = Math.max(0, Math.min(100, pct));
  // intensiteit 0 (licht) bij 100% → 1 (donker/intens) bij 0%
  const intensity = 1 - clamped / 100;
  // Mengel: van muted-foreground/20 → vintage-gold met hoge alpha
  const alpha = 0.18 + intensity * 0.7; // 0.18..0.88
  return `hsl(var(--vintage-gold) / ${alpha.toFixed(2)})`;
}

const CLASSIFICATION_META: Array<{ key: "gc" | "points" | "kom" | "youth"; label: string; emoji: string; tint: string }> = [
  { key: "gc", label: "Eindwinnaar", emoji: "🏆", tint: "from-primary/20 to-[hsl(var(--vintage-gold))/0.15]" },
  { key: "points", label: "Groene trui", emoji: "🟢", tint: "from-emerald-500/15 to-emerald-500/5" },
  { key: "kom", label: "Bolletjestrui", emoji: "🔴", tint: "from-rose-500/15 to-rose-500/5" },
  { key: "youth", label: "Witte trui", emoji: "⚪", tint: "from-slate-200/30 to-slate-200/10" },
];

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
      const { data, error } = await supabase
        .from("stage_points")
        .select("points")
        .eq("entry_id", entryId);
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

function ornament(label: string) {
  return (
    <div className="vintage-ornament mb-2">
      <span className="vintage-ornament-symbol">✦</span>
      <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-serif">{label}</span>
      <span className="vintage-ornament-symbol">✦</span>
    </div>
  );
}

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

  // Set van alle door de gebruiker gekozen renners (picks + jokers) — voor "Jouw keuze" indicatoren
  const myPickedRiderIds = useMemo(() => {
    const s = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) s.add(id);
    for (const id of jokerIds) s.add(id);
    return s;
  }, [picksByCategory, jokerIds]);

  // Map<"classification:position", riderId> voor de eigen voorspellingen
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

  // ---- Section 1: Monte Carlo ----
  const monte = useMemo(() => {
    const N = 5000;
    if (categories.length === 0 || pickStats.length === 0) return null;

    // For each rider, average points = pick_count * (some proxy). We use ownership as score-weight is unknown,
    // but we have actual entry totals. So instead, we estimate "random team score" by:
    //  random_score = sum over picks of (avgPointsPerPick), where avgPointsPerPick is derived from entry totals
    //  by spreading mean total across mean number of picks per entry.
    // Simpler & honest: simulate by drawing N random teams from category rider pools, score them as
    // sum of "rider score" = popularity-weighted contribution. We use real entry totals distribution
    // for the "human" comparison and only need an approximate aps random distribution.
    const meanTotal = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;

    // Build per-category rider candidate pools and ownership maps
    const byCat = new Map<string, PickStat[]>();
    for (const p of pickStats) {
      const arr = byCat.get(p.category_id) ?? [];
      arr.push(p);
      byCat.set(p.category_id, arr);
    }

    // Compute "expected score per pick slot": meanTotal / total_slots
    const totalSlots = categories.reduce((s, c) => s + (c.max_picks ?? 1), 0) || 1;
    const baselinePerSlot = meanTotal / totalSlots;

    // Rider score weight = ownership ratio normalized within category, range [0.4 .. 1.6]
    const riderWeight = new Map<string, number>();
    for (const [, list] of byCat) {
      const max = Math.max(1, ...list.map((p) => p.pick_count));
      for (const p of list) {
        const r = p.pick_count / max; // 0..1
        riderWeight.set(p.rider_id, 0.4 + r * 1.2);
      }
    }

    const rng = seededRandom(game?.id?.split("-").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 42);

    const scoreFromRiderIds = (riderIds: string[]) => {
      let s = 0;
      for (const rid of riderIds) {
        const w = riderWeight.get(rid) ?? 0.7;
        // jitter
        s += baselinePerSlot * w * (0.7 + rng() * 0.6);
      }
      return Math.round(s);
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

    // User's actual score: sum of processed stage points only, excluding prediction bonuses.
    const userPicks: string[] = [];
    for (const cat of categories) {
      const arr = picksByCategory.get(cat.id) ?? [];
      userPicks.push(...arr);
    }
    const userActual = userPicks.length ? myStageTotal : 0;

    const mean = randomScores.reduce((a, b) => a + b, 0) / randomScores.length;
    const median = randomScores[Math.floor(randomScores.length / 2)];
    const top10cut = randomScores[Math.floor(randomScores.length * 0.9)];
    const beatPct =
      randomScores.length === 0
        ? 0
        : (randomScores.filter((s) => userActual > s).length / randomScores.length) * 100;
    const aboveMedian = userActual > median ? 100 : 0;
    const top10 = userActual > top10cut;
    const worseThanApe = beatPct < 50;

    // Distribution buckets
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

  // ---- Section 2: Pelotonkeuzes per category ----
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

  // ---- Section 3: Wielerdirecteur analyse ----
  const directorAnalysis = useMemo(() => {
    if (!isLive || !entry || picksByCategory.size === 0) return null;
    const myPickIds = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) myPickIds.add(id);

    const ownershipByRider = new Map<string, number>();
    const totalEntries = pickStats[0]?.total_entries ?? 1;
    for (const p of pickStats) {
      ownershipByRider.set(p.rider_id, p.pick_count / Math.max(1, totalEntries));
    }
    const myOwnerships = Array.from(myPickIds).map((rid) => ownershipByRider.get(rid) ?? 0);
    const avgOwn = myOwnerships.length ? myOwnerships.reduce((a, b) => a + b, 0) / myOwnerships.length : 0;
    const uniques = myOwnerships.filter((o) => o < 0.15).length;
    const lieflings = myOwnerships.filter((o) => o > 0.5).length;

    const labels: string[] = [];
    if (uniques >= 4) labels.push("Pure chaos");
    if (lieflings >= 4) labels.push("Controleploeg");
    if (avgOwn > 0.45) labels.push("Pelotonkoers");
    if (avgOwn < 0.25) labels.push("Aanvallende ploeg");
    if (uniques >= 2 && lieflings >= 2) labels.push("Waaierspecialist");
    if (labels.length === 0) labels.push("Knechtenleger");

    const lines: string[] = [];
    if (avgOwn > 0.5) lines.push("Je peloton kiest wat iedereen kiest. Een veilige bidon, geen spektakel.");
    else if (avgOwn < 0.2) lines.push("Met deze differentiëlen mik je óf op het podium óf op de bezemwagen.");
    else lines.push("Een nette mix tussen kopgroep en peloton — directeur sportif knikt goedkeurend.");

    if (uniques >= 3) lines.push(`${uniques} renners die nauwelijks iemand koos. Lef of waanzin?`);
    if (lieflings >= 3) lines.push(`${lieflings} pelotonlievelingen — geen verrassingen, geen excuses.`);

    // Daily quote
    const day = new Date().getDate();
    const quotes = [
      "Vandaag zou jouw ploeg waarschijnlijk lossen op de eerste col.",
      "Met deze selectie rijdt je bus harder dan je sprinter.",
      "Je ploeg ademt: all-in op chaos.",
      "Vier sprinters meenemen naar deze bergen? Ambitieuze tactiek.",
      "Het peloton vertrouwt op Pogačar. Jij vertrouwt op hoop.",
      "Deze ploeg heeft de organisatie van een vroege vlucht in een regenrit.",
      "Jouw kopman stuurt vandaag z'n knecht naar voren — voor een bidon.",
    ];
    const quote = quotes[day % quotes.length];

    return { labels, lines, quote, avgOwn, uniques, lieflings };
  }, [isLive, entry, picksByCategory, pickStats]);

  // -------- Render --------
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

  return (
    <div className="space-y-8 pb-6">
      {/* Hero */}
      <div className="ornate-frame retro-border bg-gradient-to-br from-card via-card to-primary/10 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        {ornament("Data cave · alleen voor liefhebbers")}
        <h2 className="vintage-heading text-3xl font-bold leading-tight">Hors Catégorie</h2>
        <p className="text-sm text-muted-foreground font-serif italic mt-1">
          Een verborgen nerdhoek vol grafieken, ownership en directeursbabbels — zoals het hoort na een lange koers.
        </p>
      </div>

      {/* === Section 1: Aap === */}
      <Card className="ornate-frame retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <span className="text-2xl">🐒</span> De Aap met de Dartpijl
          </CardTitle>
          <p className="text-xs text-muted-foreground font-serif italic">
            Hoe goed scoort een volledig willekeurige ploeg eigenlijk?
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
          {!monte ? (
            <p className="text-sm text-muted-foreground">Nog onvoldoende data om de apen te laten gooien.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Jij scoort beter dan" value={`${monte.beatPct.toFixed(0)}%`} sub="van de apen" accent />
                <Stat label="Gemiddelde aap" value={`${Math.round(monte.mean)}`} sub="punten" />
                <Stat label="Boven mediaan?" value={monte.aboveMedian ? "Ja" : "Nee"} sub={`mediaan ${monte.median}`} />
                <Stat label="Top 10% van apen?" value={monte.top10 ? "✅" : "❌"} sub={`drempel ${monte.top10cut}`} />
              </div>

              <div className="rounded-md border-2 border-border bg-secondary/20 p-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-serif mb-2">
                  Distributie van 5.000 willekeurige ploegen
                </p>
                <ChartContainer
                  config={{
                    count: { label: "Aantal apen", color: "hsl(var(--primary))" },
                  }}
                  className="h-[220px] w-full"
                >
                  <BarChart data={monte.dist} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="bucket" type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ReferenceLine
                      x={monte.userActual}
                      stroke="hsl(var(--vintage-gold))"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ value: `Jij · ${monte.userActual} pt`, position: "top", fill: "hsl(var(--vintage-gold))", fontSize: 11 }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {monte.dist.map((b, i) => (
                        <Cell key={i} fill={b.bucket <= monte.userActual ? "hsl(var(--primary)/0.8)" : "hsl(var(--muted-foreground)/0.4)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="text-sm text-muted-foreground font-serif italic space-y-1">
                <p>“Jij scoort beter dan {monte.beatPct.toFixed(0)}% van de apen.”</p>
                {monte.worseThanApe && <p>“Eh… een gemiddelde dartpijl had het ook niet slechter gedaan.” 🎯</p>}
                {monte.top10 && <p>“Top 10% van de apen — die dartpijl van jou heeft visie.”</p>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* === Section 2: Pelotonkeuzes === */}
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
          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest font-serif text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(5) }} /> Zeldzaam (donker)
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
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                      {cat.short_name ?? cat.name}
                    </p>
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
                          <div
                            key={p.rider_id}
                            className={cn(
                              "rounded-md p-2 transition-all",
                              mine
                                ? "ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.35)] bg-primary/5 border border-primary/40"
                                : "border border-transparent"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="font-display font-bold truncate flex items-center gap-1.5">
                                {mine && (
                                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">★</span>
                                )}
                                {rider?.name ?? "Onbekend"}
                              </span>
                              <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full transition-colors"
                                style={{ width: `${Math.max(6, pct)}%`, background: ownershipColor(pct) }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
                              {mine && (
                                <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20">
                                  Jouw keuze
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Joker leaderboard */}
              {jokerStats.length > 0 && (
                <div className="rounded-lg border-2 border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.08] p-3 md:col-span-2">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">🃏 Meest gekozen jokers</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[...jokerStats].sort((a, b) => b.joker_count - a.joker_count).slice(0, 6).map((j) => {
                      const pct = (j.joker_count / Math.max(1, j.total_entries)) * 100;
                      const rider = ridersById[j.rider_id];
                      const mine = jokerIds.includes(j.rider_id);
                      return (
                        <div
                          key={j.rider_id}
                          className={cn(
                            "flex items-center justify-between gap-2 text-sm bg-card rounded p-2 border",
                            mine ? "border-primary ring-2 ring-primary/40 shadow-[0_0_10px_hsl(var(--primary)/0.25)]" : "border-border"
                          )}
                        >
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

          {/* Voorspellingen — Eindwinnaar + Truien */}
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
                  // Voor GC tonen we positie 1 (winnaar) prioritair
                  return (
                    <div key={meta.key} className={cn("rounded-lg border-2 border-border p-3 bg-gradient-to-br", meta.tint)}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <span className="text-base leading-none">{meta.emoji}</span>
                          {meta.label}
                        </p>
                        {meta.key === "gc" && (
                          <span className="text-[9px] font-mono text-muted-foreground">positie 1–3</span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {top.map((p) => {
                          const pct = (p.pick_count / Math.max(1, totalEntries)) * 100;
                          const rider = ridersById[p.rider_id];
                          const mineKey = `${meta.key}:${p.position}`;
                          const mine = myPredictionMap.get(mineKey) === p.rider_id;
                          const label =
                            pct >= 60 ? "Consensus" : pct <= 8 ? "Outsider" : pct <= 20 ? "Differentieel" : null;
                          return (
                            <div
                              key={`${p.rider_id}-${p.position}`}
                              className={cn(
                                "rounded-md p-2 transition-all",
                                mine
                                  ? "ring-2 ring-primary bg-primary/5 border border-primary/40"
                                  : "border border-transparent bg-card/40"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="font-display font-bold truncate flex items-center gap-1.5">
                                  {meta.key === "gc" && (
                                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">P{p.position}</span>
                                  )}
                                  {mine && (
                                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">★</span>
                                  )}
                                  <span className="truncate">{rider?.name ?? "Onbekend"}</span>
                                </span>
                                <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                              </div>
                              <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className="h-full" style={{ width: `${Math.max(4, pct)}%`, background: ownershipColor(pct) }} />
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {label && <Badge variant="outline" className="text-[10px]">{label}</Badge>}
                                {mine && (
                                  <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20">
                                    Jouw keuze
                                  </Badge>
                                )}
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

      {/* === Section 3: Wielerdirecteur === */}
      <Card className="ornate-frame retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> De Wielerdirecteur
          </CardTitle>
          <p className="text-xs text-muted-foreground font-serif italic">Na rit 12, met een micro voor z'n neus.</p>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
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
                  <p key={i} className="font-serif italic text-foreground/90 border-l-2 border-primary/60 pl-3">“{l}”</p>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Gem. ownership" value={`${(directorAnalysis.avgOwn * 100).toFixed(0)}%`} />
                <Stat label="Differentiëlen" value={`${directorAnalysis.uniques}`} sub="<15% gekozen" />
                <Stat label="Pelotonlievelingen" value={`${directorAnalysis.lieflings}`} sub=">50% gekozen" />
              </div>
              <div className="rounded-md border-2 border-dashed border-[hsl(var(--vintage-gold))/0.6] bg-[hsl(var(--vintage-gold))/0.08] p-3 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0" />
                <p className="text-sm font-serif italic">{directorAnalysis.quote}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={cn("ornate-frame retro-border relative overflow-hidden text-center p-3", accent && "bg-primary/5")}>
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))]" />
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-serif">{label}</p>
      <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground font-sans">{sub}</p>}
    </div>
  );
}
