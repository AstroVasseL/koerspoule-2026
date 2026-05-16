import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Star, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Same palette as SubpouleHeatmap
const CATEGORY_HUES = [330, 46, 142, 220, 358, 280, 25, 175, 305, 195, 110, 245, 0, 90, 250, 15, 200, 335, 60, 165, 75];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const DEMO_PLAYERS = [
  { user_id: "u1", display_name: "Lars van Dijk",  total_points: 312 },
  { user_id: "u2", display_name: "Sofie Hendriks", total_points: 298 },
  { user_id: "u3", display_name: "Bas de Groot",   total_points: 275 },
  { user_id: "u4", display_name: "Emma Janssen",   total_points: 261 },
  { user_id: "u5", display_name: "Pieter Kuipers", total_points: 244 },
  { user_id: "u6", display_name: "Roos Bakker",    total_points: 228 },
];

type DemoRider = { id: string; name: string; pickedBy: string[] };
type DemoCategory = { id: string; name: string; riders: DemoRider[] };

const DEMO_CATEGORIES: DemoCategory[] = [
  {
    id: "c1", name: "Klassement 1",
    riders: [
      { id: "r1", name: "Egan Bernal",       pickedBy: ["u1", "u2", "u4"] },
      { id: "r2", name: "Thymen Arensman",   pickedBy: ["u3"] },
      { id: "r3", name: "Giulio Pellizzari", pickedBy: ["u5"] },
      { id: "r4", name: "Adam Yates",        pickedBy: ["u6"] },
    ],
  },
  {
    id: "c2", name: "Klimmers",
    riders: [
      { id: "r5", name: "Santiago Buitrago", pickedBy: ["u1", "u3", "u4", "u6"] },
      { id: "r6", name: "Georg Steinhauser", pickedBy: ["u2", "u5"] },
    ],
  },
  {
    id: "c3", name: "Sprinters 1",
    riders: [
      { id: "r7", name: "Jonathan Milan",          pickedBy: ["u1", "u2", "u4"] },
      { id: "r8", name: "Tobias Lund Andresen",    pickedBy: ["u3", "u6"] },
      { id: "r9", name: "Dylan Groenewegen",       pickedBy: ["u5"] },
    ],
  },
  {
    id: "c4", name: "Aanvallers",
    riders: [
      { id: "r10", name: "Taco van der Hoorn", pickedBy: ["u1", "u3", "u5", "u6"] },
      { id: "r11", name: "Victor Lafay",        pickedBy: ["u2", "u4"] },
    ],
  },
  {
    id: "c5", name: "Tijdrijders",
    riders: [
      { id: "r12", name: "Filippo Ganna",    pickedBy: ["u1", "u2", "u3", "u5"] },
      { id: "r13", name: "Edoardo Affini",   pickedBy: ["u4", "u6"] },
    ],
  },
];

export default function DemoSubpouleHeatmap() {
  const [disabled, setDisabled] = useState<Set<string>>(() => new Set());

  const togglePlayer = useCallback((uid: string) => {
    setDisabled((prev) => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  }, []);

  const enableAll = useCallback(() => setDisabled(new Set()), []);
  const disableAll = useCallback(() => setDisabled(new Set(DEMO_PLAYERS.map((p) => p.user_id))), []);

  const enabledSet = useMemo(() => new Set(DEMO_PLAYERS.filter((p) => !disabled.has(p.user_id)).map((p) => p.user_id)), [disabled]);
  const N = enabledSet.size;

  const playerNameById = useMemo(() => new Map(DEMO_PLAYERS.map((p) => [p.user_id, p.display_name])), []);

  const cellsPerCategory = useMemo(() => {
    const result = new Map<string, Array<{ riderId: string; riderName: string; pickedBy: string[]; count: number; isUnique: boolean; rareness: number }>>();
    for (const cat of DEMO_CATEGORIES) {
      const cells = cat.riders
        .map((r) => {
          const pickedBy = r.pickedBy.filter((uid) => enabledSet.has(uid));
          const count = pickedBy.length;
          if (count === 0) return null;
          const rareness = N <= 1 ? 0 : (N - count) / (N - 1);
          return { riderId: r.id, riderName: r.name, pickedBy, count, isUnique: count === 1 && N >= 2, rareness };
        })
        .filter(Boolean) as any[];
      cells.sort((a: any, b: any) => a.count - b.count || a.riderName.localeCompare(b.riderName));
      if (cells.length > 0) result.set(cat.id, cells);
    }
    return result;
  }, [enabledSet, N]);

  const visibleCats = DEMO_CATEGORIES.filter((c) => (cellsPerCategory.get(c.id)?.length ?? 0) > 0);

  return (
    <Card className="retro-border bg-card">
      <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-display flex items-center gap-2 text-base">
              <Flame className="h-5 w-5 text-primary" />
              Het Pelotonbeeld — zeldzaamheid per categorie
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
            <button type="button" onClick={enableAll} className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 border-2 border-foreground rounded-md hover:bg-primary hover:text-primary-foreground transition-colors">
              <Eye className="h-3 w-3" /> Alles
            </button>
            <button type="button" onClick={disableAll} className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 border-2 border-foreground rounded-md hover:bg-secondary transition-colors">
              <EyeOff className="h-3 w-3" /> Geen
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {DEMO_PLAYERS.map((p) => {
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
        {N === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground font-serif italic">
            Geen deelnemers geselecteerd — klik op een naam hierboven om iemand toe te voegen.
          </div>
        ) : (
          <div>
            {visibleCats.map((cat, catIdx) => {
              const cells = cellsPerCategory.get(cat.id) ?? [];
              const hueBg = CATEGORY_HUES[catIdx % CATEGORY_HUES.length];
              return (
                <section
                  key={cat.id}
                  className="grid border-b border-foreground/15 last:border-b-0"
                  style={{ gridTemplateColumns: "minmax(96px, 140px) 1fr" }}
                >
                  <div className="border-r-2 border-foreground/15 px-3 py-3 flex items-center gap-2" style={{ backgroundColor: `hsl(${hueBg} 50% 92%)` }}>
                    <span className="h-3 w-3 rounded-full shrink-0 ring-1 ring-foreground/25" style={{ backgroundColor: `hsl(${hueBg} 65% 45%)` }} aria-hidden />
                    <h3 className="vintage-heading text-[11px] font-bold leading-tight">{cat.name}</h3>
                  </div>
                  <div className="p-2 grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))" }}>
                    {cells.map((cell: any) => {
                      const lightness = 90 - cell.rareness * 68;
                      const saturation = 30 + cell.rareness * 45;
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
                                <span className={cn("font-serif truncate min-w-0 text-sm leading-tight", cell.isUnique ? "font-bold" : "font-medium")}>
                                  {cell.riderName}
                                </span>
                                {cell.isUnique && (
                                  <Star className="h-3.5 w-3.5 shrink-0 fill-[hsl(var(--vintage-gold))] text-[hsl(var(--vintage-gold))]" aria-label="unieke keuze" />
                                )}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-1.5">
                                <div className="flex flex-wrap gap-0.5">
                                  {cell.pickedBy.map((uid: string) => (
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
                                  {cell.count}/{N}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-xs">
                            <p className="font-display font-bold">{cell.riderName}</p>
                            <p className="text-muted-foreground">
                              {cell.count} van {N} ({Math.round((cell.count / N) * 100)}%)
                              {cell.isUnique && " · unieke keuze"}
                            </p>
                            <p className="mt-1">
                              <span className="text-muted-foreground">Gekozen door: </span>
                              {cell.pickedBy.map((uid: string) => playerNameById.get(uid) ?? "?").join(", ")}
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
