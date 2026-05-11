import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Swords, ArrowRight, Trophy, Layers, Flag, Star, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { BenchmarkData } from "@/hooks/useSubpouleBenchmark";
import { cn } from "@/lib/utils";

type Props = {
  data?: BenchmarkData;
  isLoading: boolean;
  scopeLabel?: string;
  /** "Geen tegenstanders" placeholder */
  emptyOpponentsHint?: string;
};

function fmtDiff(d: number) {
  return d > 0 ? `+${d}` : `${d}`;
}
function diffTone(d: number) {
  if (d > 0) return "text-emerald-600 dark:text-emerald-400";
  if (d < 0) return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}
function diffBg(d: number) {
  if (d > 0) return "bg-emerald-500/10 border-emerald-500/30";
  if (d < 0) return "bg-rose-500/10 border-rose-500/30";
  return "bg-muted/40 border-border";
}

export default function BenchmarkPanel({ data, isLoading, scopeLabel, emptyOpponentsHint }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [opponentId, setOpponentId] = useState<string | null>(null);

  const me = useMemo(
    () => data?.entries.find((e) => e.user_id === user?.id) ?? null,
    [data, user?.id]
  );
  const opponent = useMemo(
    () => (opponentId ? data?.entries.find((e) => e.user_id === opponentId) ?? null : null),
    [data, opponentId]
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.entries
      .filter((e) => e.user_id !== user?.id)
      .filter((e) => {
        if (!q) return true;
        return (
          e.display_name.toLowerCase().includes(q) ||
          (e.team_name?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.total_points - a.total_points);
  }, [data, query, user?.id]);

  const stagePtsByEntry = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const sp of data?.stage_points ?? []) {
      if (!m.has(sp.entry_id)) m.set(sp.entry_id, new Map());
      m.get(sp.entry_id)!.set(sp.stage_id, sp.points);
    }
    return m;
  }, [data]);

  const catPtsByEntry = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const cp of data?.category_points ?? []) {
      if (!m.has(cp.entry_id)) m.set(cp.entry_id, new Map());
      m.get(cp.entry_id)!.set(cp.category_id, cp.points);
    }
    return m;
  }, [data]);

  // picks per entry per category -> array of {rider_name, is_joker}
  const picksByEntry = useMemo(() => {
    const m = new Map<string, Map<string, { name: string; joker: boolean }[]>>();
    for (const p of data?.picks ?? []) {
      if (!m.has(p.entry_id)) m.set(p.entry_id, new Map());
      const inner = m.get(p.entry_id)!;
      if (!inner.has(p.category_id)) inner.set(p.category_id, []);
      inner.get(p.category_id)!.push({ name: p.rider_name ?? "—", joker: p.is_joker });
    }
    return m;
  }, [data]);

  if (isLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Laden…</CardContent>
      </Card>
    );
  }
  if (!me) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Je hebt nog geen team in deze koers. Maak eerst een team aan om te kunnen vergelijken.
        </CardContent>
      </Card>
    );
  }

  const stages = data?.stages ?? [];
  const categories = data?.categories ?? [];

  const myStagePts = stagePtsByEntry.get(me.entry_id ?? "") ?? new Map();
  const oppStagePts = opponent ? (stagePtsByEntry.get(opponent.entry_id ?? "") ?? new Map()) : new Map();
  const myCatPts = catPtsByEntry.get(me.entry_id ?? "") ?? new Map();
  const oppCatPts = opponent ? (catPtsByEntry.get(opponent.entry_id ?? "") ?? new Map()) : new Map();
  const myPicks = picksByEntry.get(me.entry_id ?? "") ?? new Map();
  const oppPicks = opponent ? (picksByEntry.get(opponent.entry_id ?? "") ?? new Map()) : new Map();

  const myStageTotal = Array.from(myStagePts.values()).reduce((a: number, b: number) => a + b, 0);
  const oppStageTotal = Array.from(oppStagePts.values()).reduce((a: number, b: number) => a + b, 0);
  const totalDiff = myStageTotal - oppStageTotal;

  const renderRiderList = (riders: { name: string; joker: boolean }[]) => {
    if (!riders || riders.length === 0)
      return <span className="text-[11px] italic text-muted-foreground/60">geen keuzes</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {riders.map((r, i) => (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
              r.joker
                ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                : "bg-secondary/60 border-border text-foreground"
            )}
          >
            {r.joker && <Star className="h-2.5 w-2.5 fill-current" />}
            {r.name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Selector */}
      <Card className="retro-border overflow-hidden">
        <CardHeader className="border-b-2 border-foreground bg-gradient-to-r from-secondary/40 via-secondary/20 to-transparent py-3">
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <Swords className="h-5 w-5 text-primary" />
            Benchmark{scopeLabel ? <span className="text-xs font-normal text-muted-foreground">· {scopeLabel}</span> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op deelnemernaam of teamnaam..."
              className="pl-9"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-border border border-border rounded-md bg-background/50">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {query ? "Geen resultaten" : (emptyOpponentsHint ?? "Geen andere deelnemers gevonden.")}
              </div>
            ) : (
              filtered.slice(0, 100).map((e, idx) => (
                <button
                  key={e.user_id}
                  onClick={() => setOpponentId(e.user_id === opponentId ? null : e.user_id)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-secondary/40 transition-colors",
                    opponentId === e.user_id && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                >
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground w-6 text-right">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-foreground">{e.display_name}</div>
                    {e.team_name && (
                      <div className="text-xs text-muted-foreground truncate">{e.team_name}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold tabular-nums text-foreground">{e.total_points}</div>
                    <div className="text-[10px] text-muted-foreground">pt totaal</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {opponent && (
        <>
          {/* Hero header */}
          <Card className="retro-border overflow-hidden">
            <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <div className="text-center min-w-0">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] uppercase tracking-wider text-primary font-bold">
                    <Crown className="h-3 w-3" /> Jij
                  </div>
                  <div className="font-display font-bold text-foreground truncate mt-2">{me.display_name}</div>
                  {me.team_name && <div className="text-xs text-muted-foreground truncate italic">{me.team_name}</div>}
                  <div className="font-display text-3xl font-bold tabular-nums text-foreground mt-2">{myStageTotal}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">pt gefiatteerd</div>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn("rounded-full border-2 px-4 py-2 backdrop-blur-sm", diffBg(totalDiff))}>
                    <div className={cn("font-display text-xl font-bold tabular-nums leading-none", diffTone(totalDiff))}>
                      {fmtDiff(totalDiff)}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">verschil</span>
                </div>
                <div className="text-center min-w-0">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Tegenstander
                  </div>
                  <div className="font-display font-bold text-foreground truncate mt-2">{opponent.display_name}</div>
                  {opponent.team_name && <div className="text-xs text-muted-foreground truncate italic">{opponent.team_name}</div>}
                  <div className="font-display text-3xl font-bold tabular-nums text-foreground mt-2">{oppStageTotal}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">pt gefiatteerd</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Berekend tot en met de laatste gefiatteerde etappe
                {stages.length > 0 ? ` (etappe ${stages[stages.length - 1].stage_number})` : ""}.
              </p>
            </div>
          </Card>

          {/* Per category — with rider names */}
          <Card className="retro-border">
            <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-primary" /> Per categorie
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {categories.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">Geen categorieën gevonden.</div>
              )}
              {categories.map((c) => {
                const myP = myCatPts.get(c.id) ?? 0;
                const oppP = oppCatPts.get(c.id) ?? 0;
                const diff = myP - oppP;
                const myR = myPicks.get(c.id) ?? [];
                const oppR = oppPicks.get(c.id) ?? [];
                return (
                  <div key={c.id} className="px-3 py-3 space-y-2">
                    {/* category header strip */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {c.short_name || c.name}
                        </span>
                        {c.short_name && (
                          <span className="text-xs text-muted-foreground truncate">{c.name}</span>
                        )}
                      </div>
                      <Badge variant="outline" className={cn("font-mono tabular-nums text-xs", diffTone(diff))}>
                        {fmtDiff(diff)}
                      </Badge>
                    </div>
                    {/* two columns of riders + points */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded-md border border-border bg-background/40 p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Jouw keuzes</span>
                          <span className="font-display font-bold tabular-nums text-foreground text-sm">{myP} pt</span>
                        </div>
                        {renderRiderList(myR)}
                      </div>
                      <div className="rounded-md border border-border bg-background/40 p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hun keuzes</span>
                          <span className="font-display font-bold tabular-nums text-foreground text-sm">{oppP} pt</span>
                        </div>
                        {renderRiderList(oppR)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Per stage */}
          <Card className="retro-border">
            <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Flag className="h-5 w-5 text-primary" /> Per etappe
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stages.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Nog geen gefiatteerde etappes beschikbaar.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-3 py-2 border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="w-8 text-center">#</span>
                    <span>Etappe</span>
                    <span className="text-right w-12">Jij</span>
                    <span className="text-center w-14">Δ</span>
                    <span className="text-right w-12">Tegen</span>
                  </div>
                  <div className="divide-y divide-border">
                    {stages.map((s) => {
                      const myP = myStagePts.get(s.id) ?? 0;
                      const oppP = oppStagePts.get(s.id) ?? 0;
                      const diff = myP - oppP;
                      return (
                        <div
                          key={s.id}
                          className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-3 py-2 text-sm items-center hover:bg-secondary/20 transition-colors"
                        >
                          <div className="w-8 text-center font-display font-bold text-muted-foreground">
                            {s.stage_number}
                          </div>
                          <div className="truncate text-foreground">{s.name ?? `Etappe ${s.stage_number}`}</div>
                          <div className="text-right w-12 font-display font-bold tabular-nums text-foreground">{myP}</div>
                          <div className={cn("text-center w-14 font-mono text-xs tabular-nums", diffTone(diff))}>
                            {fmtDiff(diff)}
                          </div>
                          <div className="text-right w-12 font-display font-bold tabular-nums text-foreground">{oppP}</div>
                        </div>
                      );
                    })}
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-3 py-2 text-sm items-center bg-secondary/30 border-t-2 border-foreground">
                      <div className="w-8 text-center">
                        <Trophy className="h-4 w-4 text-primary mx-auto" />
                      </div>
                      <div className="font-display font-bold text-foreground">Totaal</div>
                      <div className="text-right w-12 font-display font-bold tabular-nums text-foreground">{myStageTotal}</div>
                      <div className={cn("text-center w-14 font-display font-bold tabular-nums", diffTone(totalDiff))}>
                        {fmtDiff(totalDiff)}
                      </div>
                      <div className="text-right w-12 font-display font-bold tabular-nums text-foreground">{oppStageTotal}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!opponent && (
        <Card className="retro-border border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
            <ArrowRight className="h-5 w-5 text-muted-foreground/60" />
            Selecteer hierboven een deelnemer om de benchmark te starten.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
