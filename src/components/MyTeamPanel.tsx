import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStages, useEntries } from "@/hooks/useResults";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Trophy, Sparkles, Users, Target, Pencil } from "lucide-react";
import FlagIcon from "@/components/FlagIcon";
import StageBars from "@/components/StageBars";
import type { ReactNode } from "react";

type StagePoint = { stage_id: string; entry_id: string; points: number };

function useMyStagePoints(entryId?: string) {
  return useQuery({
    queryKey: ["my-stage-points", entryId],
    enabled: Boolean(supabase && entryId),
    queryFn: async (): Promise<StagePoint[]> => {
      if (!supabase || !entryId) return [];
      const { data, error } = await supabase
        .from("stage_points")
        .select("stage_id, entry_id, points")
        .eq("entry_id", entryId);
      if (error) throw error;
      return (data ?? []) as StagePoint[];
    },
  });
}

function useRiders(ids: string[]) {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ["riders-by-ids", sorted],
    enabled: Boolean(supabase && sorted.length > 0),
    queryFn: async () => {
      if (!supabase || sorted.length === 0) return [];
      const { data, error } = await supabase
        .from("riders")
        .select("id, name, team, country_code, start_number")
        .in("id", sorted);
      if (error) throw error;
      return data ?? [];
    },
  });
}

const STAGE_TYPE_ICON: Record<string, string> = {
  vlak: "🏁",
  heuvelachtig: "⛰️",
  bergachtig: "🏔️",
  tijdrit: "⏱️",
  ploegentijdrit: "⏱️👥",
};

function getCategoryIcon(name: string): ReactNode {
  const n = name.toLowerCase();
  if (/(gc\s*alien|alien)/.test(n)) return "👽";
  if (/(baby\s*giro|baby)/.test(n)) return "👶";
  if (/\boud\b|veteraan|oldie/.test(n)) return "👴";
  if (/\bnl\b|nederland|dutch/.test(n)) return <FlagIcon country="NL" className="w-5 h-4" />;
  if (/belg|belgië|belgie|belgium/.test(n)) return <FlagIcon country="BE" className="w-5 h-4" />;
  if (/(klim|berg|grimp|mountain)/.test(n)) return "🏔️";
  if (/(sprint|spurt)/.test(n)) return "⚡";
  if (/(punch|aanval|attack|baroud)/.test(n)) return "🎯";
  if (/(tijd|chrono|time)/.test(n)) return "🏁";
  if (/(klassiek|classic|cobble|kassei)/.test(n)) return "🪨";
  if (/(kop|leider|leader|gc|algemeen)/.test(n)) return "⭐";
  return "🚴";
}

const JERSEY_META: Record<string, { label: string; emoji: string; ring: string; bg: string }> = {
  gc: { label: "Eindklassement", emoji: "🌹", ring: "border-[hsl(var(--jersey-pink))]", bg: "bg-[hsl(var(--jersey-pink))/0.1]" },
  points: { label: "Puntentrui", emoji: "🟣", ring: "border-[hsl(var(--jersey-purple))]", bg: "bg-[hsl(var(--jersey-purple))/0.1]" },
  kom: { label: "Bergtrui", emoji: "🔵", ring: "border-[hsl(var(--jersey-blue))]", bg: "bg-[hsl(var(--jersey-blue))/0.1]" },
  youth: { label: "Jongerentrui", emoji: "⚪", ring: "border-foreground/30", bg: "bg-secondary/40" },
};

