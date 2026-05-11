import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Star, Eye, EyeOff } from "lucide-react";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { useSubpouleEntries, type SubpouleEntry } from "@/hooks/useSubpouleEntries";
import { cn } from "@/lib/utils";

type Props = { subpouleId: string };

// One hue per category, ordered by visible-list index. Pink first, yellow
// second, then green, navy, red, etc. — a vintage jersey-poster palette.
const CATEGORY_HUES = [330, 46, 142, 220, 358, 280, 25, 175, 305, 195, 110, 245, 0, 90, 250, 15, 200, 335, 60, 165, 75];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type RiderCell = {
  riderId: string;
  riderName: string;
  pickedBy: string[]; // enabled user_ids who picked this rider in this category
  count: number;
  isUnique: boolean;
  rareness: number; // 0 (everyone) … 1 (rarest)
};

export default function SubpouleHeatmap({ subpouleId }: Props) {
  const { data: game } = useCurrentGame();
  const { data: categories = [] } = useCategories(game?.id);
  const { data, isLoading } = useSubpouleEntries(subpouleId, game?.id);

  const allPlayers: SubpouleEntry[] = useMemo(() => {
    if (!data) return [];
    return [...data.entries].sort(
      (a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name),
    );
  }, [data]);

  const [disabled, setDisabled] = useState<Set<string>>(() => new Set());

  const togglePlayer = useCallback((userId: string) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const enableAll = useCallback(() => setDisabled(new Set()), []);
  const disableAll = useCallback(() => {
    setDisabled(new Set(allPlayers.map((p) => p.user_id)));
  }, [allPlayers]);

  const enabledPlayers = useMemo(
    () => allPlayers.filter((p) => !disabled.has(p.user_id)),
    [allPlayers, disabled],
  );

  const playerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allPlayers) m.set(p.user_id, p.display_name);
    return m;
  }, [allPlayers]);

  // For each category, build a list of rider cells sorted rarest-first.
  const cellsPerCategory = useMemo(() => {
    const result = new Map<string, RiderCell[]>();
    if (!data) return result;
    const enabledSet = new Set(enabledPlayers.map((p) => p.user_id));
    const N = enabledSet.size;

    for (const cat of categories) {
      const riderToPickers = new Map<string, string[]>();
      for (const e of data.entries) {
        if (!enabledSet.has(e.user_id)) continue;
        const picks = e.picks.get(cat.id);
        if (!picks) continue;
        for (const riderId of picks) {
          const arr = riderToPickers.get(riderId) ?? [];
          arr.push(e.user_id);
          riderToPickers.set(riderId, arr);
        }
      }

      const cells: RiderCell[] = Array.from(riderToPickers.entries()).map(([riderId, pickedBy]) => {
        const count = pickedBy.length;
        const rareness = N <= 1 ? 0 : (N - count) / (N - 1);
        return {
          riderId,
          riderName: data.ridersById.get(riderId)?.name ?? "—",
          pickedBy,
          count,
          isUnique: count === 1 && N >= 2,
          rareness,
        };
      });

      // Rarest leftmost, then alphabetical for stable ties.
      cells.sort((a, b) => a.count - b.count || a.riderName.localeCompare(b.riderName));
      if (cells.length > 0) result.set(cat.id, cells);
    }
    return result;
  }, [data, categories, enabledPlayers]);

  if (isLoading || !data) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Laden…</CardContent>
      </Card>
    );
  }

  if (allPlayers.length === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Nog geen teams in deze subpoule.</CardContent>
      </Card>
    );
  }

  const totalEnabled = enabledPlayers.length;
  const sortedCats = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const visibleCats = sortedCats.filter((c) => (cellsPerCategory.get(c.id)?.length ?? 0) > 0);

  return (
    <Card className="retro-border bg-card">
      <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-display flex items-center gap-2 text-base">
              <Flame className="h-5 w-5 text-primary" />
              Le Palmarès — zeldzaamheid per categorie
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-[hsl(var(--vintage-gold))] text-[hsl(var(--vintage-gold))]" />
                uniek
              </span>
              <span aria-hidden>·</span>
              <span>donker = zeldzamer · klik op een deelnemer om in/uit te zetten</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={enableAll}
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 border-2 border-foreground rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Eye className="h-3 w-3" />
              Alles
            </button>
            <button
              type="button"
              onClick={disableAll}
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 border-2 border-foreground rounded-md hover:bg-secondary transition-colors"
            >
              <EyeOff className="h-3 w-3" />
              Geen
            </button>
          </div>
        </div>

        {/* Legend: participants. Click to toggle. */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {allPlayers.map((p) => {
            const isOn = !disabled.has(p.user_id);
            return (
              <button
                key={p.user_id}
                type="button"
                onClick={() => togglePlayer(p.user_id)}
                aria-pressed={isOn}
                title={isOn ? `Verberg ${p.display_name}` : `Toon ${p.display_name}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-0.5 text-xs border-2 border-foreground transition-all",
                  isOn
                    ? "bg-card text-foreground hover:scale-105"
                    : "bg-secondary/40 text-muted-foreground opacity-55 hover:opacity-85 line-through decoration-1",
                )}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold bg-white text-black shadow-sm ring-1 ring-foreground/30">
                  {initials(p.display_name)}
                </span>
                <span className="font-medium truncate max-w-[120px]">{p.display_name}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {totalEnabled === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground font-serif italic">
            Geen deelnemers geselecteerd — klik op een naam hierboven om iemand toe te voegen.
          </div>
        ) : visibleCats.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground font-serif italic">
            Geen keuzes om te tonen voor deze selectie.
          </div>
        ) : (
          <div>
            {visibleCats.map((cat) => {
              const cells = cellsPerCategory.get(cat.id) ?? [];
              // Position in the sorted list of *visible* categories drives the hue,
              // so the user always sees pink → yellow → green → … from top to bottom.
              const catIdx = visibleCats.indexOf(cat);
              const hueBg = CATEGORY_HUES[catIdx % CATEGORY_HUES.length];
              return (
                <section
                  key={cat.id}
                  className="grid border-b border-foreground/15 last:border-b-0"
                  style={{ gridTemplateColumns: "minmax(96px, 140px) 1fr" }}
                >
                  {/* Y-axis label — sticky-feeling vertical band with the category's hue */}
                  <div
                    className="border-r-2 border-foreground/15 px-3 py-3 flex items-center gap-2"
                    style={{ backgroundColor: `hsl(${hueBg} 50% 92%)` }}
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0 ring-1 ring-foreground/25"
                      style={{ backgroundColor: `hsl(${hueBg} 65% 45%)` }}
                      aria-hidden
                    />
                    <h3 className="vintage-heading text-[11px] font-bold leading-tight">{cat.name}</h3>
                  </div>

                  {/* X-axis: rider cells, rarest-first */}
                  <div className="p-2 grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))" }}>
                    {cells.map((cell) => {
                      // Per-category hue, with rareness driving both saturation and darkness.
                      // Rarer → more saturated and darker → screams for attention.
                      const lightness = 90 - cell.rareness * 68; // 22..90
                      const saturation = 30 + cell.rareness * 45; // 30..75
                      const textLight = lightness < 58;
                      const dotOutline = textLight
                        ? "0 0 0 1px hsl(44 60% 96% / 0.5)"
                        : "0 0 0 1px hsl(30 35% 22% / 0.35)";

                      return (
                        <Tooltip key={cell.riderId}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "rounded-md px-2.5 py-2 cursor-default transition-transform hover:scale-[1.02] hover:z-10 relative",
                                cell.isUnique && "ring-2 ring-[hsl(var(--vintage-gold))] ring-offset-1 ring-offset-card shadow-[2px_2px_0_hsl(var(--vintage-gold)/0.5)]",
                              )}
                              style={{
                                backgroundColor: `hsl(${hueBg} ${saturation}% ${lightness}%)`,
                                color: textLight ? "hsl(44 55% 95%)" : "hsl(var(--foreground))",
                              }}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <span
                                  className={cn(
                                    "font-serif truncate min-w-0 text-sm leading-tight",
                                    cell.isUnique ? "font-bold" : "font-medium",
                                  )}
                                >
                                  {cell.riderName}
                                </span>
                                {cell.isUnique && (
                                  <Star
                                    className="h-3.5 w-3.5 shrink-0 fill-[hsl(var(--vintage-gold))] text-[hsl(var(--vintage-gold))]"
                                    aria-label="unieke keuze"
                                  />
                                )}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-1.5">
                                <div className="flex flex-wrap gap-0.5">
                                  {cell.pickedBy.map((uid) => (
                                    <span
                                      key={uid}
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold bg-white text-black"
                                      style={{ boxShadow: dotOutline }}
                                      title={playerNameById.get(uid) ?? ""}
                                    >
                                      {initials(playerNameById.get(uid) ?? "?")}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[10px] tabular-nums font-semibold opacity-85 shrink-0">
                                  {cell.count}/{totalEnabled}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-xs">
                            <p className="font-display font-bold">{cell.riderName}</p>
                            <p className="text-muted-foreground">
                              {cell.count} van {totalEnabled} ({Math.round((cell.count / totalEnabled) * 100)}%)
                              {cell.isUnique && " · unieke keuze"}
                            </p>
                            <p className="mt-1">
                              <span className="text-muted-foreground">Gekozen door: </span>
                              {cell.pickedBy.map((uid) => playerNameById.get(uid) ?? "?").join(", ")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
