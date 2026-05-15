import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStages, useEntries, useStagePoints } from "@/hooks/useResults";
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

export default function MyTeamPanel({ section = "ploeg" }: { section?: "ploeg" | "prono" }) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { entry, picksByCategory, jokerIds, predictions, isLoading } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stagePoints = [] } = useMyStagePoints(entry?.id);
  const { data: allStagePoints = [] } = useStagePoints(game?.id);

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

  const myRankPerStage = useMemo(() => {
    if (!entry) return new Map<string, number>();
    const perStage = new Map<string, Map<string, number>>();
    allStagePoints.forEach((sp) => {
      if (!perStage.has(sp.stage_id)) perStage.set(sp.stage_id, new Map());
      const m = perStage.get(sp.stage_id)!;
      m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points);
    });
    const result = new Map<string, number>();
    perStage.forEach((entryPts, stageId) => {
      const myPts = entryPts.get(entry.id) ?? 0;
      if (myPts === 0) return;
      const sorted = [...entryPts.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([id]) => id === entry.id);
      if (idx >= 0) result.set(stageId, idx + 1);
    });
    return result;
  }, [entry, allStagePoints]);

  const standaloneJokerIds = useMemo(() => {
    const picked = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) picked.add(id);
    return jokerIds.filter((jid) => !picked.has(jid));
  }, [picksByCategory, jokerIds]);

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
        <CardContent className="p-4 text-center space-y-3">
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

  if (section === "prono") {
    return (
      <div className="pb-4">
        {predictions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            Nog geen klassementsvoorspellingen ingevuld.
          </p>
        ) : (
          <div className="retro-border overflow-hidden rounded-lg border-2 border-primary"
            style={{ background: "hsl(40 60% 97%)" }}>
            <div className="bg-primary text-primary-foreground px-4 py-3">
              <div className="text-[9px] tracking-[0.35em] uppercase font-mono opacity-60 mb-0.5">Prognose Finale</div>
              <h2 className="font-display text-xl font-black tracking-tight leading-none">Eindklassement Voorspelling</h2>
            </div>
            {podium.some(Boolean) && (
              <div className="border-b border-primary/15">
                <div className="flex items-center px-4 py-1.5 bg-primary/[0.06] border-b border-primary/15">
                  <span className="font-mono text-[9px] uppercase tracking-[0.3em] font-bold text-primary">
                    Algemeen Klassement — Top 3
                  </span>
                </div>
                {podium.map((p, idx) => {
                  const r = p ? ridersById[p.rider_id] : null;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={idx} className={cn(
                      "flex items-center gap-3 px-4 py-2.5 hover:bg-primary/[0.04] transition-colors",
                      idx < 2 && "border-b border-primary/[0.07]"
                    )}>
                      <span className="text-base w-6 shrink-0 leading-none">{medals[idx]}</span>
                      <span className="font-mono text-[10px] font-black w-4 text-primary shrink-0">{idx + 1}</span>
                      <span className="font-display font-bold text-sm uppercase tracking-wide flex-1 min-w-0 truncate"
                        style={{ color: "hsl(25 20% 12%)" }}>
                        {r?.name ?? <em className="font-serif font-normal normal-case text-muted-foreground">Geen keuze</em>}
                      </span>
                      {r?.team && (
                        <span className="font-mono text-[10px] hidden sm:block shrink-0 text-right max-w-[40%] truncate"
                          style={{ color: "hsl(30 15% 42%)" }}>
                          {r.team}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-3">
              {(["points", "kom", "youth"] as const).map((cls, clsIdx) => {
                const meta = JERSEY_META[cls];
                const item = predictions.find((p) => p.classification === cls && p.position === 1);
                const r = item ? ridersById[item.rider_id] : null;
                return (
                  <div key={cls} className={cn("p-3 text-center", clsIdx > 0 && "border-l border-primary/15")}>
                    <div className="text-xl mb-1.5 leading-none">{meta.emoji}</div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.2em] font-bold text-primary mb-1.5">{meta.label}</div>
                    <div className="font-display text-[11px] font-bold uppercase leading-tight" style={{ color: "hsl(25 20% 12%)" }}>
                      {r?.name ?? <em className="font-serif font-normal normal-case text-muted-foreground">—</em>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Vintage header */}
      <div className="ornate-frame retro-border bg-gradient-to-br from-card via-card to-primary/5 p-4 relative overflow-hidden">
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

      {/* ═══ MIJN RENNERS — Vintage Race Roster ═══ */}
      <div className="retro-border overflow-hidden rounded-lg border-2 border-primary"
        style={{ background: "hsl(40 60% 97%)" }}>
        {/* Programme header */}
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[9px] tracking-[0.35em] uppercase font-mono opacity-60 mb-0.5">
              Programme Officiel · {game.name}
            </div>
            <h2 className="font-display text-xl font-black tracking-tight leading-none">Mijn Renners</h2>
          </div>
          <span className="text-3xl opacity-20 select-none" aria-hidden>🚴</span>
        </div>

        {/* 3-column category grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-l border-primary/15">
          {categories.map((cat) => {
            const riderIds = picksByCategory.get(cat.id) ?? [];
            const pickedRiders = riderIds.map((rid) => ridersById[rid]).filter(Boolean);
            if (pickedRiders.length === 0) return null;
            const icon = getCategoryIcon(`${cat.name} ${cat.short_name ?? ""}`);
            return (
              <div key={cat.id} className="border-r border-b border-primary/15 flex flex-col">
                {/* Category header */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/[0.06] border-b border-primary/15">
                  <span className="text-sm leading-none">{icon}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-primary truncate">
                    {cat.short_name ?? cat.name}
                  </span>
                </div>
                {/* Rider rows */}
                {pickedRiders.map((rider, rIdx) => {
                  const isJoker = jokerIds.includes(rider.id);
                  return (
                    <div
                      key={rider.id}
                      className={cn(
                        "flex items-start gap-2 px-3 py-2 hover:bg-primary/[0.04] transition-colors",
                        rIdx < pickedRiders.length - 1 && "border-b border-primary/[0.07]"
                      )}
                    >
                      <span className="font-mono text-xs font-black text-primary tabular-nums w-7 text-right shrink-0 pt-0.5">
                        {rider.start_number ?? "—"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-display font-bold text-xs uppercase tracking-wide truncate"
                            style={{ color: "hsl(25 20% 12%)" }}>
                            {rider.name}
                          </span>
                          {isJoker && (
                            <span className="font-mono text-[7px] font-black uppercase tracking-widest px-1 py-0.5 border shrink-0"
                              style={{ borderColor: "hsl(var(--vintage-gold))", color: "hsl(var(--vintage-gold))", background: "hsl(var(--vintage-gold) / 0.1)" }}>
                              ×2
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[9px] block truncate" style={{ color: "hsl(30 15% 42%)" }}>
                          {rider.team}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Stand-alone jokers — full width */}
          {standaloneJokerIds.length > 0 && (
            <div className="col-span-1 sm:col-span-3 border-r border-b border-primary/15">
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-primary/15"
                style={{ background: "hsl(var(--vintage-gold) / 0.08)" }}>
                <span className="text-sm leading-none">🃏</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-primary">Jokers</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 border-l border-primary/15">
                {standaloneJokerIds.map((jid) => {
                  const rider = ridersById[jid];
                  return (
                    <div key={jid} className="border-r border-b border-primary/15 flex items-start gap-2 px-3 py-2 hover:bg-primary/[0.04] transition-colors">
                      <span className="font-mono text-xs font-black text-primary tabular-nums w-7 text-right shrink-0 pt-0.5">
                        {rider?.start_number ?? "—"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-display font-bold text-xs uppercase tracking-wide truncate"
                            style={{ color: "hsl(25 20% 12%)" }}>
                            {rider?.name ?? "Onbekend"}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] block truncate" style={{ color: "hsl(30 15% 42%)" }}>
                          {rider?.team}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ VOORSPELLINGEN — alleen in Prono-sectie ═══ */}
      {section === "ploeg" ? null : predictions.length > 0 && (
        <div className="retro-border overflow-hidden rounded-lg border-2 border-primary"
          style={{ background: "hsl(40 60% 97%)" }}>
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3">
            <div className="text-[9px] tracking-[0.35em] uppercase font-mono opacity-60 mb-0.5">Prognose Finale</div>
            <h2 className="font-display text-xl font-black tracking-tight leading-none">Eindklassement Voorspelling</h2>
          </div>

          {/* GC Podium */}
          {podium.some(Boolean) && (
            <div className="border-b border-primary/15">
              <div className="flex items-center px-4 py-1.5 bg-primary/[0.06] border-b border-primary/15">
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] font-bold text-primary">
                  Algemeen Klassement — Top 3
                </span>
              </div>
              {podium.map((p, idx) => {
                const r = p ? ridersById[p.rider_id] : null;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 hover:bg-primary/[0.04] transition-colors",
                      idx < 2 && "border-b border-primary/[0.07]"
                    )}
                  >
                    <span className="text-base w-6 shrink-0 leading-none">{medals[idx]}</span>
                    <span className="font-mono text-[10px] font-black w-4 text-primary shrink-0">{idx + 1}</span>
                    <span className="font-display font-bold text-sm uppercase tracking-wide flex-1 min-w-0 truncate"
                      style={{ color: "hsl(25 20% 12%)" }}>
                      {r?.name ?? <em className="font-serif font-normal normal-case text-muted-foreground">Geen keuze</em>}
                    </span>
                    {r?.team && (
                      <span className="font-mono text-[10px] hidden sm:block shrink-0 text-right max-w-[40%] truncate"
                        style={{ color: "hsl(30 15% 42%)" }}>
                        {r.team}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Jerseys */}
          <div className="grid grid-cols-3">
            {(["points", "kom", "youth"] as const).map((cls, clsIdx) => {
              const meta = JERSEY_META[cls];
              const item = predictions.find((p) => p.classification === cls && p.position === 1);
              const r = item ? ridersById[item.rider_id] : null;
              return (
                <div key={cls}
                  className={cn("p-3 text-center", clsIdx > 0 && "border-l border-primary/15")}>
                  <div className="text-xl mb-1.5 leading-none">{meta.emoji}</div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.2em] font-bold text-primary mb-1.5">
                    {meta.label}
                  </div>
                  <div className="font-display text-[11px] font-bold uppercase leading-tight"
                    style={{ color: "hsl(25 20% 12%)" }}>
                    {r?.name ?? <em className="font-serif font-normal normal-case text-muted-foreground">—</em>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ PUNTEN PER ETAPPE — StageBars visualizer only ═══ */}
      <Card className="ornate-frame retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display">📊 Punten per etappe</CardTitle>
        </CardHeader>
        <CardContent className="p-4 bg-gradient-to-br from-card via-card to-secondary/20">
          <p className="text-[11px] text-muted-foreground mb-2">
            Balkhoogte ∝ km · 🟡 = jouw punten per etappe
          </p>
          <StageBars
            stages={stages}
            pointsByStageId={stagePointsByStageId}
            rankByStageId={myRankPerStage}
            gcUnlocked={stages
              .filter((x) => !x.is_gc)
              .some((x) => x.stage_number === 21 && x.results_status === "approved")}
            trackHeight={130}
          />
        </CardContent>
      </Card>
    </div>
  );
}
