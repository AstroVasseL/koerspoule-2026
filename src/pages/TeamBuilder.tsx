import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Info, Lock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { useEntry } from "@/hooks/useEntry";
import { useStartlist } from "@/hooks/useStartlist";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import RiderSearchSelect from "@/components/RiderSearchSelect";
import RiderDetailPanel from "@/components/RiderDetailPanel";
import FlagIcon from "@/components/FlagIcon";
import type { ReactNode } from "react";

// Pick a thematic icon for each category based on its name/short_name
function getCategoryIcon(name: string): ReactNode {
  const n = name.toLowerCase();
  if (/(gc\s*alien|alien)/.test(n)) return "👽";
  if (/(baby\s*giro|baby)/.test(n)) return "👶";
  if (/\boud\b|veteraan|oldie/.test(n)) return "👴";
  if (/\bnl\b|nederland|dutch/.test(n)) return <FlagIcon country="NL" className="w-6 h-5" />;
  if (/belg|belgië|belgie|belgium/.test(n)) return <FlagIcon country="BE" className="w-6 h-5" />;
  if (/(klim|berg|grimp|mountain)/.test(n)) return "🏔️";
  if (/(sprint|spurt)/.test(n)) return "⚡";
  if (/(punch|aanval|attack|baroud)/.test(n)) return "🎯";
  if (/(tijd|chrono|time)/.test(n)) return "🏁";
  if (/(klassiek|classic|cobble|kassei)/.test(n)) return "🪨";
  if (/(kop|leider|leader|gc|algemeen)/.test(n)) return "⭐";
  return "🚴";
}

