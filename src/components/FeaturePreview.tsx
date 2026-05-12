import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { ArrowRight, Layers, Lock, Mountain, Bike, Users } from "lucide-react";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { useSubpoules } from "@/hooks/useSubpoules";
import SubpouleEvolutionChart from "@/components/SubpouleEvolutionChart";
import GiroHeatmap from "@/components/GiroHeatmap";
import { cn, smoothScrollToTop } from "@/lib/utils";

// Categorie-blokken: Klassement vs Sprint & aanval.
// Heuristisch op basis van categorie-naam (zonder DB-wijziging).
function classifyCategory(name: string): "klassement" | "sprint" {
  const n = name.toLowerCase();
  if (
    n.includes("sprint") ||
    n.includes("aanval") ||
    n.includes("baroudeur") ||
    n.includes("vlucht") ||
    n.includes("tijdr") ||
    n.includes("chrono")
  ) {
    return "sprint";
  }
  return "klassement";
}

export default function FeaturePreview() {
  const navigate = useNavigate();
  const { data: game } = useCurrentGame();
  const { data: categories = [] } = useCategories(game?.id);
  const { user } = useAuth();
  const { subpoules } = useSubpoules(game?.id);
  const isLoggedIn = Boolean(user);

  const firstSubpouleId = subpoules[0]?.id;

  const previewCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    return [
      { id: "1", name: "Algemeen klassement", short_name: "GC favorieten", max_picks: 1 },
      { id: "2", name: "Klimmers", short_name: "Bergkoning", max_picks: 1 },
      { id: "3", name: "Belofte", short_name: "Baby Giro", max_picks: 1 },
      { id: "4", name: "Sprinters", short_name: "Massasprint", max_picks: 1 },
      { id: "5", name: "Aanvallers", short_name: "Baroudeurs", max_picks: 1 },
      { id: "6", name: "Tijdrijders", short_name: "Chrono", max_picks: 1 },
    ] as Array<{ id: string; name: string; short_name: string | null; max_picks: number }>;
  }, [categories]);

  const klassementCats = previewCategories.filter((c) => classifyCategory(c.name) === "klassement").slice(0, 3);
  const sprintCats = previewCategories.filter((c) => classifyCategory(c.name) === "sprint").slice(0, 3);

  const ctaPrimary = isLoggedIn ? "/team-samenstellen" : "/login";

  const handleResultsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/uitslagen");
    smoothScrollToTop();
  };

  return (
    <section className="container mx-auto px-4 py-16 md:py-20">
      {/* Heading */}
      <div className="max-w-3xl mx-auto text-center mb-10">
        <div className="vintage-ornament max-w-xs mx-auto mb-4">
          <span className="vintage-ornament-symbol">✦</span>
          <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
            Wat krijg je?
          </span>
          <span className="vintage-ornament-symbol">✦</span>
        </div>
        <h2 className="vintage-heading text-3xl md:text-4xl font-bold mb-3">
          Wielerdata zoals in de ploegleiderswagen
        </h2>
        <p className="text-muted-foreground font-serif italic">
          Subpoule-verloop, race-intensiteit en categorieën — een sport-dashboard voor jouw Giro 2026.
        </p>
      </div>

      {/* Top row: subpoule chart + Giro heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {firstSubpouleId ? (
          <SubpouleEvolutionChart
            subpouleId={firstSubpouleId}
            compact
            title="Jouw subpoule"
            subtitle="Etappe-evolutie · live preview"
          />
        ) : (
          <DemoEvolutionChart isLoggedIn={isLoggedIn} />
        )}

        <GiroHeatmap compact />
      </div>

      {/* Two category blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <CategoryBlock
          title="Klassement"
          subtitle="Hoofdrolspelers voor het algemeen klassement"
          icon={<Mountain className="h-5 w-5 text-primary" />}
          categories={klassementCats}
        />
        <CategoryBlock
          title="Sprint &amp; aanval"
          subtitle="Etappekanonnen, baroudeurs en chronospecialisten"
          icon={<Bike className="h-5 w-5 text-primary" />}
          categories={sprintCats}
        />
      </div>

      {/* CTA row */}
      <div className="ornate-frame retro-border bg-gradient-to-r from-card via-secondary/40 to-card p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <p className="font-display font-bold text-lg mb-1">
            {isLoggedIn ? "Klaar voor de volgende etappe?" : "Verken vrij — speel mee met een account"}
          </p>
          <p className="text-sm text-muted-foreground font-serif italic">
            {isLoggedIn
              ? "Stel je ploeg samen of bekijk de uitslagen."
              : "Categorieën, regels en uitslagen zijn openbaar. Inzenden vraagt een gratis account."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <a
            href="/uitslagen"
            onClick={handleResultsClick}
            className="px-4 py-2 text-sm font-medium border-2 border-foreground rounded-md hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
          >
            Bekijk uitslagen
          </a>
          <Link
            to="/regels"
            className="px-4 py-2 text-sm font-medium border-2 border-foreground rounded-md hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
          >
            Bekijk reglement
          </Link>
          <Link
            to={ctaPrimary}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-md inline-flex items-center gap-1.5 transition-colors",
              "bg-primary text-primary-foreground border-2 border-foreground hover:bg-primary/90"
            )}
          >
            {isLoggedIn ? (
              <>Stel je ploeg samen <ArrowRight className="h-4 w-4" /></>
            ) : (
              <><Lock className="h-3.5 w-3.5" /> Maak account &amp; doe mee</>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------- Sub-components ----------

function CategoryBlock({
  title,
  subtitle,
  icon,
  categories,
}: {
  title: string;
  subtitle: string;
  icon: JSX.Element;
  categories: Array<{ id: string; name: string; short_name: string | null; max_picks: number }>;
}) {
  if (categories.length === 0) return null;
  return (
    <article className="ornate-frame retro-border bg-card p-5 group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary opacity-70" />
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Giro 2026 · categorie
        </span>
      </div>
      <h3 className="font-display text-lg font-bold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground font-serif italic mb-3">{subtitle}</p>
      <div className="space-y-1.5">
        {categories.map((c, i) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-secondary/30 hover:bg-secondary hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-medium font-sans text-sm truncate">
                {c.short_name ?? c.name}
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {c.max_picks}× pick
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function DemoEvolutionChart({ isLoggedIn }: { isLoggedIn: boolean }) {
  // Lichte demo-versie zodat publiekelijke bezoekers ook iets zien.
  // Visueel consistent met SubpouleEvolutionChart maar zonder data.
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-60 w-60 rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
          <Users className="h-3 w-3" />
          Subpoule preview
        </div>
        <h3 className="mt-1 font-display text-base sm:text-lg text-white">Etappe-evolutie</h3>
        <p className="text-[11px] text-white/50 mt-0.5">
          Zodra je in een subpoule zit, zie je hier de live ranking per etappe.
        </p>

        {/* Decorative SVG line preview */}
        <svg
          viewBox="0 0 320 140"
          className="mt-4 w-full h-44"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="demo-grid" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
          </defs>
          {[0, 35, 70, 105, 140].map((y) => (
            <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="url(#demo-grid)" strokeWidth="1" />
          ))}
          {[
            { c: "#E6194B", d: "M0,120 L40,108 L80,90 L120,75 L160,60 L200,45 L240,35 L280,22 L320,10" },
            { c: "#3CB44B", d: "M0,128 L40,118 L80,102 L120,90 L160,78 L200,68 L240,55 L280,42 L320,32" },
            { c: "#4363D8", d: "M0,132 L40,124 L80,118 L120,108 L160,98 L200,86 L240,72 L280,60 L320,48" },
            { c: "#F58231", d: "M0,135 L40,128 L80,124 L120,118 L160,110 L200,100 L240,92 L280,80 L320,68" },
          ].map((l, i) => (
            <path
              key={i}
              d={l.d}
              fill="none"
              stroke={l.c}
              strokeWidth={i === 0 ? 2.5 : 1.5}
              strokeOpacity={i === 0 ? 1 : 0.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        <div className="mt-3 flex items-center justify-between text-[10px] text-white/40">
          <span>E1</span>
          <span>E11</span>
          <span>E21</span>
        </div>

        <p className="text-[11px] text-white/50 mt-3 italic">
          {isLoggedIn
            ? "Maak of join een subpoule om je echte verloop te zien."
            : "Login en sluit je aan bij een subpoule voor live data."}
        </p>
      </div>
    </div>
  );
}
