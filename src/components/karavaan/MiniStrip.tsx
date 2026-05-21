import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MiniStripData } from "@/hooks/useKaravaanFeed";

/**
 * Compacte 3-cellen status-strip bovenaan De Karavaan.
 * Toont subpoule-positie, overall-positie en puntentotaal — niet meer.
 */
export default function MiniStrip({
  data,
  onClickProfile,
}: {
  data: MiniStripData;
  onClickProfile?: () => void;
}) {
  return (
    <div className="retro-border bg-card overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-foreground/15">
        <Cell value={`${data.subpoule.rank}ᵉ`} label="subpoule" delta={data.subpoule.delta} />
        <Cell value={`${data.overall.rank}ᵉ`} label="overall" delta={data.overall.delta} />
        <Cell value={data.points} label="punten" />
      </div>
      {onClickProfile && (
        <button
          type="button"
          onClick={onClickProfile}
          className="block w-full px-3 py-2 text-[10px] font-stamp uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground border-t border-foreground/15 transition-colors"
        >
          → bekijk je volledige ploeg
        </button>
      )}
    </div>
  );
}

function Cell({
  value,
  label,
  delta,
}: {
  value: string | number;
  label: string;
  delta?: number;
}) {
  return (
    <div className="px-3 py-3 md:py-4 text-center min-h-[80px] md:min-h-[90px] flex flex-col justify-center">
      <div className="flex items-center justify-center gap-1">
        <span className="font-oswald font-bold text-3xl md:text-4xl tabular-nums leading-none text-foreground uppercase">
          {value}
        </span>
        {typeof delta === "number" && (
          <DeltaIndicator delta={delta} />
        )}
      </div>
      <p className="overline-stamp mt-1.5">{label}</p>
    </div>
  );
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta === 0) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[hsl(var(--maillot-groen))] text-xs font-display font-bold tabular-nums">
        <ArrowUp className="h-3 w-3" />
        {delta}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[hsl(var(--bolletjes-bright))] text-xs font-display font-bold tabular-nums">
      <ArrowDown className="h-3 w-3" />
      {Math.abs(delta)}
    </span>
  );
}
