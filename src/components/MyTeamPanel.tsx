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

type BadgeConfig = { label: string; bg: string; color: string; border: string };
function getCategoryBadge(name: string): BadgeConfig {
  const n = (name ?? "").toLowerCase();
  if (/(gc\s*alien|alien)/.test(n))                   return { label: "ALIEN", bg: "#FFF0F7", color: "#C4185A", border: "#E8336D" };
  if (/(kop|leider|leader|gc|algemeen|klassement)/.test(n)) return { label: "GC",   bg: "#FFF0F7", color: "#C4185A", border: "#E8336D" };
  if (/(sprint|spurt)/.test(n))                       return { label: "SPR",   bg: "#EFF3FF", color: "#1D4A9E", border: "#2E5BA8" };
  if (/(klim|berg|grimp|mountain)/.test(n))           return { label: "KLM",   bg: "#EDF7F1", color: "#1E6B40", border: "#2E8B57" };
  if (/\bpunch\b/.test(n))                            return { label: "PCH",   bg: "#FFF4EC", color: "#B5620F", border: "#E07B20" };
  if (/(aanval|attack|baroud)/.test(n))               return { label: "ANV",   bg: "#FFF4EC", color: "#B5620F", border: "#E07B20" };
  if (/(tijd|chrono|time\s*trial|tt\b)/.test(n))      return { label: "TT",    bg: "#FFFBEC", color: "#9A7A10", border: "#C8A020" };
  if (/(support|knecht|helper|domestique)/.test(n))   return { label: "SUP",   bg: "#F5F5F5", color: "#5A5A5A", border: "#9A9A9A" };
  if (/joker/.test(n))                                return { label: "JKR",   bg: "#F5EFFF", color: "#6B2FA0", border: "#7B3FA0" };
  if (/(klassiek|classic|cobble|kassei)/.test(n))     return { label: "KLS",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/\boud\b|veteraan|oldie/.test(n))               return { label: "OUD",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/\bnl\b|nederland|dutch/.test(n))               return { label: "NL",    bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/belg|belgi/.test(n))                           return { label: "BEL",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/(baby\s*giro|baby|young|youngster)/.test(n))   return { label: "YNG",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  return                                                { label: "RNR",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
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

      {/* ═══ MIJN RENNERS — Startlijst Programme Officiel ═══ */}
      <div className="overflow-hidden rounded-lg border-2"
        style={{ borderColor: "#C8A020", background: "#FAF7F2" }}>

        {/* Programme header */}
        <div className="px-4 py-3 flex items-center justify-between border-b-2"
          style={{ background: "#2C2416", borderColor: "#C8A020" }}>
          <div>
            <div className="text-[9px] tracking-[0.4em] uppercase font-mono mb-0.5" style={{ color: "#C8A020", opacity: 0.75 }}>
              Programme Officiel · {game.name}
            </div>
            <h2 className="font-display text-xl font-black tracking-tight leading-none text-white">Mijn Renners</h2>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "#C8A020", opacity: 0.6 }}>startlijst</div>
            <div className="font-display text-2xl font-black tabular-nums" style={{ color: "#C8A020" }}>
              {Array.from(picksByCategory.values()).reduce((s, arr) => s + arr.length, 0) + standaloneJokerIds.length}
            </div>
            <div className="font-mono text-[9px]" style={{ color: "#C8A020", opacity: 0.5 }}>renners</div>
          </div>
        </div>

        {/* Category sections — 2 newspaper columns on md+, single column on mobile */}
        <div className="md:columns-2 md:gap-0" style={{ columnRule: "1px solid #E8DDD0" }}>
          {categories.map((cat, catIdx) => {
            const riderIds = picksByCategory.get(cat.id) ?? [];
            const pickedRiders = riderIds.map((rid) => ridersById[rid]).filter(Boolean);
            if (pickedRiders.length === 0) return null;
            const icon = getCategoryIcon(`${cat.name} ${cat.short_name ?? ""}`);
            const badge = getCategoryBadge(`${cat.name} ${cat.short_name ?? ""}`);
            const catLabel = (cat.short_name ?? cat.name).toUpperCase();

            return (
              <div key={cat.id}
                className={cn("break-inside-avoid", catIdx > 0 ? "border-t" : "")}
                style={{ borderColor: "#E8DDD0" }}>
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 py-2"
                  style={{ background: "#F0EBE1", borderBottom: `1px solid ${badge.border}` }}>
                  <span className="text-sm leading-none shrink-0">{icon}</span>
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.25em]"
                    style={{ color: badge.color }}>
                    {catLabel}
                  </span>
                  <div className="flex-1 h-px ml-1" style={{ background: badge.border, opacity: 0.35 }} />
                  <span className="font-mono text-[9px] tabular-nums" style={{ color: badge.border, opacity: 0.7 }}>
                    {pickedRiders.length}
                  </span>
                </div>

                {/* Rider rows */}
                {pickedRiders.map((rider, rIdx) => {
                  const isJoker = jokerIds.includes(rider.id);
                  const numStr = rider.start_number != null
                    ? String(rider.start_number).padStart(3, " ") // figure space
                    : " — ";
                  return (
                    <div
                      key={rider.id}
                      className="flex items-center group transition-colors"
                      style={{
                        background: rIdx % 2 === 0 ? "#FAF7F2" : "#F4EFE6",
                        borderBottom: rIdx < pickedRiders.length - 1 ? "1px solid #EDE8DE" : undefined,
                        minHeight: "40px",
                      }}
                    >
                      {/* Start number */}
                      <div className="shrink-0 px-3 py-2.5 border-r w-14 text-right"
                        style={{ borderColor: "#E0D8CC" }}>
                        <span className="font-mono font-black tabular-nums leading-none text-[18px]"
                          style={{ color: "#C8A020", letterSpacing: "-0.02em" }}>
                          {numStr}
                        </span>
                      </div>

                      {/* Emoji */}
                      <div className="shrink-0 w-9 text-center text-base leading-none select-none">
                        {icon}
                      </div>

                      {/* Name + team */}
                      <div className="flex-1 min-w-0 px-2 py-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-display font-bold truncate"
                            style={{ fontSize: "15px", color: "#2C2416", lineHeight: 1.2 }}>
                            {rider.name}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] truncate block"
                          style={{ color: "#8B7355" }}>
                          {rider.team}
                        </span>
                      </div>

                      {/* Role badge */}
                      <div className="shrink-0 px-3 py-2">
                        <span className="font-mono text-[9px] font-black uppercase px-2 py-1 rounded"
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            letterSpacing: "0.12em",
                          }}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Stand-alone jokers */}
          {standaloneJokerIds.length > 0 && (
            <div className="break-inside-avoid border-t" style={{ borderColor: "#E8DDD0" }}>
              {/* Joker section header */}
              <div className="flex items-center gap-2 px-4 py-2"
                style={{ background: "#F0EBE1", borderBottom: "1px solid #7B3FA0" }}>
                <span className="text-sm leading-none shrink-0">🃏</span>
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.25em]"
                  style={{ color: "#6B2FA0" }}>JOKERS</span>
                <div className="flex-1 h-px ml-1" style={{ background: "#7B3FA0", opacity: 0.35 }} />
                <span className="font-mono text-[9px] tabular-nums" style={{ color: "#7B3FA0", opacity: 0.7 }}>
                  {standaloneJokerIds.length}
                </span>
              </div>
              {standaloneJokerIds.map((jid, rIdx) => {
                const rider = ridersById[jid];
                const numStr = rider?.start_number != null
                  ? String(rider.start_number).padStart(3, " ")
                  : " — ";
                return (
                  <div key={jid} className="flex items-center transition-colors"
                    style={{
                      background: rIdx % 2 === 0 ? "#FAF7F2" : "#F4EFE6",
                      borderBottom: rIdx < standaloneJokerIds.length - 1 ? "1px solid #EDE8DE" : undefined,
                      minHeight: "40px",
                    }}>
                    <div className="shrink-0 px-3 py-2.5 border-r w-14 text-right"
                      style={{ borderColor: "#E0D8CC" }}>
                      <span className="font-mono font-black tabular-nums leading-none text-[18px]"
                        style={{ color: "#C8A020", letterSpacing: "-0.02em" }}>
                        {numStr}
                      </span>
                    </div>
                    <div className="shrink-0 w-9 text-center text-base leading-none select-none">🃏</div>
                    <div className="flex-1 min-w-0 px-2 py-2">
                      <span className="font-display font-bold block truncate"
                        style={{ fontSize: "15px", color: "#2C2416", lineHeight: 1.2 }}>
                        {rider?.name ?? "Onbekend"}
                      </span>
                      <span className="font-mono text-[10px] truncate block" style={{ color: "#8B7355" }}>
                        {rider?.team}
                      </span>
                    </div>
                    <div className="shrink-0 px-3 py-2">
                      <span className="font-mono text-[9px] font-black uppercase px-2 py-1 rounded"
                        style={{ background: "#F5EFFF", color: "#6B2FA0", border: "1px solid #7B3FA0", letterSpacing: "0.12em" }}>
                        JKR ×2
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer rule */}
        <div className="h-1" style={{ background: "linear-gradient(90deg, transparent, #C8A020 30%, #E8336D 50%, #C8A020 70%, transparent)" }} />
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
