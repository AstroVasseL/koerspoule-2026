import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Mic, Newspaper, TrendingUp, TrendingDown, Trophy, HeartCrack, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useSubpoules } from "@/hooks/useSubpoules";
import { useKaravaanFeed, markKaravaanVisited, findNewMarkerIndex, type KaravaanEtappe, type KaravaanRanking, type PersonalFlash } from "@/hooks/useKaravaanFeed";
import MiniStrip from "@/components/karavaan/MiniStrip";
import JerseyBadge from "@/components/retro/JerseyBadge";
import Stamp from "@/components/retro/Stamp";
import { cn } from "@/lib/utils";

const LAST_SUBPOULE_KEY = "karavaan:lastSubpouleId";

export default function KaravaanFeed({ onGoToPloeg }: { onGoToPloeg?: () => void }) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const subpoulesQuery = useSubpoules(game?.id);
  const subpoules = subpoulesQuery.subpoules;

  const [selectedSubpouleId, setSelectedSubpouleId] = useState<string | null>(null);

  // Default: laatst-bekeken subpoule uit localStorage, anders eerste alfabetisch
  useEffect(() => {
    if (selectedSubpouleId || subpoules.length === 0) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(LAST_SUBPOULE_KEY) : null;
    const match = stored && subpoules.find((s) => s.id === stored);
    if (match) {
      setSelectedSubpouleId(match.id);
    } else {
      const sorted = [...subpoules].sort((a, b) => a.name.localeCompare(b.name));
      setSelectedSubpouleId(sorted[0].id);
    }
  }, [subpoules, selectedSubpouleId]);

  useEffect(() => {
    if (selectedSubpouleId && typeof window !== "undefined") {
      localStorage.setItem(LAST_SUBPOULE_KEY, selectedSubpouleId);
    }
  }, [selectedSubpouleId]);

  const feed = useKaravaanFeed({
    gameId: game?.id,
    subpouleId: selectedSubpouleId ?? undefined,
    userId: user?.id,
  });

  // Markeer bezoek 1.5s na mount, zodat de "nieuw"-marker zichtbaar blijft
  useEffect(() => {
    if (!user?.id) return;
    const t = setTimeout(() => {
      void markKaravaanVisited();
    }, 1500);
    return () => clearTimeout(t);
  }, [user?.id]);

  const newMarkerIndex = useMemo(
    () => findNewMarkerIndex(feed.data?.etappes ?? [], feed.data?.lastVisited ?? null),
    [feed.data?.etappes, feed.data?.lastVisited],
  );

  // Empty: geen subpoules
  if (subpoules.length === 0 && !subpoulesQuery.isLoading) {
    return (
      <div className="rounded-xl border-2 border-dashed border-foreground/20 bg-card p-6 text-center space-y-3">
        <Newspaper className="h-10 w-10 text-muted-foreground/50 mx-auto" />
        <p className="font-display font-bold text-lg">Je zit nog niet in een subpoule</p>
        <p className="text-sm text-muted-foreground font-serif italic max-w-md mx-auto">
          De Karavaan rijdt mee met je subpoules. Maak er een aan of word lid via de Subpoules-tab.
        </p>
      </div>
    );
  }

  const etappes = feed.data?.etappes ?? [];
  const ministrip = feed.data?.ministrip;

  return (
    <div className="space-y-4">
      {/* Subpoule-switcher */}
      <SubpouleSwitcher
        subpoules={subpoules.map((s) => ({ id: s.id, name: s.name }))}
        selectedId={selectedSubpouleId}
        onSelect={setSelectedSubpouleId}
      />

      {/* Mini-strip */}
      {ministrip && <MiniStrip data={ministrip} onClickProfile={onGoToPloeg} />}

      {/* Feed */}
      {feed.isLoading ? (
        <FeedSkeleton />
      ) : etappes.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="space-y-4">
          {etappes.map((et, i) => (
            <div key={et.stage_id}>
              {newMarkerIndex === i && <NieuwMarker />}
              <EtappeBlok etappe={et} defaultOpen={i < 2} />
            </div>
          ))}
          {newMarkerIndex === etappes.length && <NieuwMarker />}
        </div>
      )}
    </div>
  );
}

// ─── Subpoule switcher (pill row + native select voor mobiel) ───────────────

