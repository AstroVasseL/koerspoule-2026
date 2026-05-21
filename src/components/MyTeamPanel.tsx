import { useMemo } from "react";
import { Link } from "react-router-dom";
import MijnPloegStats from "@/components/MijnPloegStats";
import FormMeter from "@/components/FormMeter";
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
import { Pencil } from "lucide-react";
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
        .select("id, name, team, country_code, start_number, is_dnf")
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
  if (/(gc\s*alien|alien)/.test(n))                        return { label: "ALIEN", bg: "#FFF0F7", color: "#C4185A", border: "#E8336D" };
  if (/(kop|leider|leader|gc|algemeen|klassement)/.test(n)) return { label: "GC",    bg: "#FFF0F7", color: "#C4185A", border: "#E8336D" };
  if (/(sprint|spurt)/.test(n))                            return { label: "SPR",   bg: "#EFF3FF", color: "#1D4A9E", border: "#2E5BA8" };
  if (/(klim|berg|grimp|mountain)/.test(n))                return { label: "KLM",   bg: "#EDF7F1", color: "#1E6B40", border: "#2E8B57" };
  if (/\bpunch\b/.test(n))                                 return { label: "PCH",   bg: "#FFF4EC", color: "#B5620F", border: "#E07B20" };
  if (/(aanval|attack|baroud)/.test(n))                    return { label: "ANV",   bg: "#FFF4EC", color: "#B5620F", border: "#E07B20" };
  if (/(tijd|chrono|time\s*trial|tt\b)/.test(n))           return { label: "TT",    bg: "#FFFBEC", color: "#9A7A10", border: "#C8A020" };
  if (/(support|knecht|helper|domestique)/.test(n))        return { label: "SUP",   bg: "#F5F5F5", color: "#5A5A5A", border: "#9A9A9A" };
  if (/joker/.test(n))                                     return { label: "JKR",   bg: "#F5EFFF", color: "#6B2FA0", border: "#7B3FA0" };
  if (/(klassiek|classic|cobble|kassei)/.test(n))          return { label: "KLS",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/\boud\b|veteraan|oldie/.test(n))                    return { label: "OUD",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/\bnl\b|nederland|dutch/.test(n))                    return { label: "NL",    bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/belg|belgi/.test(n))                                return { label: "BEL",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/(baby\s*giro|baby|young|youngster)/.test(n))        return { label: "YNG",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  return                                                     { label: "RNR",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
}

const JERSEY_META: Record<string, { label: string; emoji: string; ring: string; bg: string }> = {
  gc:     { label: "Eindklassement", emoji: "🌹", ring: "border-[hsl(var(--jersey-pink))]",   bg: "bg-[hsl(var(--jersey-pink))/0.1]"   },
  points: { label: "Puntentrui",     emoji: "🟣", ring: "border-[hsl(var(--jersey-purple))]", bg: "bg-[hsl(var(--jersey-purple))/0.1]" },
  kom:    { label: "Bergtrui",       emoji: "🔵", ring: "border-[hsl(var(--jersey-blue))]",   bg: "bg-[hsl(var(--jersey-blue))/0.1]"   },
  youth:  { label: "Jongerentrui",   emoji: "⚪", ring: "border-foreground/30",               bg: "bg-secondary/40"                    },
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
  const dnfZichtbaar = game?.status === "live" || game?.status === "finished";

  const podium = ["gc-1", "gc-2", "gc-3"].map((_, i) =>
    predictions.find((p) => p.classification === "gc" && p.position === i + 1)
  );

  if (section === "prono") {
    // Jersey badge configs — parallel to getCategoryBadge in Mijn Ploeg
    const jerseyBadge: Record<string, { label: string; bg: string; color: string; border: string }> = {
      gc:     { label: "GC",  bg: "#FFF0F7", color: "#C4185A", border: "#E8336D" },
      points: { label: "PNT", bg: "#EFF3FF", color: "#1D4A9E", border: "#2E5BA8" },
      kom:    { label: "KOM", bg: "#EDF7F1", color: "#1E6B40", border: "#2E8B57" },
      youth:  { label: "YNG", bg: "#F8F4EE", color: "#7A5610", border: "#B59240" },
    };

    const medals = ["🥇", "🥈", "🥉"];

    // Rows shared with Mijn Ploeg: number column + icon + name/team + badge
    const PronoRow = ({
      pos, icon, rider, badge, isLast, isDnf = false,
    }: {
      pos: number;
      icon: ReactNode;
      rider: { name: string; team?: string | null } | null;
      badge: { label: string; bg: string; color: string; border: string };
      isLast: boolean;
      isDnf?: boolean;
    }) => {
      const bg = (pos - 1) % 2 === 0 ? "#FAF7F2" : "#F4EFE6";
      return (
        <div className="flex items-center"
          style={{ background: isDnf ? "#FFF0F0" : bg, minHeight: "40px", borderBottom: !isLast ? "1px solid #EDE8DE" : undefined }}>
          <div className="shrink-0 px-2 border-r text-right" style={{ width: "44px", borderColor: "#E0D8CC" }}>
            <span className="font-mono font-black tabular-nums text-[17px] leading-none"
              style={{ color: isDnf ? "#C0392B" : "#C8A020" }}>{String(pos).padStart(3, " ")}</span>
          </div>
          <div className="shrink-0 w-8 text-center text-sm leading-none select-none">{isDnf ? "❌" : icon}</div>
          <div className="flex-1 min-w-0 px-1.5 py-2">
            {rider ? (
              <>
                <span className="font-display font-bold block truncate"
                  style={{ fontSize: "14px", color: isDnf ? "#8B4040" : "#2C2416", lineHeight: 1.2,
                    textDecoration: isDnf ? "line-through" : undefined }}>{rider.name}</span>
                {isDnf ? (
                  <span className="font-mono text-[9px] block" style={{ color: "#C0392B" }}>
                    Uitgevallen · geen punten
                  </span>
                ) : rider.team ? (
                  <span className="font-mono text-[9px] block truncate" style={{ color: "#8B7355" }}>{rider.team}</span>
                ) : null}
              </>
            ) : (
              <em className="font-serif text-sm text-muted-foreground">Geen keuze</em>
            )}
          </div>
          <div className="shrink-0 px-2 py-1">
            {isDnf ? (
              <span className="font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                style={{ background: "#FFEBEB", color: "#C0392B", border: "1px solid #E74C3C", letterSpacing: "0.1em" }}>
                DNF
              </span>
            ) : (
              <span className="font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, letterSpacing: "0.1em" }}>
                {badge.label}
              </span>
            )}
          </div>
        </div>
      );
    };

    // Section divider — identical to SectionHeader in Mijn Ploeg
    const PronoSection = ({
      icon, label, badge, children,
    }: {
      icon: ReactNode;
      label: string;
      badge: { label: string; bg: string; color: string; border: string };
      children: ReactNode;
    }) => (
      <div className="border-b" style={{ borderColor: "#E8DDD0" }}>
        <div className="flex items-center gap-2 px-3 py-2"
          style={{ background: "#F0EBE1", borderBottom: `1px solid ${badge.border}` }}>
          <span className="text-sm leading-none shrink-0">{icon}</span>
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] shrink-0"
            style={{ color: badge.color }}>{label}</span>
          <div className="flex-1 h-px" style={{ background: badge.border, opacity: 0.3 }} />
        </div>
        {children}
      </div>
    );

    return (
      <div className="pb-4">
        {predictions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            Nog geen klassementsvoorspellingen ingevuld.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border-2" style={{ borderColor: "#C8A020", background: "#FAF7F2" }}>

            {/* Programme header — identiek aan Mijn Renners header */}
            <div className="px-4 py-3 flex items-center justify-between border-b-2"
              style={{ background: "#2C2416", borderColor: "#C8A020" }}>
              <div>
                <div className="text-[9px] tracking-[0.4em] uppercase font-mono mb-0.5"
                  style={{ color: "#C8A020", opacity: 0.75 }}>
                  Pronostiek · {game.name}
                </div>
                <h2 className="font-display text-xl font-black tracking-tight leading-none text-white">
                  Eindklassement Prognose
                </h2>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "#C8A020", opacity: 0.6 }}>
                  keuzes
                </div>
                <div className="font-display text-2xl font-black tabular-nums" style={{ color: "#C8A020" }}>
                  {predictions.length}
                </div>
                <div className="font-mono text-[9px]" style={{ color: "#C8A020", opacity: 0.5 }}>
                  voorspeld
                </div>
              </div>
            </div>

            {/* GC Top 3 */}
            {podium.some(Boolean) && (
              <PronoSection icon="🌹" label="Algemeen Klassement — Top 3" badge={jerseyBadge.gc}>
                {podium.map((p, idx) => {
                  const r = p ? ridersById[p.rider_id] : null;
                  return (
                    <PronoRow
                      key={idx}
                      pos={idx + 1}
                      icon={medals[idx]}
                      rider={r ? { name: r.name, team: r.team } : null}
                      badge={jerseyBadge.gc}
                      isLast={idx === 2}
                      isDnf={dnfZichtbaar && Boolean(r?.is_dnf)}
                    />
                  );
                })}
              </PronoSection>
            )}

            {/* Trui-winnaars: Punten, Berg, Jongeren */}
            {(["points", "kom", "youth"] as const).map((cls) => {
              const meta = JERSEY_META[cls];
              const item = predictions.find((p) => p.classification === cls && p.position === 1);
              const r = item ? ridersById[item.rider_id] : null;
              const badge = jerseyBadge[cls];
              return (
                <PronoSection key={cls} icon={meta.emoji} label={meta.label} badge={badge}>
                  <PronoRow
                    pos={1}
                    icon={meta.emoji}
                    rider={r ? { name: r.name, team: r.team } : null}
                    badge={badge}
                    isLast
                    isDnf={dnfZichtbaar && Boolean(r?.is_dnf)}
                  />
                </PronoSection>
              );
            })}

            {/* Footer rule — identiek aan Mijn Renners */}
            <div className="h-1" style={{ background: "linear-gradient(90deg, transparent, #C8A020 30%, #E8336D 50%, #C8A020 70%, transparent)" }} />
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

      <MijnPloegStats />

      {/* Form-meter — laatste 3 etappes vs seizoensgemiddelde */}
      <FormMeter stagePoints={stagePoints} stages={stages} />

      {/* Status / wijzig CTA */}
      {!gameLocked && (
        <div className={cn(
          "ornate-frame retro-border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
          isSubmitted ? "bg-emerald-500/10 border-emerald-500/40" : "bg-amber-500/10 border-amber-500/40"
        )}>
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


      {/* ═══ MIJN RENNERS — Startlijst Programme Officiel ═══ */}
      <div className="overflow-hidden rounded-lg border-2"
        style={{ borderColor: "#C8A020", background: "#FAF7F2" }}>

        {/* Programme header */}
        <div className="px-4 py-3 flex items-center justify-between border-b-2"
          style={{ background: "#2C2416", borderColor: "#C8A020" }}>
          <div>
            <div className="text-[9px] tracking-[0.4em] uppercase font-mono mb-0.5"
              style={{ color: "#C8A020", opacity: 0.75 }}>
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
            {dnfZichtbaar && (() => {
              const dnfCount = riders.filter((r) => r.is_dnf).length;
              return dnfCount > 0 ? (
                <div className="font-mono text-[9px] mt-0.5" style={{ color: "#E74C3C" }}>
                  {dnfCount} uitgevallen
                </div>
              ) : null;
            })()}
          </div>
        </div>

        {/* Build flat section list */}
        {(() => {
          type Rider = { id: string; name: string; team: string | null; start_number: number | null; is_dnf?: boolean | null };
          type Section = { id: string; label: string; icon: ReactNode; badge: BadgeConfig; riders: Rider[] };

          const sections: Section[] = [];
          for (const cat of categories) {
            const riderIds = picksByCategory.get(cat.id) ?? [];
            const catRiders = riderIds.map((rid) => ridersById[rid]).filter(Boolean) as Rider[];
            if (catRiders.length === 0) continue;
            const key = `${cat.name} ${cat.short_name ?? ""}`;
            sections.push({
              id: cat.id,
              label: (cat.short_name ?? cat.name).toUpperCase(),
              icon: getCategoryIcon(key),
              badge: getCategoryBadge(key),
              riders: catRiders,
            });
          }
          if (standaloneJokerIds.length > 0) {
            const jokerRiders = standaloneJokerIds.map((jid) => ridersById[jid]).filter(Boolean) as Rider[];
            sections.push({
              id: "__jokers__",
              label: "JOKERS",
              icon: "🃏",
              badge: { label: "JKR", bg: "#F5EFFF", color: "#6B2FA0", border: "#7B3FA0" },
              riders: jokerRiders,
            });
          }

          // ── Shared sub-components ──────────────────────────────────────────

          const SectionHeader = ({ sec, borderRight = false }: { sec: Section; borderRight?: boolean }) => (
            <div className="flex items-center gap-2 px-3 py-2"
              style={{
                background: "#F0EBE1",
                borderBottom: `1px solid ${sec.badge.border}`,
                borderRight: borderRight ? "1px solid #E8DDD0" : undefined,
              }}>
              <span className="text-sm leading-none shrink-0">{sec.icon}</span>
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] shrink-0"
                style={{ color: sec.badge.color }}>{sec.label}</span>
              <div className="flex-1 h-px" style={{ background: sec.badge.border, opacity: 0.3 }} />
              <span className="font-mono text-[9px] tabular-nums shrink-0"
                style={{ color: sec.badge.border, opacity: 0.65 }}>{sec.riders.length}</span>
            </div>
          );

          const RiderRow = ({
            rider, icon, badge, rIdx, borderRight = false, isLast = false,
          }: {
            rider: Rider | null; icon: ReactNode; badge: BadgeConfig;
            rIdx: number; borderRight?: boolean; isLast?: boolean;
          }) => {
            const bg = rIdx % 2 === 0 ? "#FAF7F2" : "#F4EFE6";
            const isDnf = dnfZichtbaar && Boolean(rider?.is_dnf);
            if (!rider) return (
              <div style={{ background: bg, minHeight: "40px", borderRight: borderRight ? "1px solid #E8DDD0" : undefined,
                borderBottom: !isLast ? "1px solid #EDE8DE" : undefined }} />
            );
            const numStr = rider.start_number != null
              ? String(rider.start_number).padStart(3, " ")
              : " — ";
            return (
              <div className="flex items-center"
                style={{ background: isDnf ? "#FFF0F0" : bg, minHeight: "40px",
                  borderBottom: !isLast ? "1px solid #EDE8DE" : undefined,
                  borderRight: borderRight ? "1px solid #E8DDD0" : undefined }}>
                {/* Number */}
                <div className="shrink-0 px-2 border-r text-right" style={{ width: "44px", borderColor: "#E0D8CC" }}>
                  <span className="font-mono font-black tabular-nums text-[17px] leading-none"
                    style={{ color: isDnf ? "#C0392B" : "#C8A020" }}>{numStr}</span>
                </div>
                {/* Icon */}
                <div className="shrink-0 w-8 text-center text-sm leading-none select-none">{isDnf ? "❌" : icon}</div>
                {/* Name + team */}
                <div className="flex-1 min-w-0 px-1.5 py-2">
                  <span className="font-display font-bold block truncate"
                    style={{ fontSize: "14px", color: isDnf ? "#8B4040" : "#2C2416", lineHeight: 1.2,
                      textDecoration: isDnf ? "line-through" : undefined }}>{rider.name}</span>
                  {isDnf ? (
                    <span className="font-mono text-[9px] block" style={{ color: "#C0392B" }}>
                      Uitgevallen{game?.status === "finished" ? " · Definitief" : ""}
                    </span>
                  ) : (
                    <span className="font-mono text-[9px] block truncate"
                      style={{ color: "#8B7355" }}>{rider.team}</span>
                  )}
                </div>
                {/* Badge */}
                <div className="shrink-0 px-2 py-1">
                  {isDnf ? (
                    <span className="font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                      style={{ background: "#FFEBEB", color: "#C0392B", border: "1px solid #E74C3C", letterSpacing: "0.1em" }}>
                      DNF
                    </span>
                  ) : (
                    <span className="font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                      style={{ background: badge.bg, color: badge.color,
                        border: `1px solid ${badge.border}`, letterSpacing: "0.1em" }}>
                      {badge.label}
                    </span>
                  )}
                </div>
              </div>
            );
          };

          // Pair sections for desktop: [0,1], [2,3], …
          const pairs: Array<[Section, Section | null]> = [];
          for (let i = 0; i < sections.length; i += 2) {
            pairs.push([sections[i], sections[i + 1] ?? null]);
          }

          return (
            <>
              {/* ── Desktop: 2 kolommen, regel-uitlijning ── */}
              <div className="hidden md:block">
                {pairs.map(([left, right], pairIdx) => {
                  const maxRows = Math.max(left.riders.length, right?.riders.length ?? 0);
                  return (
                    <div key={pairIdx} className={pairIdx > 0 ? "border-t" : ""}
                      style={{ borderColor: "#E8DDD0" }}>
                      {/* Category header row */}
                      <div className="grid grid-cols-2">
                        <SectionHeader sec={left} borderRight />
                        {right
                          ? <SectionHeader sec={right} />
                          : <div style={{ background: "#FAF7F2", borderBottom: "1px solid #E8DDD0" }} />
                        }
                      </div>
                      {/* Rider rows — exact row alignment across both columns */}
                      {Array.from({ length: maxRows }).map((_, rIdx) => (
                        <div key={rIdx} className="grid grid-cols-2">
                          <RiderRow
                            rider={left.riders[rIdx] ?? null}
                            icon={left.icon} badge={left.badge}
                            rIdx={rIdx} borderRight
                            isLast={rIdx === maxRows - 1}
                          />
                          <RiderRow
                            rider={right?.riders[rIdx] ?? null}
                            icon={right?.icon ?? null} badge={right?.badge ?? left.badge}
                            rIdx={rIdx}
                            isLast={rIdx === maxRows - 1}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* ── Mobiel: enkelvoudige kolom (ongewijzigd) ── */}
              <div className="md:hidden">
                {sections.map((sec, secIdx) => (
                  <div key={sec.id} className={secIdx > 0 ? "border-t" : ""}
                    style={{ borderColor: "#E8DDD0" }}>
                    <SectionHeader sec={sec} />
                    {sec.riders.map((rider, rIdx) => (
                      <RiderRow
                        key={rider.id}
                        rider={rider} icon={sec.icon} badge={sec.badge}
                        rIdx={rIdx} isLast={rIdx === sec.riders.length - 1}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        {/* Footer rule */}
        <div className="h-1" style={{ background: "linear-gradient(90deg, transparent, #C8A020 30%, #E8336D 50%, #C8A020 70%, transparent)" }} />
      </div>

      {/* ═══ PUNTEN PER ETAPPE ═══ */}
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