export default function TeamBuilder() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthed = Boolean(user);
  const { data: game, isLoading: gameLoading } = useCurrentGame();
  const { data: profile } = useProfile();
  const isAdmin = Boolean(profile?.is_admin);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(game?.id);
  const { entry, isLoading: entryLoading, picksByCategory, jokerIds, predictions, togglePick, saveJoker, savePredictions, submitEntry, revertEntry } = useEntry(game?.id);

  const requireAuth = (action: string) => {
    toast({
      title: "Maak een account aan",
      description: `Je moet ingelogd zijn om ${action}.`,
    });
    navigate("/login");
  };

  const [startlistSearch, setStartlistSearch] = useState("");
  const [startlistTeamFilter, setStartlistTeamFilter] = useState("all");
  const { data: startlist = [], isLoading: startlistLoading } = useStartlist(
    game?.id,
    startlistSearch,
    startlistTeamFilter === "all" ? "" : startlistTeamFilter
  );

  const categoryRiderIds = useMemo(() => {
    const set = new Set<string>();
    for (const category of categories) {
      for (const relation of category.category_riders ?? []) {
        if (relation.riders) set.add(relation.riders.id);
      }
    }
    return set;
  }, [categories]);

  const { data: fullStartlist = [] } = useStartlist(game?.id, "", "");

  const allStartlistRiders = useMemo(() => {
    const list: Array<{ id: string; name: string; start_number: number | null; teamName: string; is_youth_eligible: boolean }> = [];
    for (const team of fullStartlist) {
      for (const rider of team.riders) {
        list.push({ ...rider, teamName: team.name });
      }
    }
    return list.sort((a, b) => (a.start_number ?? 9999) - (b.start_number ?? 9999));
  }, [fullStartlist]);

  const youthEligibleRiders = useMemo(
    () => allStartlistRiders.filter((r) => r.is_youth_eligible),
    [allStartlistRiders]
  );

  const jokerPool = useMemo(
    () => allStartlistRiders.filter((r) => !categoryRiderIds.has(r.id)),
    [allStartlistRiders, categoryRiderIds]
  );

  const allTeams = useMemo(
    () => fullStartlist.map((t) => ({ id: t.id, name: t.name })),
    [fullStartlist]
  );

  const [jokerDraft1, setJokerDraft1] = useState("");
  const [jokerDraft2, setJokerDraft2] = useState("");
  const [detailRider, setDetailRider] = useState<{ id: string; name: string; firstcycling_id: number | null } | null>(null);
  const [gcPodium, setGcPodium] = useState<string[]>(["", "", ""]);
  const [pointsJersey, setPointsJersey] = useState("");
  const [mountainJersey, setMountainJersey] = useState("");
  const [youthJersey, setYouthJersey] = useState("");

  const isSubmitted = entry?.status === "submitted";
  const gameLocked = Boolean(game?.status && ["closed", "locked", "live", "finished"].includes(game.status));
  const isLocked = gameLocked;
  const builderVisible = isAdmin || (game?.status ? ["open", "live"].includes(game.status) : false);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !entry) return;
    if (!predictions) return;
    const podium = ["", "", ""];
    let pts = "", kom = "", youth = "";
    for (const p of predictions) {
      if (p.classification === "gc" && p.position >= 1 && p.position <= 3) podium[p.position - 1] = p.rider_id;
      if (p.classification === "points" && p.position === 1) pts = p.rider_id;
      if (p.classification === "kom" && p.position === 1) kom = p.rider_id;
      if (p.classification === "youth" && p.position === 1) youth = p.rider_id;
    }
    setGcPodium(podium);
    setPointsJersey(pts);
    setMountainJersey(kom);
    setYouthJersey(youth);
    if (jokerIds[0]) setJokerDraft1(jokerIds[0]);
    if (jokerIds[1]) setJokerDraft2(jokerIds[1]);
    hydratedRef.current = true;
  }, [entry, predictions, jokerIds]);

  useEffect(() => {
    if (!entry || !hydratedRef.current || isSubmitted) return;
    const timer = setTimeout(() => {
      const list: Array<{ classification: "gc" | "points" | "kom" | "youth"; position: number; rider_id: string }> = [];
      gcPodium.forEach((rid, i) => { if (rid) list.push({ classification: "gc", position: i + 1, rider_id: rid }); });
      if (pointsJersey) list.push({ classification: "points", position: 1, rider_id: pointsJersey });
      if (mountainJersey) list.push({ classification: "kom", position: 1, rider_id: mountainJersey });
      if (youthJersey) list.push({ classification: "youth", position: 1, rider_id: youthJersey });
      savePredictions.mutate({ entryId: entry.id, predictions: list });
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcPodium, pointsJersey, mountainJersey, youthJersey]);

  // Auto-save jokers
  useEffect(() => {
    if (!entry || !hydratedRef.current || isSubmitted) return;
    if (!jokerDraft1 || !jokerDraft2) return;
    if (jokerDraft1 === jokerDraft2) return;
    if (selectedPickRiderIds.has(jokerDraft1) || selectedPickRiderIds.has(jokerDraft2)) return;
    // Skip if already saved identically
    const current = [...jokerIds].sort().join(",");
    const next = [jokerDraft1, jokerDraft2].sort().join(",");
    if (current === next) return;
    const timer = setTimeout(() => {
      saveJoker.mutate({ entryId: entry.id, riderIds: [jokerDraft1, jokerDraft2] });
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jokerDraft1, jokerDraft2]);

  const validPicksByCategory = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const category of categories) {
      const allowed = new Set(category.category_riders.map((row) => row.rider_id));
      const valid = (picksByCategory.get(category.id) ?? []).filter((riderId, index, arr) =>
        allowed.has(riderId) && arr.indexOf(riderId) === index
      );
      map.set(category.id, valid.slice(0, category.max_picks ?? 1));
    }
    return map;
  }, [categories, picksByCategory]);

  const selectedPickRiderIds = useMemo(() => {
    const s = new Set<string>();
    for (const arr of validPicksByCategory.values()) for (const id of arr) s.add(id);
    return s;
  }, [validPicksByCategory]);

  const handlePickToggle = async (categoryId: string, riderId: string) => {
    if (!isAuthed) return requireAuth("een renner te kiezen");
    if (!entry) return;
    try {
      await togglePick.mutateAsync({ entryId: entry.id, categoryId, riderId });
    } catch (error) {
      toast({
        title: "Opslaan mislukt",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  const handleSaveJokers = async () => {
    if (!entry) return;
    if (!jokerDraft1 || !jokerDraft2) {
      toast({ title: "Kies twee jokers", variant: "destructive" });
      return;
    }
    if (jokerDraft1 === jokerDraft2) {
      toast({ title: "Jokers moeten uniek zijn", variant: "destructive" });
      return;
    }
    if (selectedPickRiderIds.has(jokerDraft1) || selectedPickRiderIds.has(jokerDraft2)) {
      toast({
        title: "Joker overlap",
        description: "Jokers mogen niet in categorie-picks zitten.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveJoker.mutateAsync({ entryId: entry.id, riderIds: [jokerDraft1, jokerDraft2] });
      toast({ title: "Jokers opgeslagen" });
    } catch (error) {
      toast({
        title: "Jokers opslaan mislukt",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!isAuthed) return requireAuth("je team in te dienen");
    if (!entry) return;
    try {
      await submitEntry.mutateAsync({ entryId: entry.id });
      toast({ title: "Team definitief ingediend" });
    } catch (error) {
      toast({
        title: "Indienen mislukt",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  const handleRevert = async () => {
    if (!entry) return;
    try {
      await revertEntry.mutateAsync({ entryId: entry.id });
      toast({ title: "Team weer bewerkbaar — vergeet niet opnieuw in te dienen" });
    } catch (error) {
      toast({
        title: "Wijzigen mislukt",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  const totalRequired = useMemo(
    () => categories.reduce((sum, c) => sum + (c.max_picks ?? 1), 0),
    [categories]
  );
  const completedPicks = useMemo(() => {
    let n = 0;
    for (const arr of validPicksByCategory.values()) n += arr.length;
    return n;
  }, [validPicksByCategory]);
  const gameReady = !gameLoading && !categoriesLoading && !entryLoading;

  const progressPct = totalRequired > 0 ? Math.round((completedPicks / totalRequired) * 100) : 0;
  const podiumFilled = gcPodium.filter(Boolean).length;
  const jerseysFilled = [pointsJersey, mountainJersey, youthJersey].filter(Boolean).length;
  const missing: string[] = [];
  if (completedPicks < totalRequired) {
    missing.push(`Nog ${totalRequired - completedPicks} renner${totalRequired - completedPicks === 1 ? "" : "s"} kiezen in je categorieën`);
  }
  if (jokerIds.length < 2) {
    missing.push(`Nog ${2 - jokerIds.length} joker${2 - jokerIds.length === 1 ? "" : "s"} aanduiden`);
  }
  if (podiumFilled < 3) {
    missing.push(`Eindpodium voorspellen (${podiumFilled}/3)`);
  }
  if (jerseysFilled < 3) {
    missing.push(`Truitjes voorspellen — punten, berg & jongeren (${jerseysFilled}/3)`);
  }
  const teamComplete = missing.length === 0;

  // Lookup map for rider name preview (jokers/podium)
  const riderById = useMemo(() => {
    const m = new Map<string, { name: string; start_number: number | null }>();
    for (const r of allStartlistRiders) m.set(r.id, { name: r.name, start_number: r.start_number });
    return m;
  }, [allStartlistRiders]);

  return (
    <div className="container mx-auto px-5 py-4 md:py-6 pb-32 md:pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Vintage Hero */}
          <div className="text-center mb-6">
            <div className="vintage-ornament mb-3">
              <span className="vintage-ornament-symbol">✦</span>
              <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
                {game?.name ?? "Koerspoule"}
              </span>
              <span className="vintage-ornament-symbol">✦</span>
            </div>
            <h1 className="vintage-heading text-3xl md:text-5xl font-bold mb-2">
              De Ploegleiderswagen
            </h1>
            <p className="text-muted-foreground font-serif italic">
              Kies wijs — één keer per Grand Tour
          </p>
          <div className="vintage-divider mt-4 max-w-md mx-auto" />
        </div>

        {!gameReady && <div className="ornate-frame retro-border bg-card p-6 text-center">Laden...</div>}
        {gameReady && !game && (
          <div className="ornate-frame retro-border bg-card p-6 text-center text-muted-foreground">
            Geen actieve game gevonden.
          </div>
        )}
        {gameReady && game && (
          <Tabs defaultValue="builder" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="builder" className="flex-1">Ploeg samenstellen</TabsTrigger>
              <TabsTrigger value="startlist" className="flex-1">Startlijst</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-5">
              {!builderVisible ? (
                <div className="ornate-frame retro-border bg-card p-6 text-center space-y-3">
                  <div className="text-4xl">🚧</div>
                  <p className="text-muted-foreground font-serif italic max-w-md mx-auto">
                    Inschrijving voorlopig gesloten. Opent zodra de officiële startlijst beschikbaar is.
                  </p>
                </div>
              ) : (
              <>
              {/* Sticky progress bar */}
              <div className="sticky top-2 z-30">
                <div className="ornate-frame retro-border bg-card/95 backdrop-blur p-3 md:p-4">
                  <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-serif">
                          Renners
                        </span>
                        <span className="text-sm font-mono font-bold">
                          {completedPicks}<span className="text-muted-foreground">/{totalRequired}</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))] transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-base">🃏</span>
                      <span className="font-mono font-bold">
                        {jokerIds.length}<span className="text-muted-foreground">/2</span>
                      </span>
                      <span className="text-xs text-muted-foreground hidden md:inline">Jokers</span>
                    </div>
                    <div>
                      {gameLocked ? (
                        <span className="jersey-badge bg-muted text-muted-foreground border border-border">
                          <Lock className="h-3 w-3" /> Vergrendeld
                        </span>
                      ) : isSubmitted ? (
                        <span className="jersey-badge bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40">
                          <Check className="h-3 w-3" /> Ingediend
                        </span>
                      ) : teamComplete ? (
                        <span className="jersey-badge bg-[hsl(var(--vintage-gold))/0.15] text-[hsl(var(--vintage-gold))] border border-[hsl(var(--vintage-gold))/0.5]">
                          <Sparkles className="h-3 w-3" /> Klaar om in te dienen
                        </span>
                      ) : (
                        <span className="jersey-badge bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                          🚴‍♂️ Team incompleet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {gameLocked && (
                <div className="retro-border bg-secondary/50 p-3 text-sm">
                  🔒 De koers staat op <strong>{game.status}</strong> — wijzigen niet meer mogelijk.
                  {!isSubmitted && " Je huidige selectie telt als jouw inzending."}
                </div>
              )}
              {!isAuthed && !gameLocked && (
                <div className="ornate-frame retro-border bg-primary/10 border-primary/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="text-sm">
                    👀 Je bent aan het rondkijken. <strong>Maak een account aan</strong> om je ploeg samen te stellen en officieel in te dienen.
                  </div>
                  <Button onClick={() => navigate("/login")} className="retro-border-primary font-bold">
                    Account aanmaken
                  </Button>
                </div>
              )}
              {!gameLocked && isSubmitted && (
                <div className="retro-border bg-emerald-500/10 border-emerald-500/40 p-3 text-sm flex items-center justify-between gap-3">
                  <span>✅ <strong>Team ingediend.</strong> Wil je nog iets aanpassen? Klik op "Wijzigen" — vergeet daarna opnieuw in te dienen.</span>
                  <Button size="sm" variant="outline" onClick={handleRevert} disabled={revertEntry.isPending}>
                    ✏️ Wijzigen
                  </Button>
                </div>
              )}

              {/* Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {categories.map((category, idx) => {
                  const selected = validPicksByCategory.get(category.id) ?? [];
                  const max = category.max_picks ?? 1;
                  const reached = selected.length >= max;
                  const complete = selected.length === max;
                  const icon = getCategoryIcon(`${category.name} ${category.short_name ?? ""}`);
                  return (
                    <div
                      key={category.id}
                      className={cn(
                        "ornate-frame retro-border bg-card p-4 transition-all relative overflow-hidden",
                        complete && "ring-2 ring-emerald-500/40 shadow-[0_0_25px_-8px_hsl(var(--primary)/0.4)]"
                      )}
                    >
                      {/* Top gradient strip */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary opacity-70" />
                      {complete && (
                        <span className="absolute top-2 right-2 jersey-badge bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/50">
                          <Check className="h-3 w-3" /> Compleet
                        </span>
                      )}

                      <div className="flex items-center gap-3 mb-1 mt-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-xl">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                              Cat. {idx + 1}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                                complete
                                  ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {selected.length}/{max}
                            </span>
                          </div>
                          <h2 className="font-display text-lg font-bold leading-tight truncate">
                            {category.short_name ?? category.name}
                          </h2>
                          {category.short_name && (
                            <p className="text-xs text-muted-foreground truncate">{category.name}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mt-3">
                        {category.category_riders.map((row) => {
                          if (!row.riders) return null;
                          const isSelected = selected.includes(row.riders.id);
                          const disabled = Boolean(isLocked) || (!isSelected && reached && max > 1);
                          return (
                            <button
                              key={row.rider_id}
                              disabled={disabled}
                              onClick={() => handlePickToggle(category.id, row.riders!.id)}
                              className={cn(
                                "group w-full flex items-center justify-between p-2.5 rounded-md border-2 transition-all text-left relative overflow-hidden",
                                isSelected
                                  ? "border-primary bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]"
                                  : "border-border hover:border-primary/50 hover:bg-secondary hover:-translate-y-px",
                                disabled && "opacity-50 cursor-not-allowed hover:translate-y-0"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-mono font-bold border-2 transition-colors",
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-secondary text-muted-foreground group-hover:border-primary/40"
                                  )}
                                >
                                  {row.riders.start_number ?? "—"}
                                </span>
                                <span className="font-medium font-sans truncate">{row.riders.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {isSelected && <Check className="h-5 w-5 text-primary" />}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailRider({
                                      id: row.riders!.id,
                                      name: row.riders!.name,
                                      firstcycling_id: row.riders!.firstcycling_id ?? null,
                                    });
                                  }}
                                  className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                                  title="Bekijk seizoensuitslagen"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Jokers */}
              <div className="ornate-frame retro-border p-4 relative bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--vintage-gold))] via-primary to-[hsl(var(--vintage-gold))]" />
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">🃏</span>
                  <h2 className="font-display text-xl font-bold">Jokers</h2>
                </div>
                <p className="text-sm opacity-80 mb-3 font-serif italic">
                  Twee outsiders uit de overige renners. Niet uit een categorie. {jokerPool.length} beschikbaar.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {[
                    { draft: jokerDraft1, set: setJokerDraft1, exclude: jokerDraft2, label: "Joker 1" },
                    { draft: jokerDraft2, set: setJokerDraft2, exclude: jokerDraft1, label: "Joker 2" },
                  ].map((slot, i) => {
                    const picked = slot.draft ? riderById.get(slot.draft) : null;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg border-2 p-3 transition-all",
                          picked
                            ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.1]"
                            : "border-dashed border-white/30 bg-white/5"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest opacity-70">
                            {slot.label}
                          </span>
                          {picked && (
                            <span className="text-[10px] font-mono opacity-70">
                              #{picked.start_number ?? "—"}
                            </span>
                          )}
                        </div>
                        {picked ? (
                          <div className="font-display text-lg font-bold mb-2">{picked.name}</div>
                        ) : (
                          <div className="font-display text-base italic opacity-50 mb-2">Geen keuze</div>
                        )}
                        <RiderSearchSelect
                          riders={jokerPool}
                          value={slot.draft}
                          onChange={slot.set}
                          excludeIds={slot.exclude ? [slot.exclude] : []}
                          placeholder="Zoek renner..."
                          disabled={Boolean(isLocked)}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 text-xs opacity-70">
                  <span>Opgeslagen jokers: <strong>{jokerIds.length}/2</strong></span>
                  <span className="italic font-serif">Auto-opslaan tijdens kiezen</span>
                </div>
              </div>

              {/* Predictions */}
              <div className="ornate-frame retro-border bg-card p-4 relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary opacity-70" />
                <h2 className="font-display text-xl font-bold mb-1 mt-1">🏆 Klassementsvoorspellingen</h2>
                <p className="text-sm text-muted-foreground mb-3 font-serif italic">
                  Voorspel de eindstand — auto-opslaan tijdens typen.
                </p>

                {/* Visual podium */}
                <div className="mb-4">
                  <h3 className="font-display font-bold mb-3 text-center">Eindklassement podium</h3>
                  <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
                    {[
                      { idx: 1, label: "🥈", height: "h-16", order: "order-1" },
                      { idx: 0, label: "🥇", height: "h-24", order: "order-2" },
                      { idx: 2, label: "🥉", height: "h-12", order: "order-3" },
                    ].map(({ idx, label, height, order }) => {
                      const otherPodium = gcPodium.filter((_, j) => j !== idx && Boolean(_));
                      const picked = gcPodium[idx] ? riderById.get(gcPodium[idx]) : null;
                      return (
                        <div key={idx} className={cn("flex flex-col items-center", order)}>
                          <div className="text-3xl md:text-4xl mb-2">{label}</div>
                          <div
                            className={cn(
                              "w-full rounded-t-lg border-2 border-b-0 flex items-center justify-center text-center px-2 py-3 mb-2",
                              height,
                              idx === 0
                                ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.15]"
                                : "border-primary/50 bg-primary/10"
                            )}
                          >
                            {picked ? (
                              <span className="font-display font-bold text-sm md:text-base leading-tight">
                                {picked.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">leeg</span>
                            )}
                          </div>
                          <RiderSearchSelect
                            riders={allStartlistRiders}
                            value={gcPodium[idx]}
                            onChange={(v) => {
                              const next = [...gcPodium];
                              next[idx] = v;
                              setGcPodium(next);
                            }}
                            excludeIds={otherPodium}
                            placeholder="Zoek..."
                            disabled={Boolean(isLocked)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="vintage-divider my-4" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Puntentrui", emoji: "🟣", color: "border-[hsl(var(--jersey-purple))]", value: pointsJersey, setter: setPointsJersey, riders: allStartlistRiders, hint: undefined as string | undefined },
                    { label: "Bergtrui", emoji: "🔵", color: "border-[hsl(var(--jersey-blue))]", value: mountainJersey, setter: setMountainJersey, riders: allStartlistRiders, hint: undefined },
                    { label: "Jongerentrui", emoji: "⚪", color: "border-foreground/30", value: youthJersey, setter: setYouthJersey, riders: youthEligibleRiders, hint: `Alleen jongerenklassement-renners (${youthEligibleRiders.length})` },
                  ].map(({ label, emoji, color, value, setter, riders: jerseyRiders, hint }) => {
                    const picked = value ? riderById.get(value) : null;
                    return (
                      <div key={label} className={cn("rounded-lg border-2 p-3 bg-secondary/30", color)}>
                        <div className="flex items-center gap-2 mb-2">
                          <span>{emoji}</span>
                          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            {label}
                          </span>
                        </div>
                        {picked ? (
                          <div className="font-display font-bold mb-2 truncate">{picked.name}</div>
                        ) : (
                          <div className="font-display italic text-muted-foreground mb-2">leeg</div>
                        )}
                        <RiderSearchSelect
                          riders={jerseyRiders}
                          value={value}
                          onChange={setter}
                          placeholder="Zoek renner..."
                          disabled={Boolean(isLocked)}
                        />
                        {hint && (
                          <p className="text-[10px] text-muted-foreground mt-2 italic">{hint}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {!gameLocked && !teamComplete && (
                <div className="ornate-frame retro-border bg-amber-500/10 border-amber-500/40 p-4 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🚴‍♂️💨</span>
                    <strong className="font-display text-base">Je Team is nog niet voltallig</strong>
                  </div>
                  <p className="text-muted-foreground mb-2 font-serif italic">
                    Een paar renners hangen nog achter de bezemwagen — vul de gaten op vóór de flamme rouge:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!gameLocked && !isSubmitted && teamComplete && (
                <div className="retro-border bg-amber-500/10 border-amber-500/40 p-4 text-sm">
                  ⚠️ <strong>Let op:</strong> je ploeg is compleet maar nog <strong>niet ingediend</strong>. Druk op <em>"Team definitief indienen"</em> om je inzending te bevestigen.
                  Als de admin de koers op <strong>deadline</strong> of <strong>live</strong> zet zonder dat je hebt ingediend, telt je huidige selectie automatisch als jouw team.
                </div>
              )}

              {/* Desktop action row */}
              <div className="hidden md:flex flex-col sm:flex-row gap-2 justify-end items-stretch sm:items-center">
                {!gameLocked && isSubmitted && (
                  <Button variant="outline" onClick={handleRevert} disabled={revertEntry.isPending}>
                    ✏️ Wijzigen
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={Boolean(isLocked || isSubmitted || submitEntry.isPending)}
                  className={cn(
                    "retro-border-primary font-bold",
                    teamComplete && !isSubmitted && !isLocked && "animate-pulse"
                  )}
                >
                  {isSubmitted ? "✅ Reeds ingediend" : "✅ Team definitief indienen"}
                </Button>
              </div>
              </>
              )}
            </TabsContent>

            <TabsContent value="startlist" className="space-y-4">
              <div className="retro-border bg-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    value={startlistSearch}
                    onChange={(e) => setStartlistSearch(e.target.value)}
                    placeholder="Zoek op renner..."
                  />
                  <Select value={startlistTeamFilter} onValueChange={setStartlistTeamFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter op team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle teams</SelectItem>
                      {allTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {startlistLoading && <div className="retro-border bg-card p-4">Startlijst laden...</div>}
              {!startlistLoading &&
                startlist.map((team) => (
                  <div key={team.id} className="ornate-frame retro-border bg-card p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-primary to-[hsl(var(--vintage-gold))]" />
                    <h3 className="font-display text-lg font-bold mb-2 pl-2">{team.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {team.riders.map((rider) => (
                        <div key={rider.id} className="border rounded-md p-2 bg-secondary/20 flex items-center gap-2">
                          <span className="inline-flex h-6 min-w-[1.75rem] px-1.5 items-center justify-center rounded-full bg-primary/15 border border-primary/30 font-mono text-xs">
                            {rider.start_number ?? "—"}
                          </span>
                          <span className="font-medium truncate text-slate-800">{rider.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Mobile sticky action bar */}
      {gameReady && game && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t-2 border-foreground p-3 flex gap-2">
          {!gameLocked && isSubmitted && (
            <Button variant="outline" onClick={handleRevert} disabled={revertEntry.isPending} className="flex-1">
              ✏️ Wijzigen
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={Boolean(isLocked || isSubmitted || submitEntry.isPending)}
            className={cn(
              "flex-1 retro-border-primary font-bold",
              teamComplete && !isSubmitted && !isLocked && "animate-pulse"
            )}
          >
            {isSubmitted ? "✅ Ingediend" : "✅ Definitief indienen"}
          </Button>
        </div>
      )}
      <RiderDetailPanel rider={detailRider} onClose={() => setDetailRider(null)} />
    </div>
  );
}