function SubpouleSwitcher({
  subpoules,
  selectedId,
  onSelect,
}: {
  subpoules: Array<{ id: string; name: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (subpoules.length === 0) return null;
  if (subpoules.length === 1) {
    return (
      <div className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-muted-foreground">
        <span>Subpoule:</span>
        <span className="font-bold text-foreground">{subpoules[0].name}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="overline-stamp">Subpoule</span>
      <div className="flex gap-1 rounded-xl border-2 border-foreground/15 bg-secondary/30 p-1 flex-wrap">
        {subpoules.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn(
              "rounded-lg px-3 min-h-[36px] text-xs font-semibold uppercase tracking-wider transition-colors",
              selectedId === s.id
                ? "bg-card text-foreground shadow-sm border border-foreground/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Etappe-blok ────────────────────────────────────────────────────────────

function EtappeBlok({ etappe, defaultOpen }: { etappe: KaravaanEtappe; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const datum = new Date(etappe.approved_at).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="retro-border bg-card overflow-hidden">
      {/* Etappe header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 md:px-4 py-3 flex items-center gap-3 bg-secondary/40 border-b border-border hover:bg-secondary/60 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0 text-left">
          <span className="font-display font-bold text-sm md:text-base uppercase tracking-wider">
            Etappe {etappe.stage_number}
          </span>
          {etappe.stage_name && (
            <span className="font-serif italic text-sm text-muted-foreground ml-2">
              · {etappe.stage_name}
            </span>
          )}
        </div>
        <Stamp tone="ink" rotation={-2} className="hidden md:inline-block">{datum}</Stamp>
        <span className="font-stamp text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:hidden">
          {datum}
        </span>
      </button>

      {open && (
        <div className="p-3 md:p-4 space-y-3">
          {/* Michel + José */}
          {(etappe.michel_tekst || etappe.jose_tekst) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {etappe.michel_tekst && (
                <CommentaarKaart speaker="Michel Wuyts" text={etappe.michel_tekst} accent="primary" />
              )}
              {etappe.jose_tekst && (
                <CommentaarKaart speaker="José De Cauwer" text={etappe.jose_tekst} accent="gold" />
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-serif italic">
              Geen commentaar beschikbaar voor deze etappe.
            </p>
          )}

          {/* Klassement-update */}
          <KlassementUpdateKaart etappe={etappe} />

          {/* Persoonlijke flash */}
          {etappe.personalFlash && <PersoonlijkeFlash flash={etappe.personalFlash} />}
        </div>
      )}
    </div>
  );
}

// ─── Commentaar-kaart (Michel of José) ──────────────────────────────────────

function CommentaarKaart({
  speaker,
  text,
  accent,
}: {
  speaker: string;
  text: string;
  accent: "primary" | "gold";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-2.5 md:p-3",
        accent === "primary" ? "border-primary/30" : "border-[hsl(var(--vintage-gold))/0.6]",
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Mic
          className={cn(
            "h-3 w-3 shrink-0",
            accent === "primary" ? "text-primary" : "text-[hsl(var(--vintage-gold))]",
          )}
        />
        <span
          className={cn(
            "font-display text-[10px] uppercase tracking-[0.2em] font-bold",
            accent === "primary" ? "text-primary" : "text-[hsl(var(--vintage-gold))]",
          )}
        >
          {speaker}
        </span>
      </div>
      <p className="font-serif italic text-sm leading-snug text-foreground/90">{text}</p>
    </div>
  );
}

// ─── Klassement-update met Subpoule/Overall toggle ──────────────────────────

function KlassementUpdateKaart({ etappe }: { etappe: KaravaanEtappe }) {
  const [view, setView] = useState<"subpoule" | "overall">("subpoule");
  const rows = view === "subpoule" ? etappe.subpouleStandings : etappe.overallStandings;
  const top5 = rows.slice(0, 5);
  const myRow = rows.find((r) => r.is_me);
  const showMyRow = myRow && myRow.rank > 5;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-secondary/40 border-b border-border">
        <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
          Klassement
        </span>
        <div className="flex gap-1 rounded-md border border-foreground/10 bg-background/50 p-0.5">
          <ToggleButton active={view === "subpoule"} onClick={() => setView("subpoule")}>Subpoule</ToggleButton>
          <ToggleButton active={view === "overall"} onClick={() => setView("overall")}>Overall</ToggleButton>
        </div>
      </div>
      <ol className="divide-y divide-border">
        {top5.map((r) => <KlassementRow key={r.entry_id} row={r} />)}
        {showMyRow && (
          <>
            <li className="px-3 py-1 text-center text-[10px] tracking-widest text-muted-foreground">…</li>
            <KlassementRow row={myRow!} highlightSelf />
          </>
        )}
      </ol>
    </div>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 text-[10px] font-display uppercase tracking-widest rounded transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function KlassementRow({ row, highlightSelf }: { row: KaravaanRanking; highlightSelf?: boolean }) {
  const showLeaderJersey = row.rank === 1;
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm",
        row.is_me && "bg-primary/10",
        showLeaderJersey && "border-l-[3px] border-[hsl(var(--maillot-jaune))]",
      )}
    >
      <span className="font-oswald font-bold tabular-nums w-6 text-right shrink-0">
        {row.rank}
      </span>
      {showLeaderJersey && <JerseyBadge color="yellow" size={12} title="Leider" />}
      <span className={cn("flex-1 truncate font-sans", row.is_me ? "font-display font-bold text-primary" : "font-medium")}>
        {row.team_name}
        {row.is_me && <span className="ml-2 text-[9px] uppercase tracking-widest text-primary">jij</span>}
      </span>
      <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0 w-10 text-right">
        {row.delta_rank === 0 ? "─" : row.delta_rank > 0 ? `▲${row.delta_rank}` : `▼${Math.abs(row.delta_rank)}`}
      </span>
      <span className="font-display font-bold tabular-nums shrink-0">{row.points}</span>
    </li>
  );
}

// ─── Persoonlijke flash ─────────────────────────────────────────────────────

function PersoonlijkeFlash({ flash }: { flash: PersonalFlash }) {
  const meta = flashMeta(flash);
  return (
    <div className={cn("rounded-md border-2 px-3 py-2 flex items-center gap-2", meta.border, meta.bg)}>
      <meta.Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
      <p className={cn("font-display text-sm font-bold uppercase tracking-wider", meta.color)}>{meta.text}</p>
    </div>
  );
}

function flashMeta(flash: PersonalFlash) {
  switch (flash.kind) {
    case "leider":
      return {
        Icon: Trophy,
        color: "text-[hsl(var(--maillot-jaune-dark))]",
        border: "border-[hsl(var(--maillot-jaune))/0.7]",
        bg: "bg-[hsl(var(--maillot-jaune))/0.12]",
        text: "Je bent klassementsleider!",
      };
    case "podium":
      return {
        Icon: Trophy,
        color: "text-[hsl(var(--maillot-jaune-dark))]",
        border: "border-[hsl(var(--maillot-jaune))/0.7]",
        bg: "bg-[hsl(var(--maillot-jaune))/0.10]",
        text: `Je beklimt het podium — nu ${flash.rank}ᵉ`,
      };
    case "off-podium":
      return {
        Icon: HeartCrack,
        color: "text-[hsl(var(--bolletjes-bright))]",
        border: "border-[hsl(var(--bolletjes-bright))/0.5]",
        bg: "bg-[hsl(var(--bolletjes-bright))/0.06]",
        text: `Van het podium af — nu ${flash.rank}ᵉ`,
      };
    case "stijging":
      return {
        Icon: TrendingUp,
        color: "text-[hsl(var(--maillot-groen))]",
        border: "border-[hsl(var(--maillot-groen))/0.4]",
        bg: "bg-[hsl(var(--maillot-groen))/0.08]",
        text: `Gestegen naar plek ${flash.rank} (▲${flash.delta})`,
      };
    case "daling":
      return {
        Icon: TrendingDown,
        color: "text-[hsl(var(--bolletjes-bright))]",
        border: "border-[hsl(var(--bolletjes-bright))/0.4]",
        bg: "bg-[hsl(var(--bolletjes-bright))/0.06]",
        text: `Gezakt naar plek ${flash.rank} (▼${Math.abs(flash.delta)})`,
      };
    default:
      return {
        Icon: Sparkles,
        color: "text-muted-foreground",
        border: "border-foreground/15",
        bg: "bg-muted/30",
        text: "Beweging in het klassement",
      };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function NieuwMarker() {
  return (
    <div className="vintage-ornament my-3">
      <span className="overline-stamp text-[hsl(var(--bolletjes-bright))]">
        ★ Nieuw sinds je laatste bezoek ★
      </span>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="rounded-xl border-2 border-dashed border-foreground/20 bg-card p-6 text-center space-y-3">
      <Newspaper className="h-10 w-10 text-muted-foreground/50 mx-auto" />
      <p className="font-display font-bold text-lg">De Karavaan is nog onderweg…</p>
      <p className="text-sm text-muted-foreground font-serif italic max-w-md mx-auto">
        De eerste etappe-updates verschijnen hier zodra de jury de uitslagen heeft gefiatteerd.
      </p>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="retro-border bg-card p-3 md:p-4 space-y-3 animate-pulse">
          <div className="h-4 w-2/5 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
          <div className="h-24 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
