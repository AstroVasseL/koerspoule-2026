import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Mic, Newspaper, TrendingUp, TrendingDown, Trophy, HeartCrack, Sparkles, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useSubpoules } from "@/hooks/useSubpoules";
import { useKaravaanFeed, markKaravaanVisited, findNewMarkerIndex, type KaravaanEtappe, type PersonalFlash } from "@/hooks/useKaravaanFeed";
import MiniStrip, { type HorsTabKey } from "@/components/karavaan/MiniStrip";
import { useHorsCategorieSummary } from "@/hooks/useHorsCategorieSummary";
import Stamp from "@/components/retro/Stamp";
import { cn } from "@/lib/utils";

const LAST_SUBPOULE_KEY = "karavaan:lastSubpouleId";

export default function KaravaanFeed({
  onGoToPloeg,
  onOpenHors,
}: {
  onGoToPloeg?: () => void;
  onOpenHors?: (tab: HorsTabKey) => void;
}) {
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
          De Gazetta rolt mee met je subpoules. Maak er een aan of word lid via de Subpoules-tab.
        </p>
      </div>
    );
  }

  const etappes = feed.data?.etappes ?? [];
  const ministrip = feed.data?.ministrip;
  const horsSummary = useHorsCategorieSummary();

  return (
    <div className="space-y-4">
      {/* Subpoule-switcher */}
      <SubpouleSwitcher
        subpoules={subpoules.map((s) => ({ id: s.id, name: s.name }))}
        selectedId={selectedSubpouleId}
        onSelect={setSelectedSubpouleId}
      />

      {/* Score-strip */}
      {ministrip && (
        <MiniStrip
          data={ministrip}
          hors={{
            monkeyBeatPct: horsSummary.monkeyBeatPct,
            emiratesPct: horsSummary.emiratesPct,
            directorScore: horsSummary.directorScore,
          }}
          onClickProfile={onGoToPloeg}
          onOpenHors={onOpenHors}
        />
      )}

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
              <EtappeBlok etappe={et} defaultOpen={i < 2} showLefevere={i === 0} onOpenHors={onOpenHors} />
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

function EtappeBlok({
  etappe,
  defaultOpen,
  showLefevere,
  onOpenHors,
}: {
  etappe: KaravaanEtappe;
  defaultOpen: boolean;
  showLefevere?: boolean;
  onOpenHors?: (tab: HorsTabKey) => void;
}) {
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

          {/* Lefevere teaser — alleen nieuwste etappe */}
          {showLefevere && (
            <button
              type="button"
              onClick={() => onOpenHors?.("wielerdirecteur")}
              className="w-full text-left rounded-lg border border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.06] p-2.5 md:p-3 flex items-center gap-3 hover:bg-[hsl(var(--vintage-gold))/0.12] transition-colors"
            >
              <ClipboardList className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--vintage-gold))] font-bold">
                  Patrick Lefevere
                </div>
                <p className="font-serif italic text-sm text-foreground/85 leading-snug">
                  Je directeursrapport staat klaar — lees wat de baas ervan vindt.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          )}

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
      <p className="font-display font-bold text-lg">De Gazetta gaat zo de pers in…</p>
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
