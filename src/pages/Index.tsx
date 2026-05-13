import { Link, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Bike, BookOpen } from "lucide-react";
import koerspouleLogo from "@/assets/koerspoule-logo.png";
import CountdownBanner from "@/components/CountdownBanner";
import { smoothScrollTo, smoothScrollToTop } from "@/lib/utils";

const FeaturePreview = lazy(() => import("@/components/FeaturePreview"));
const HorsCategoriePreview = lazy(() => import("@/components/HorsCategoriePreview"));

const features = [
{
  icon: Bike,
  title: "Stel je ploeg samen",
  desc: "Kies uit 21 categorieën jouw droomrenners en voeg 2 jokers toe."
},
{
  icon: Users,
  title: "Daag je vrienden uit",
  desc: "Maak een subpoule aan en strijd tegen je vrienden om de eer."
},
{
  icon: Trophy,
  title: "Scoor punten",
  desc: "Verdien punten per etappe en met klassementsvoorspellingen."
},
{
  icon: BookOpen,
  title: "Helder reglement",
  desc: "De jury heeft altijd gelijk. Zo niet, dan toch."
}];


export default function Index() {
  const navigate = useNavigate();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-border-bottom">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
            0deg, transparent, transparent 40px, hsl(var(--foreground)) 40px, hsl(var(--foreground)) 41px
          ), repeating-linear-gradient(
            90deg, transparent, transparent 40px, hsl(var(--foreground)) 40px, hsl(var(--foreground)) 41px
          )`
          }} />
        
        <div className="container mx-auto px-4 py-0 md:py-0 relative">
          <div className="max-w-3xl mx-auto text-center">
            <img
              src={koerspouleLogo}
              alt="Koerspoule logo"
              width={576}
              height={576}
              fetchPriority="high"
              decoding="async"
              className="mx-auto w-96 md:w-[36rem] -mb-28 animate-fade-in drop-shadow-lg" />
            
            <p className="font-serif italic text-foreground/80 mb-0 animate-fade-in text-3xl">Giro d'Italia 2026</p>

            {/* Ornamental divider */}
            <div className="vintage-ornament max-w-sm mx-auto my-6 animate-fade-in">
              <span className="vintage-ornament-symbol">❧</span>
            </div>

            <p
              className="text-lg md:text-xl text-muted-foreground font-serif max-w-xl mx-auto mb-8 animate-fade-in"
              style={{ animationDelay: "0.2s" }}>
              Stel je eigen wielerploeg samen voor de Giro, voorspel het podium en strijd tegen je vrienden om de Maglia
              Rosa.
            </p>
            <div
              className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in"
              style={{ animationDelay: "0.3s" }}>
              <Button
                size="lg"
                className="retro-border-primary text-base font-bold"
                onClick={() => smoothScrollTo("stel-je-ploeg-samen")}
              >
                🚴 Stel je ploeg samen
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="retro-border text-base"
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

      {/* Feature Preview (subpoule chart, Monte Carlo, categorieën) */}
      <Suspense fallback={<div className="container mx-auto px-4 py-16 text-center text-muted-foreground font-serif italic">Voorbeelden laden...</div>}>
        <FeaturePreview />
      </Suspense>

      {/* Hors Catégorie compact preview (alleen bij live koers) */}
      <Suspense fallback={null}>
        <HorsCategoriePreview />
      </Suspense>

      {/* Features */}
      <section
        id="stel-je-ploeg-samen"
        className="container mx-auto px-4 py-16 md:py-24 vintage-texture scroll-mt-20"
      >
        <h2 className="vintage-heading text-3xl md:text-4xl font-bold text-center mb-4">Hoe werkt het?</h2>
        <div className="vintage-ornament max-w-xs mx-auto mb-12">
          <span className="vintage-ornament-symbol">✦</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) =>
          <div
            key={f.title}
            className="ornate-frame retro-border bg-card p-6 animate-fade-in"
            style={{ animationDelay: `${0.1 * i}s` }}>
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground font-sans">{f.desc}</p>
            </div>
          )}
        </div>
      </section>

      {/* Scoring preview */}
      <section className="gradient-border-top bg-card">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="vintage-heading text-3xl md:text-4xl font-bold mb-4">Punten per etappe</h2>
            <div className="vintage-ornament max-w-xs mx-auto mb-8">
              <span className="vintage-ornament-symbol">⚜</span>
            </div>
            <div className="ornate-frame retro-border bg-background p-6 inline-block">
              <div className="grid grid-cols-5 gap-x-6 gap-y-2 text-sm font-sans">
                {[
                [1, 50],
                [2, 40],
                [3, 32],
                [4, 26],
                [5, 22],
                [6, 20],
                [7, 18],
                [8, 16],
                [9, 14],
                [10, 12]].
                map(([pos, pts]) =>
                <div key={pos} className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground w-6 text-right">{pos}.</span>
                    <span className="font-bold text-primary">{pts}pt</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 font-sans">
              Top 20 levert punten op • Positie 11–20: 10 tot 1 punt
            </p>
          </div>
        </div>
      </section>

      {/* CTA + Countdown */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="vintage-ornament max-w-xs mx-auto mb-6">
          <span className="vintage-ornament-symbol">❧</span>
        </div>
        <h2 className="vintage-heading text-3xl font-bold mb-4">Klaar om te koersen?</h2>
        <CountdownBanner className="max-w-md mx-auto mb-6" />
        <Button asChild size="lg" className="retro-border-primary text-base font-bold">
          <Link to="/team-samenstellen">Schrijf je in →</Link>
        </Button>
      </section>
    </div>);

}