export default function MyTeamPanel() {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { entry, picksByCategory, jokerIds, predictions, isLoading } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stagePoints = [] } = useMyStagePoints(entry?.id);

  const allRiderIds = useMemo(() => {
    const set = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) set.add(id);
    for (const id of jokerIds) set.add(id);
    for (const p of predictions) set.add(p.rider_id);
    return Array.from(set);
  }, [picksByCategory, jokerIds, predictions]);
  const { data: riders = [] } = useRiders(allRiderIds);
  const ridersById = useMemo(
    () => Object.fromEntries(riders.map((r) => [r.id, r])),
    [riders]
  );

  const totalPoints = stagePoints.reduce((sum, sp) => sum + sp.points, 0);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)),
    [entries]
  );
  const myRank = entry ? sortedEntries.findIndex((e) => e.id === entry.id) + 1 : 0;

  const stagePointsByStageId = useMemo(
    () => Object.fromEntries(stagePoints.map((sp) => [sp.stage_id, sp.points])),
    [stagePoints]
  );

  const maxStagePts = useMemo(
    () => stagePoints.reduce((m, sp) => Math.max(m, sp.points), 0),
    [stagePoints]
  );

  const bestStage = useMemo(() => {
    if (stagePoints.length === 0) return null;
    const top = stagePoints.reduce((a, b) => (a.points >= b.points ? a : b));
    const stage = stages.find((s) => s.id === top.stage_id);
    return stage ? { stage, points: top.points } : null;
  }, [stagePoints, stages]);

  if (!user) {
    return <div className="ornate-frame retro-border bg-card p-6 text-muted-foreground">Log in om je team te bekijken.</div>;
  }
  if (isLoading) {
    return <div className="ornate-frame retro-border bg-card p-6">Team laden…</div>;
  }
  if (!game) {
    return <div className="ornate-frame retro-border bg-card p-6 text-muted-foreground">Geen actieve koers gevonden.</div>;
  }
  if (!entry || picksByCategory.size === 0) {
    return (
      <Card className="ornate-frame retro-border">
        <CardContent className="p-8 text-center space-y-3">
          <div className="text-5xl mb-2">🚴‍♂️</div>
          <p className="font-display text-xl font-bold">Nog geen ploeg in de bus</p>
          <p className="text-sm text-muted-foreground font-serif italic">Stel je team samen vóór de flamme rouge.</p>
          <Button asChild className="retro-border-primary mt-2">
            <Link to="/team-samenstellen">Naar de teambuilder</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isSubmitted = entry.status === "submitted";
  const gameLocked = Boolean(game?.status && ["closed", "locked", "live", "finished"].includes(game.status as string));

  // Group predictions by classification (for hero podium teaser)
  const podium = ["gc-1", "gc-2", "gc-3"].map((_, i) =>
    predictions.find((p) => p.classification === "gc" && p.position === i + 1)
  );

  return (
    <div className="space-y-6 pb-6">
      {/* Vintage header */}
      <div className="ornate-frame retro-border bg-gradient-to-br from-card via-card to-primary/5 p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <div className="vintage-ornament mb-2">
          <span className="vintage-ornament-symbol">✦</span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-serif">
            {game.name}
          </span>
          <span className="vintage-ornament-symbol">✦</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="vintage-heading text-2xl md:text-3xl font-bold leading-tight">
              {entry.team_name ?? user.user_metadata?.team_name ?? "Mijn ploeg"}
            </h2>
            <p className="text-xs text-muted-foreground font-serif italic mt-1">
              Directeur sportif: {user.user_metadata?.display_name ?? user.email}
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-extrabold leading-none text-primary">{totalPoints}</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-serif">punten</span>
          </div>
        </div>
      </div>

      {/* Status / wijzig CTA */}
      {!gameLocked && (
        <div
          className={cn(
            "ornate-frame retro-border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
            isSubmitted ? "bg-emerald-500/10 border-emerald-500/40" : "bg-amber-500/10 border-amber-500/40"
          )}
        >
          <div className="text-sm">
            {isSubmitted ? (
              <>✅ <strong>Team ingediend.</strong> Je kunt nog wijzigen tot de admin de koers op deadline zet.</>
            ) : (
              <>🚴‍♂️ <strong>Je peloton staat nog niet aan de start.</strong> Bevestig je inzending in de teambuilder.</>
            )}
          </div>
          <Button asChild size="sm" variant={isSubmitted ? "outline" : "default"}>
            <Link to="/team-samenstellen">
              <Pencil className="h-4 w-4 mr-2" />
              {isSubmitted ? "Wijzigen" : "Naar teambuilder"}
            </Link>
          </Button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Trophy, label: "Totaal punten", value: totalPoints, accent: true },
          {
            icon: Users,
            label: "Positie in poule",
            value: myRank > 0 ? `#${myRank}` : "—",
            sub: entries.length > 0 ? `/${entries.length}` : undefined,
          },
          { icon: Target, label: "Categorieën", value: `${picksByCategory.size}/${categories.length}` },
          {
            icon: Sparkles,
            label: "Beste etappe",
            value: bestStage ? `R${bestStage.stage.stage_number}` : "—",
            sub: bestStage ? ` · ${bestStage.points}pt` : undefined,
            small: true,
          },
        ].map(({ icon: Icon, label, value, sub, accent, small }, i) => (
          <Card key={i} className={cn("ornate-frame retro-border relative overflow-hidden", accent && "bg-primary/5")}>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))]" />
            <CardContent className="p-4 text-center">
              <Icon className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-serif">{label}</p>
              <p className={cn("font-display font-bold tabular-nums", small ? "text-xl" : "text-2xl")}>
                {value}
                {sub && <span className="text-xs text-muted-foreground font-sans ml-1">{sub}</span>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Renner-overzicht */}
      <Card className="ornate-frame retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Mijn renners
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((cat) => {
              const riderIds = picksByCategory.get(cat.id) ?? [];
              const pickedRiders = riderIds.map((rid) => ridersById[rid]).filter(Boolean);
              const icon = getCategoryIcon(`${cat.name} ${cat.short_name ?? ""}`);
              return (
                <div key={cat.id} className="rounded-lg border-2 border-border bg-secondary/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/30 text-base">
                      {icon}
                    </div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex-1 truncate">
                      {cat.short_name ?? cat.name}
                    </p>
                  </div>
                  {pickedRiders.length > 0 ? (
                    <div className="space-y-1.5">
                      {pickedRiders.map((rider) => {
                        const isJoker = jokerIds.includes(rider.id);
                        return (
                          <div key={rider.id} className="flex items-center gap-2 p-2 rounded-md bg-card border border-border">
                            <span className="inline-flex h-7 min-w-[1.75rem] px-1.5 items-center justify-center rounded-full bg-primary/15 border border-primary/30 font-mono text-xs shrink-0">
                              {rider.start_number ?? "—"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-bold text-sm truncate">{rider.name}</div>
                              {rider.team && (
                                <div className="text-[11px] text-muted-foreground truncate">{rider.team}</div>
                              )}
                            </div>
                            {isJoker && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">🃏</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Niet gekozen</span>
                  )}
                </div>
              );
            })}

            {/* Stand-alone jokers (niet in een categorie) */}
            {(() => {
              const allPickIds = new Set<string>();
              for (const arr of picksByCategory.values()) for (const id of arr) allPickIds.add(id);
              const standaloneJokers = jokerIds.filter((jid) => !allPickIds.has(jid));
              if (standaloneJokers.length === 0) return null;
              return (
                <div className="rounded-lg border-2 border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.08] p-3 md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🃏</span>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Jokers
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {standaloneJokers.map((jid) => {
                      const rider = ridersById[jid];
                      return (
                        <div key={jid} className="flex items-center gap-2 p-2 rounded-md bg-card border border-border">
                          <span className="inline-flex h-7 min-w-[1.75rem] px-1.5 items-center justify-center rounded-full bg-[hsl(var(--vintage-gold))/0.2] border border-[hsl(var(--vintage-gold))/0.5] font-mono text-xs shrink-0">
                            {rider?.start_number ?? "—"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-bold text-sm truncate">{rider?.name ?? "Onbekend"}</div>
                            {rider?.team && (
                              <div className="text-[11px] text-muted-foreground truncate">{rider.team}</div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0"></Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Punten per etappe — met balk */}
      <Card className="ornate-frame retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display">📊 Punten per etappe</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Premium vertical bar visualizer (zelfde component als Klassement & Etappes) */}
          <div className="p-4 border-b border-border bg-gradient-to-br from-card via-card to-secondary/20">
            <p className="text-[11px] text-muted-foreground mb-2">
              Balkhoogte ∝ km · 🟡 = jouw punten per etappe
            </p>
            <StageBars
              stages={stages}
              pointsByStageId={stagePointsByStageId}
              gcUnlocked={stages
                .filter((x) => !x.is_gc)
                .some((x) => x.stage_number === 21 && x.results_status === "approved")}
              trackHeight={130}
            />
          </div>

          <div className="divide-y divide-border">
            {stages.map((stage) => {
              const pts = stagePointsByStageId[stage.id] ?? 0;
              const hasResults = pts > 0;
              const widthPct = maxStagePts > 0 ? (pts / maxStagePts) * 100 : 0;
              const isBest = bestStage && bestStage.stage.id === stage.id && pts > 0;
              return (
                <div
                  key={stage.id}
                  className={cn(
                    "p-3 flex items-center gap-3 relative",
                    hasResults && "bg-primary/5",
                    isBest && "bg-[hsl(var(--vintage-gold))/0.12]"
                  )}
                >
                  <span className="font-mono text-xs text-muted-foreground w-10 shrink-0">R{stage.stage_number}</span>
                  <span className="text-base shrink-0">{STAGE_TYPE_ICON[stage.stage_type] ?? "🚴"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-sm truncate flex items-center gap-2">
                      {stage.name ?? `Etappe ${stage.stage_number}`}
                      {isBest && <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--vintage-gold))] font-bold">★ Top</span>}
                    </div>
                    {hasResults && (
                      <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))]"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <span className={cn("font-display text-lg font-bold tabular-nums shrink-0", !hasResults && "text-muted-foreground")}>
                    {pts}
                  </span>
                </div>
              );
            })}
            {stages.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Nog geen etappes ingepland.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voorspellingen */}
      {predictions.length > 0 && (
        <Card className="ornate-frame retro-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display">🎯 Mijn voorspellingen</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            {/* Podium GC */}
            {podium.some(Boolean) && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-serif mb-3 text-center">
                  {JERSEY_META.gc.label}
                </p>
                <div className="grid grid-cols-3 gap-2 md:gap-4 items-end max-w-md mx-auto">
                  {[
                    { idx: 1, label: "🥈", height: "h-14" },
                    { idx: 0, label: "🥇", height: "h-20" },
                    { idx: 2, label: "🥉", height: "h-10" },
                  ].map(({ idx, label, height }) => {
                    const p = podium[idx];
                    const r = p ? ridersById[p.rider_id] : null;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div className="text-2xl md:text-3xl mb-1">{label}</div>
                        <div className="font-display text-xs md:text-sm font-bold text-center min-h-[2.5rem] flex items-center px-1 leading-tight">
                          {r?.name ?? <span className="text-muted-foreground italic font-serif">—</span>}
                        </div>
                        <div
                          className={cn(
                            "w-full rounded-t-md border-2 border-b-0",
                            height,
                            idx === 0
                              ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.2]"
                              : "border-primary/50 bg-primary/10"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Truitjes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["points", "kom", "youth"] as const).map((cls) => {
                const meta = JERSEY_META[cls];
                const item = predictions.find((p) => p.classification === cls && p.position === 1);
                const r = item ? ridersById[item.rider_id] : null;
                return (
                  <div key={cls} className={cn("rounded-lg border-2 p-3", meta.ring, meta.bg)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{meta.emoji}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-serif">
                        {meta.label}
                      </span>
                    </div>
                    <div className="font-display font-bold truncate">
                      {r?.name ?? <span className="text-muted-foreground italic font-serif font-normal">Geen voorspelling</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
