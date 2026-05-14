import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useRiderStats } from "@/hooks/useRiderStats";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2 } from "lucide-react";

type DetailRider = {
  id: string;
  name: string;
  firstcycling_id: number | null;
};

function resultColor(result: string): string {
  if (result === "1") return "text-yellow-600 dark:text-yellow-400 font-bold";
  if (result === "2") return "text-slate-500 dark:text-slate-300 font-bold";
  if (result === "3") return "text-amber-700 dark:text-amber-500 font-bold";
  const n = Number(result);
  if (!isNaN(n) && n >= 4 && n <= 10) return "text-emerald-700 dark:text-emerald-400 font-semibold";
  if (/dnf|dns|dsq|oof/i.test(result)) return "text-muted-foreground/60";
  return "text-foreground";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function RiderDetailPanel({
  rider,
  onClose,
}: {
  rider: DetailRider | null;
  onClose: () => void;
}) {
  const { data: stats, isLoading, isError } = useRiderStats(rider?.firstcycling_id);

  return (
    <Sheet open={Boolean(rider)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {rider && (
          <>
            {/* Masthead */}
            <div className="border-b border-border bg-card px-5 pt-5 pb-4 relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary opacity-80" />
              <SheetHeader className="space-y-0.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Rennersprofiel
                </div>
                <SheetTitle className="font-display text-xl leading-tight">
                  {stats?.rider_name || rider.name}
                </SheetTitle>
                {stats && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {stats.rider_nationality && (
                      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
                        {stats.rider_nationality}
                      </span>
                    )}
                    {stats.rider_team && (
                      <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                        {stats.rider_team}
                      </span>
                    )}
                  </div>
                )}
              </SheetHeader>
              {rider.firstcycling_id && (
                <a
                  href={`https://firstcycling.com/rider.php?r=${rider.firstcycling_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-mono"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Bekijk volledig profiel op FirstCycling
                </a>
              )}
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              {!rider.firstcycling_id ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-3">🔍</div>
                  <p className="text-sm text-muted-foreground font-serif italic">
                    Geen FirstCycling-koppeling gevonden.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Een admin kan dit instellen in de startlijst.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-serif italic">Uitslagen laden...</span>
                </div>
              ) : isError ? (
                <div className="text-center py-12 text-sm text-muted-foreground font-serif italic">
                  Uitslagen tijdelijk niet beschikbaar.
                </div>
              ) : !stats || stats.results.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground font-serif italic">
                    Geen uitslagen gevonden voor 2026.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider">
                      Seizoen 2026
                    </h3>
                    <span className="text-xs text-muted-foreground font-mono">
                      {stats.results.length} koersen
                    </span>
                  </div>

                  <div className="border border-border rounded-sm overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/60 border-b border-border">
                          <th className="text-left px-2.5 py-1.5 font-mono uppercase tracking-wide text-[10px] text-muted-foreground w-12">
                            Datum
                          </th>
                          <th className="text-left px-2.5 py-1.5 font-mono uppercase tracking-wide text-[10px] text-muted-foreground">
                            Koers
                          </th>
                          <th className="text-left px-2.5 py-1.5 font-mono uppercase tracking-wide text-[10px] text-muted-foreground w-10 hidden sm:table-cell">
                            Cat.
                          </th>
                          <th className="text-left px-2.5 py-1.5 font-mono uppercase tracking-wide text-[10px] text-muted-foreground w-8 hidden sm:table-cell">
                            Et.
                          </th>
                          <th className="text-right px-2.5 py-1.5 font-mono uppercase tracking-wide text-[10px] text-muted-foreground w-10">
                            Pos.
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {stats.results.map((r, i) => (
                          <tr
                            key={i}
                            className={cn(
                              "hover:bg-muted/30 transition-colors",
                              i % 2 === 0 ? "bg-background" : "bg-muted/20"
                            )}
                          >
                            <td className="px-2.5 py-1.5 font-mono text-muted-foreground">
                              {formatDate(r.date)}
                            </td>
                            <td className="px-2.5 py-1.5 font-medium max-w-[160px]">
                              <a
                                href={r.race_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary hover:underline truncate block"
                                title={r.race}
                              >
                                {r.race}
                              </a>
                            </td>
                            <td className="px-2.5 py-1.5 text-muted-foreground hidden sm:table-cell">
                              {r.category}
                            </td>
                            <td className="px-2.5 py-1.5 text-muted-foreground hidden sm:table-cell font-mono">
                              {r.stage ?? "—"}
                            </td>
                            <td className={cn("px-2.5 py-1.5 text-right font-mono", resultColor(r.result))}>
                              {r.result}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
