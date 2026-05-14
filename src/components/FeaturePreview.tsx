import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mountain, Bike } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DemoEvolutionChart from "@/components/DemoEvolutionChart";
import DemoSubpouleHeatmap from "@/components/DemoSubpouleHeatmap";
import { cn, smoothScrollToTop } from "@/lib/utils";

type PreviewRider = { number: number; name: string; team: string };

const KLASSEMENT_1_RIDERS: PreviewRider[] = [
  { number: 91,  name: "Egan Bernal",            team: "Netcompany INEOS" },
  { number: 92,  name: "Thymen Arensman",         team: "Netcompany INEOS" },
  { number: 125, name: "Giulio Pellizzari",        team: "Red Bull - BORA - hansgrohe" },
  { number: 191, name: "Adam Yates",               team: "UAE Team Emirates - XRG" },
];

const SPRINTERS_1_RIDERS: PreviewRider[] = [
  { number: 32,  name: "Tobias Lund Andresen",    team: "Decathlon CMA CGM Team" },
  { number: 65,  name: "Jonathan Milan",           team: "Lidl - Trek" },
  { number: 201, name: "Dylan Groenewegen",        team: "Unibet Rose Rockets" },
];

export default function FeaturePreview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  const ctaPrimary = isLoggedIn ? "/team-samenstellen" : "/login";

  const handleResultsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/uitslagen");
    smoothScrollToTop();
  };

  return (
    <section className="container mx-auto px-5 py-8 md:py-12">
      {/* Heading */}
      <div className="max-w-3xl mx-auto text-center mb-7">
        <div className="vintage-ornament max-w-xs mx-auto mb-4">
          <span className="vintage-ornament-symbol">✦</span>
          <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
            Wat krijg je?
          </span>
          <span className="vintage-ornament-symbol">✦</span>
        </div>
        <h2 className="vintage-heading text-2xl md:text-3xl font-bold mb-2">
          Wielerdata zoals in de ploegleiderswagen
        </h2>
        <p className="text-muted-foreground font-serif italic">
          Subpoule-verloop, race-intensiteit en categorieën — een sport-dashboard voor jouw Giro 2026.
        </p>
      </div>

      {/* Top row: subpoule chart + subpoule heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <DemoEvolutionChart />
        <DemoSubpouleHeatmap />
      </div>

      {/* Two category blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <RiderBlock
          title="Klassement 1"
          subtitle="Hoofdrolspelers voor het algemeen klassement"
          icon={<Mountain className="h-5 w-5 text-primary" />}
          riders={KLASSEMENT_1_RIDERS}
        />
        <RiderBlock
          title="Sprinters 1"
          subtitle="Etappekanonnen, baroudeurs en chronospecialisten"
          icon={<Bike className="h-5 w-5 text-primary" />}
          riders={SPRINTERS_1_RIDERS}
        />
      </div>

      {/* CTA row */}
      <div className="ornate-frame retro-border bg-gradient-to-r from-card via-secondary/40 to-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
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

function RiderBlock({
  title,
  subtitle,
  icon,
  riders,
}: {
  title: string;
  subtitle: string;
  icon: JSX.Element;
  riders: PreviewRider[];
}) {
  if (riders.length === 0) return null;
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
        {riders.map((r) => (
          <div
            key={r.number}
            className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-secondary/30 hover:bg-secondary hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0">
                {r.number}
              </span>
              <span className="font-medium font-sans text-sm truncate">
                {r.name}
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 truncate max-w-[45%] text-right">
              {r.team}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

