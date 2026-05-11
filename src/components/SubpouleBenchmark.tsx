import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Swords, ArrowRight, Trophy, Layers, Flag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubpouleBenchmark } from "@/hooks/useSubpouleBenchmark";
import { cn } from "@/lib/utils";

type Props = { subpouleId: string; gameId?: string };

function fmtDiff(diff: number) {
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

function diffClass(diff: number) {
  if (diff > 0) return "text-emerald-600 dark:text-emerald-400";
  if (diff < 0) return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}

export default function SubpouleBenchmark({ subpouleId, gameId }: Props) {
  const { user } = useAuth();
  const { data, isLoading } = useSubpouleBenchmark(subpouleId, gameId);

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
    const map = new Map<string, Map<string, number>>();
    for (const sp of data?.stage_points ?? []) {
      if (!map.has(sp.entry_id)) map.set(sp.entry_id, new Map());
      map.get(sp.entry_id)!.set(sp.stage_id, sp.points);
    }
    return map;
  }, [data]);

  const catPtsByEntry = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const cp of data?.category_points ?? []) {
      if (!map.has(cp.entry_id)) map.set(cp.entry_id, new Map());
      map.get(cp.entry_id)!.set(cp.category_id, cp.points);
    }
    return map;
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

  // Total based on approved stages only (per spec)
  const myStageTotal = Array.from(myStagePts.values()).reduce((a, b) => a + b, 0);
  const oppStageTotal = Array.from(oppStagePts.values()).reduce((a, b) => a + b, 0);
  const totalDiff = myStageTotal - oppStageTotal;

  return (
    <div className="space-y-4">
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <Swords className="h-5 w-5 text-primary" /> Benchmark — vergelijk twee teams
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

          <div className="max-h-60 overflow-y-auto divide-y divide-border border border-border rounded-md">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {query ? "Geen resultaten" : "Geen andere deelnemers in deze subpoule."}
              </div>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.user_id}
                  onClick={() => setOpponentId(e.user_id === opponentId ? null : e.user_id)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center justify-between text-left hover:bg-secondary/40 transition-colors",
                    opponentId === e.user_id && "bg-accent/20"
                  )}
                >
                  <div className="min-w-0">
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
          {/* Header card */}
          <Card className="retro-border">
            <CardContent className="p-4">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                <div className="text-center min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Jij</div>
                  <div className="font-display font-bold truncate text-foreground">{me.display_name}</div>
                  {me.team_name && <div className="text-xs text-muted-foreground truncate">{me.team_name}</div>}
                  <div className="font-display text-2xl font-bold tabular-nums text-foreground mt-1">{myStageTotal}</div>
                  <div className="text-[10px] text-muted-foreground">pt (gefiatteerd)</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Badge
                    variant="outline"
                    className={cn("font-display text-base font-bold tabular-nums px-3 py-1", diffClass(totalDiff))}
                  >
                    {fmtDiff(totalDiff)}
                  </Badge>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">verschil</span>
                </div>
                <div className="text-center min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tegen</div>
                  <div className="font-display font-bold truncate text-foreground">{opponent.display_name}</div>
                  {opponent.team_name && <div className="text-xs text-muted-foreground truncate">{opponent.team_name}</div>}
                  <div className="font-display text-2xl font-bold tabular-nums text-foreground mt-1">{oppStageTotal}</div>
                  <div className="text-[10px] text-muted-foreground">pt (gefiatteerd)</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Berekend tot en met de laatste gefiatteerde etappe
                {stages.length > 0 ? ` (etappe ${stages[stages.length - 1].stage_number})` : ""}.
              </p>
            </CardContent>
          </Card>

          {/* Per category */}
          <Card className="retro-border">
            <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-primary" /> Per categorie
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] gap-2 px-3 py-2 border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Jij</span>
                <span className="text-center w-12">pt</span>
                <span className="text-center min-w-[80px]">Categorie</span>
                <span className="text-center w-12">pt</span>
                <span className="text-right">Tegen</span>
              </div>
              <div className="divide-y divide-border">
                {categories.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground text-center">Geen categorieën gevonden.</div>
                )}
                {categories.map((c) => {
                  const myP = myCatPts.get(c.id) ?? 0;
                  const oppP = oppCatPts.get(c.id) ?? 0;
                  const diff = myP - oppP;
                  return (
                    <div
                      key={c.id}
                      className="grid grid-cols-[1fr_auto_auto_auto_1fr] gap-2 px-3 py-2 text-sm items-center"
                    >
                      <div className="text-left text-muted-foreground truncate">jouw inzet</div>
                      <div className="text-center w-12 font-display font-bold tabular-nums text-foreground">{myP}</div>
                      <div className="text-center min-w-[80px]">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {c.short_name || c.name}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("font-mono text-[10px] mt-0.5 px-1.5 py-0", diffClass(diff))}
                        >
                          {fmtDiff(diff)}
                        </Badge>
                      </div>
                      <div className="text-center w-12 font-display font-bold tabular-nums text-foreground">{oppP}</div>
                      <div className="text-right text-muted-foreground truncate">hun inzet</div>
                    </div>
                  );
                })}
              </div>
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
                          className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-3 py-2 text-sm items-center"
                        >
                          <div className="w-8 text-center font-display font-bold text-muted-foreground">
                            {s.stage_number}
                          </div>
                          <div className="truncate text-foreground">{s.name ?? `Etappe ${s.stage_number}`}</div>
                          <div className="text-right w-12 font-display font-bold tabular-nums text-foreground">
                            {myP}
                          </div>
                          <div className={cn("text-center w-14 font-mono text-xs tabular-nums", diffClass(diff))}>
                            {fmtDiff(diff)}
                          </div>
                          <div className="text-right w-12 font-display font-bold tabular-nums text-foreground">
                            {oppP}
                          </div>
                        </div>
                      );
                    })}
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-3 py-2 text-sm items-center bg-secondary/30 border-t-2 border-foreground">
                      <div className="w-8 text-center">
                        <Trophy className="h-4 w-4 text-primary mx-auto" />
                      </div>
                      <div className="font-display font-bold text-foreground">Totaal</div>
                      <div className="text-right w-12 font-display font-bold tabular-nums text-foreground">
                        {myStageTotal}
                      </div>
                      <div className={cn("text-center w-14 font-display font-bold tabular-nums", diffClass(totalDiff))}>
                        {fmtDiff(totalDiff)}
                      </div>
                      <div className="text-right w-12 font-display font-bold tabular-nums text-foreground">
                        {oppStageTotal}
                      </div>
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
