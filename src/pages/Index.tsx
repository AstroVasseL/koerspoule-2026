import { Link, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Bike, BookOpen } from "lucide-react";
import koerspouleLogo from "@/assets/koerspoule-logo-2026.png";
import CountdownBanner from "@/components/CountdownBanner";
import { smoothScrollTo, smoothScrollToTop } from "@/lib/utils";

const FeaturePreview = lazy(() => import("@/components/FeaturePreview"));
const HorsCategoriePreview = lazy(() => import("@/components/HorsCategoriePreview"));

const features = [
  {
    icon: Bike,
    title: "Stel je ploeg samen",
    desc: "Kies uit 21 categorieën jouw droomrenners en voeg 2 jokers toe.",
  },
  {
    icon: Users,
    title: "Daag je vrienden uit",
    desc: "Maak een subpoule aan en strijd tegen je vrienden om de eer.",
  },
  {
    icon: Trophy,
    title: "Scoor punten",
    desc: "Verdien punten per etappe en met klassementsvoorspellingen.",
  },
  {
    icon: BookOpen,
    title: "Helder reglement",
    desc: "De jury heeft altijd gelijk. Zo niet, dan toch.",
  },
];

export default function Index() {
  const navigate = useNavigate();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-border-bottom">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg, transparent, transparent 40px, hsl(var(--foreground)) 40px, hsl(var(--foreground)) 41px
            ), repeating-linear-gradient(
              90deg, transparent, transparent 40px, hsl(var(--foreground)) 40px, hsl(var(--foreground)) 41px
            )`,
          }}
        />
        <div className="container mx-auto px-5 relative">
          <div className="max-w-3xl mx-auto text-center">
            <img
              src={koerspouleLogo}
              alt="Koerspoule logo"
              width={1280}
              height={1024}
              fetchPriority="high"
              decoding="async"
              className="mx-auto w-80 md:w-[32rem] mb-2 animate-fade-in drop-shadow-2xl"
            />
            <p className="font-serif italic text-foreground/75 mb-0 animate-fade-in text-2xl">
              Giro d'Italia 2026
            </p>

            {/* Ornamental divider */}
            <div className="vintage-ornament max-w-xs mx-auto my-4 animate-fade-in">
              <span className="vintage-ornament-symbol">❧</span>
            </div>

            <p
              className="text-base md:text-lg text-muted-foreground font-serif max-w-xl mx-auto mb-6 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              Stel je eigen wielerploeg samen voor de Giro, voorspel het podium en strijd
              tegen je vrienden om de Maglia Rosa.
            </p>
            <div
              className="flex flex-col sm:flex-row gap-2.5 justify-center animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <Button
                size="default"
                className="retro-border-primary font-bold"
                onClick={() => smoothScrollTo("stel-je-ploeg-samen")}
              >
                🚴 Stel je ploeg samen
              </Button>
              <Button
                variant="outline"
                size="default"
                className="retro-border"
                onClick={() => {
                  navigate("/uitslagen");
                  smoothScrollToTop();
                }}
              >
                Bekijk uitslagen
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="stel-je-ploeg-samen"
        className="container mx-auto px-5 py-10 md:py-14 vintage-texture scroll-mt-16"
      >
        <h2 className="vintage-heading text-2xl md:text-3xl font-bold text-center mb-3">
          Hoe werkt het?
        </h2>
        <div className="vintage-ornament max-w-xs mx-auto mb-8">
          <span className="vintage-ornament-symbol">✦</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="ornate-frame retro-border bg-card p-4 animate-fade-in"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center mb-3">
                <f.icon className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-base font-bold mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring preview */}
      <section className="gradient-border-top bg-card">
        <div className="container mx-auto px-5 py-10 md:py-14">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="vintage-heading text-2xl md:text-3xl font-bold mb-3">
              Punten per etappe
            </h2>
            <div className="vintage-ornament max-w-xs mx-auto mb-6">
              <span className="vintage-ornament-symbol">⚜</span>
            </div>
            <div className="ornate-frame retro-border bg-background p-5 inline-block">
              <div className="grid grid-cols-5 gap-x-5 gap-y-1.5 text-sm font-sans">
                {[
                  [1, 50], [2, 40], [3, 32], [4, 26], [5, 22],
                  [6, 20], [7, 18], [8, 16], [9, 14], [10, 12],
                ].map(([pos, pts]) => (
                  <div key={pos} className="flex items-center gap-1.5">
                    <span className="font-bold text-muted-foreground w-5 text-right text-xs">
                      {pos}.
                    </span>
                    <span className="font-bold text-primary text-sm">{pts}pt</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-sans">
              Top 20 levert punten op · Positie 11–20: 10 tot 1 punt
            </p>
          </div>
        </div>
      </section>

      {/* CTA + Countdown */}
      <section className="container mx-auto px-5 py-10 text-center">
        <div className="vintage-ornament max-w-xs mx-auto mb-5">
          <span className="vintage-ornament-symbol">❧</span>
        </div>
        <h2 className="vintage-heading text-2xl font-bold mb-3">Klaar om te koersen?</h2>
        <CountdownBanner className="max-w-md mx-auto mb-5" />
        <Button asChild className="retro-border-primary font-bold">
          <Link to="/team-samenstellen">Schrijf je in →</Link>
        </Button>
      </section>

      {/* Feature Preview */}
      <Suspense
        fallback={
          <div className="container mx-auto px-5 py-10 text-center text-muted-foreground font-serif italic text-sm">
            Voorbeelden laden...
          </div>
        }
      >
        <FeaturePreview />
      </Suspense>

      {/* Hors Catégorie compact preview */}
      <Suspense fallback={null}>
        <HorsCategoriePreview />
      </Suspense>
    </div>
  );
}
