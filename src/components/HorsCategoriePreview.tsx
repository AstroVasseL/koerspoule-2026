import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Trophy, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { useEntry } from "@/hooks/useEntry";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };
type PredictionStat = { classification: string; position: number; rider_id: string; pick_count: number; total_entries: number };

function ownershipColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const intensity = 1 - clamped / 100;
  const alpha = 0.18 + intensity * 0.7;
  return `hsl(var(--vintage-gold) / ${alpha.toFixed(2)})`;
}

const JERSEY_META: Array<{ key: "gc" | "points" | "kom" | "youth"; label: string; emoji: string }> = [
  { key: "gc", label: "Eindwinnaar", emoji: "🏆" },
  { key: "points", label: "Groene trui", emoji: "🟢" },
  { key: "kom", label: "Bolletjestrui", emoji: "🔴" },
  { key: "youth", label: "Witte trui", emoji: "⚪" },
];

export default function HorsCategoriePreview() {
  const { data: game } = useCurrentGame();
  const { user } = useAuth();
  const isLive = Boolean(game?.status && ["live", "locked", "finished", "closed"].includes(String(game.status)));
  const { data: categories = [] } = useCategories(game?.id);
  const { picksByCategory, jokerIds, predictions: myPredictions } = useEntry(game?.id);

  const { data: pickStats = [] } = useQuery({
    queryKey: ["preview-pick-stats", game?.id],
    enabled: Boolean(supabase && game?.id && isLive),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PickStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_pick_stats", { p_game_id: game!.id });
      if (error) throw error;
      return (data ?? []) as PickStat[];
    },
  });

  const { data: predictionStats = [] } = useQuery({
    queryKey: ["preview-prediction-stats", game?.id],
    enabled: Boolean(supabase && game?.id && isLive),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PredictionStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_prediction_stats", { p_game_id: game!.id });
      if (error) throw error;
      return (data ?? []) as PredictionStat[];
    },
  });

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

  const allRiderIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of pickStats) s.add(p.rider_id);
    for (const p of predictionStats) s.add(p.rider_id);
    for (const id of myPickedRiderIds) s.add(id);
    for (const p of myPredictions) s.add(p.rider_id);
    return Array.from(s);
  }, [pickStats, predictionStats, myPickedRiderIds, myPredictions]);

  const { data: riders = [] } = useQuery({
    queryKey: ["preview-rider-names", [...allRiderIds].sort()],
    enabled: allRiderIds.length > 0,
    queryFn: async () => {
      if (!supabase) return [] as Array<{ id: string; name: string }>;
      const { data, error } = await supabase.from("riders").select("id, name").in("id", allRiderIds);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
  const ridersById = useMemo(() => Object.fromEntries(riders.map((r) => [r.id, r])), [riders]);

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

  const previewCategories = useMemo(() => categories.slice(0, 3), [categories]);

  // Verberg sectie als koers nog niet live is en er dus geen echte ownership-data is
  if (!isLive || pickStats.length === 0) return null;

  const ctaPath = user ? "/team-samenstellen" : "/login";

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mx-auto text-center mb-8">
        <div className="vintage-ornament max-w-xs mx-auto mb-3">
          <span className="vintage-ornament-symbol">✦</span>
          <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
            Hors Catégorie · preview
          </span>
          <span className="vintage-ornament-symbol">✦</span>
        </div>
        <h2 className="vintage-heading text-2xl md:text-3xl font-bold mb-2">
          Wie kiest het peloton?
        </h2>
        <p className="text-sm text-muted-foreground font-serif italic">
          Top picks, ownership en jouw afwijkingen — donker = zeldzaam, licht = pelotonlieveling.
        </p>
      </div>

      {/* Categorieën */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {previewCategories.map((cat) => {
          const list = (pickStatsByCat.get(cat.id) ?? []).slice(0, 3);
          const totalEntries = list[0]?.total_entries ?? 1;
          if (list.length === 0) return null;
          return (
            <article key={cat.id} className="ornate-frame retro-border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {cat.short_name ?? cat.name}
                </p>
                <span className="text-[9px] font-mono text-muted-foreground">top 3</span>
              </div>
              <div className="space-y-1.5">
                {list.map((p) => {
                  const pct = (p.pick_count / Math.max(1, totalEntries)) * 100;
                  const rider = ridersById[p.rider_id];
                  const mine = myPickedRiderIds.has(p.rider_id);
                  return (
                    <div
                      key={p.rider_id}
                      className={cn(
                        "rounded-md p-1.5 transition-all",
                        mine && "ring-2 ring-primary bg-primary/5 border border-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-display font-bold truncate flex items-center gap-1.5">
                          {mine && (
                            <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold shrink-0">★</span>
                          )}
                          <span className="truncate">{rider?.name ?? "Onbekend"}</span>
                        </span>
                        <span className="font-mono text-[10px] tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full" style={{ width: `${Math.max(6, pct)}%`, background: ownershipColor(pct) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {/* Jersey-voorspellingen */}
      <div className="ornate-frame retro-border bg-gradient-to-br from-card to-[hsl(var(--vintage-gold))/0.08] p-3 md:p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4 text-[hsl(var(--vintage-gold))]" />
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Voorspellingen · eindklassement &amp; truien
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {JERSEY_META.map((meta) => {
            const rows = predictionStats.filter((p) => p.classification === meta.key);
            if (rows.length === 0) {
              return (
                <div key={meta.key} className="rounded-md border border-border bg-card/40 p-2 text-center">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {meta.emoji} {meta.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground italic mt-1">Nog geen data</p>
                </div>
              );
            }
            const top = [...rows].sort((a, b) => b.pick_count - a.pick_count)[0];
            const totalEntries = top.total_entries || 1;
            const pct = (top.pick_count / totalEntries) * 100;
            const rider = ridersById[top.rider_id];
            const mine = myPredictionMap.get(`${meta.key}:${top.position}`) === top.rider_id;
            const label = pct >= 60 ? "Consensus" : pct <= 8 ? "Outsider" : pct <= 20 ? "Differentieel" : null;
            return (
              <div
                key={meta.key}
                className={cn(
                  "rounded-md border p-2 transition-all",
                  mine ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border bg-card/40"
                )}
              >
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <span>{meta.emoji}</span> {meta.label}
                </p>
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="font-display font-bold truncate flex items-center gap-1">
                    {mine && (
                      <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold shrink-0">★</span>
                    )}
                    <span className="truncate">{rider?.name ?? "Onbekend"}</span>
                  </span>
                  <span className="font-mono text-[10px] tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full" style={{ width: `${Math.max(6, pct)}%`, background: ownershipColor(pct) }} />
                </div>
                {label && (
                  <Badge variant="outline" className="text-[9px] mt-1.5">{label}</Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 ornate-frame retro-border bg-card p-4">
        <div className="text-center sm:text-left">
          <p className="font-display font-bold text-base flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="h-4 w-4 text-[hsl(var(--vintage-gold))]" />
            Volg je het peloton, of val je aan?
          </p>
          <p className="text-xs text-muted-foreground font-serif italic">
            Bekijk de volledige Hors Catégorie data en pas je ploeg aan op basis van deze inzichten.
          </p>
        </div>
        <Link
          to={ctaPath}
          className="px-4 py-2 text-sm font-bold rounded-md inline-flex items-center gap-1.5 bg-primary text-primary-foreground border-2 border-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          Ontdek meer <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
