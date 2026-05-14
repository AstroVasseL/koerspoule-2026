import { Trophy, Mountain, Users, Crown, Star } from "lucide-react";
import FlagIcon from "@/components/FlagIcon";
import { usePalmares, type PalmaresGame, type PalmaresSubpoule, type StageDagzege } from "@/hooks/usePalmares";
import { cn } from "@/lib/utils";

function gameTypeToCountry(type: string | null): "IT" | "FR" | "ES" {
  const k = (type ?? "").toLowerCase();
  if (k === "tour" || k === "tdf") return "FR";
  if (k === "vuelta" || k === "vta") return "ES";
  return "IT";
}

const TYPE_COLOR: Record<string, string> = {
  vlak: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  heuvelachtig: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  bergop: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  tijdrit: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  ploegentijdrit: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

const TYPE_LABEL: Record<string, string> = {
  vlak: "Vlak",
  heuvelachtig: "Heuvelachtig",
  bergop: "Bergrit",
  tijdrit: "Tijdrit",
  ploegentijdrit: "Ploegentijdrit",
};

// ── RankBadge ──────────────────────────────────────────────────

function RankBadge({ rank, total }: { rank: number; total: number }) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  const isTop = rank <= 3;

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-full font-display font-black w-[68px] h-[68px] ring-2",
          isFirst && "ring-amber-400 bg-amber-950/60 shadow-lg shadow-amber-500/25",
          isSecond && "ring-zinc-400 bg-zinc-800/60 shadow-md shadow-zinc-400/15",
          isThird && "ring-orange-500 bg-orange-950/60 shadow-md shadow-orange-500/15",
          !isTop && "ring-border bg-secondary/40"
        )}
      >
        {isFirst && <Crown className="w-3.5 h-3.5 text-amber-300 mb-0.5" />}
        {!isFirst && isSecond && <Star className="w-3 h-3 text-zinc-400 mb-0.5" />}
        {!isFirst && !isSecond && isThird && <Star className="w-3 h-3 text-orange-400 mb-0.5" />}
        <span
          className={cn(
            "leading-none",
            isFirst ? "text-xl text-amber-200" : isSecond ? "text-xl text-zinc-300" : isThird ? "text-xl text-orange-300" : "text-base text-foreground/70"
          )}
        >
          #{rank}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground font-sans">van {total}</p>
    </div>
  );
}

// ── DagzegeRow ─────────────────────────────────────────────────

function DagzegeRow({ dz }: { dz: StageDagzege }) {
  const typeClass = TYPE_COLOR[dz.stage_type ?? "vlak"] ?? TYPE_COLOR.vlak;
  const typeLabel = TYPE_LABEL[dz.stage_type ?? "vlak"] ?? dz.stage_type ?? "Vlak";
  return (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-950/30 to-amber-950/5 border border-amber-500/20 hover:border-amber-400/40 hover:from-amber-950/40 transition-colors">
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/30">
        <Trophy className="w-3.5 h-3.5 text-amber-400" />
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-display font-bold text-sm text-amber-100 shrink-0">Rit {dz.stage_number}</span>
        {dz.stage_name && (
          <span className="text-xs text-foreground/50 truncate hidden sm:block">{dz.stage_name}</span>
        )}
      </div>
      <span className={cn("text-[10px] font-mono rounded border px-1.5 py-0.5 shrink-0", typeClass)}>
        {typeLabel}
      </span>
      <div className="flex items-baseline gap-0.5 shrink-0">
        <span className="font-display font-bold text-sm text-amber-400">{dz.points}</span>
        <span className="text-[10px] text-muted-foreground">pt</span>
      </div>
    </div>
  );
}

// ── GameSection ────────────────────────────────────────────────

function GameSection({ g }: { g: PalmaresGame }) {
  const country = gameTypeToCountry(g.game_type);
  const isLive = ["active", "live", "open", "locked"].includes(g.status);

  return (
    <div className="relative rounded-xl border border-border overflow-hidden bg-card">
      {/* Gold top accent */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

      {/* Game header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-secondary/40">
        <FlagIcon country={country} className="w-7 h-5 rounded-sm shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm truncate">{g.game_name}</h3>
          <p className="text-[10px] text-muted-foreground">
            {isLive ? "🟢 Lopend" : g.year ? `${g.year}` : "Afgelopen"}
          </p>
        </div>
        {g.my_rank === 1 && (
          <span className="shrink-0 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Leider
          </span>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Rank + stats row */}
        <div className="flex items-start gap-4">
          <RankBadge rank={g.my_rank} total={g.total_participants} />
          <div className="flex-1 grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-lg bg-secondary/40 border border-border py-2.5 px-1 text-center">
              <p className="font-display text-xl font-black text-amber-400">{g.stage_wins}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Dagzeges</p>
            </div>
            <div className="rounded-lg bg-secondary/40 border border-border py-2.5 px-1 text-center">
              <p className="font-display text-xl font-black">{g.stage_podiums}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Podia</p>
            </div>
            <div className="rounded-lg bg-secondary/40 border border-border py-2.5 px-1 text-center">
              <p className="font-display text-xl font-black text-primary">{g.approved_points}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Punten</p>
            </div>
          </div>
        </div>

        {/* Dagzeges list */}
        {g.dagzeges.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-amber-500/80">
                Dagzeges · Poule
              </span>
            </div>
            <div className="space-y-1.5">
              {g.dagzeges.map((dz) => (
                <DagzegeRow key={dz.stage_id} dz={dz} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic font-serif text-center py-1">
            Nog geen dagzeges — maar elke rit is een nieuwe kans.
          </p>
        )}
      </div>
    </div>
  );
}

// ── SubpouleSection ────────────────────────────────────────────

function SubpouleSection({ s }: { s: PalmaresSubpoule }) {
  const country = gameTypeToCountry(s.game_type);
  const medal =
    s.my_rank === 1 ? "🥇" : s.my_rank === 2 ? "🥈" : s.my_rank === 3 ? "🥉" : null;

  return (
    <div className="relative rounded-xl border border-border overflow-hidden bg-card">
      <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-secondary/40">
        {medal ? (
          <span className="text-xl w-7 text-center shrink-0">{medal}</span>
        ) : (
          <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
            #{s.my_rank}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm truncate">{s.subpoule_name}</h3>
          <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <FlagIcon country={country} className="w-3.5 h-2.5 inline" /> {s.game_name}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("font-display font-bold text-sm", s.my_rank <= 3 && "text-primary")}>
            #{s.my_rank}
          </p>
          <p className="text-[10px] text-muted-foreground">/ {s.total_members}</p>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex gap-2">
          <div className="flex-1 rounded-md bg-secondary/40 border border-border py-2 text-center">
            <p className="font-display font-bold text-amber-400">{s.stage_wins}</p>
            <p className="text-[10px] text-muted-foreground">Dagzeges</p>
          </div>
          <div className="flex-1 rounded-md bg-secondary/40 border border-border py-2 text-center">
            <p className="font-display font-bold">{s.stage_podiums}</p>
            <p className="text-[10px] text-muted-foreground">Podia</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────

function PalmaresSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="h-44 rounded-xl bg-secondary/30 animate-pulse border border-border" />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function PalmaresPanel() {
  const { data, isLoading } = usePalmares();
  const games = data?.games ?? [];
  const subpoules = data?.subpoules ?? [];

  const totalDagzeges = games.reduce((s, g) => s + g.stage_wins, 0);
  const totalPodiums = games.reduce((s, g) => s + g.stage_podiums, 0);
  const bestPoolRank = games.length
    ? Math.min(...games.map((g) => g.my_rank).filter((r) => r > 0))
    : 0;
  const subWins = subpoules.filter((s) => s.is_winner).length;

  if (isLoading) return <PalmaresSkeleton />;

  if (games.length === 0) {
    return (
      <div className="relative rounded-xl border border-border overflow-hidden bg-card p-8 text-center">
        <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mb-6" />
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground/25 mb-3" />
        <p className="font-display font-bold text-foreground/50 mb-1">Nog geen palmares</p>
        <p className="text-sm text-muted-foreground italic font-serif">
          Speel een koers mee om hier je erelijst te zien.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero stat header ── */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-card">
        <div className="h-1 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700" />
        <div className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-display font-black text-lg tracking-wide uppercase">Palmares</span>
            <span className="ml-1 text-xs text-muted-foreground font-serif italic">Erelijst</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-amber-950/20 border border-amber-500/20">
              <p className="font-display text-2xl font-black text-amber-400">{totalDagzeges}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Dagzeges</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/40 border border-border">
              <p className="font-display text-2xl font-black">{totalPodiums}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Podia</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/40 border border-border">
              <p className="font-display text-2xl font-black text-primary">
                {bestPoolRank ? `#${bestPoolRank}` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Beste stand</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/40 border border-border">
              <p className="font-display text-2xl font-black text-emerald-400">{subWins}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Subpoule­wins</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Poule klassement ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Mountain className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm uppercase tracking-widest text-foreground/60">
            Poule Klassement
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {games.length} koers{games.length === 1 ? "" : "en"}
          </span>
        </div>
        {games.map((g) => (
          <GameSection key={g.game_id} g={g} />
        ))}
      </div>

      {/* ── Subpoules ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm uppercase tracking-widest text-foreground/60">
            Subpoules
          </span>
          {subpoules.length > 0 && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              {subpoules.length} subpoule{subpoules.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {subpoules.length > 0 ? (
          subpoules.map((s) => <SubpouleSection key={s.subpoule_id} s={s} />)
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/25 mb-2" />
            <p className="text-xs text-muted-foreground italic font-serif">
              Word lid van een subpoule om hier je ranking te zien.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
