import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Trophy, Users, Zap, Mountain, Flag, Sparkles } from "lucide-react";

const PAGE_URL = "https://www.koerspoule.nl/giro-italia-poule-2026";
const PAGE_TITLE = "Giro d'Italia Poule 2026 maken? | Gratis Wielerpool | Koerspoule";
const PAGE_DESCRIPTION =
  "Speel mee met de Giro d'Italia poule 2026. Maak gratis je eigen wielerpool, stel je team samen en versla je vrienden. Start direct!";

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [, key, val] = selector.match(/\[(\w+)="([^"]+)"\]/) ?? [];
    if (key && val) el.setAttribute(key, val);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export default function GiroPoule2026() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = PAGE_TITLE;

    setMeta('meta[name="description"]', "content", PAGE_DESCRIPTION);
    setMeta('meta[property="og:title"]', "content", PAGE_TITLE);
    setMeta('meta[property="og:description"]', "content", PAGE_DESCRIPTION);
    setMeta('meta[property="og:url"]', "content", PAGE_URL);
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[name="twitter:title"]', "content", PAGE_TITLE);
    setMeta('meta[name="twitter:description"]', "content", PAGE_DESCRIPTION);
    setLink("canonical", PAGE_URL);

    // JSON-LD structured data (FAQPage + WebPage)
    const ldId = "ld-giro-2026";
    document.getElementById(ldId)?.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = ldId;
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          url: PAGE_URL,
          inLanguage: "nl-NL",
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Hoe werkt de Giro d'Italia poule?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Maak een gratis account, start je eigen poule, nodig vrienden uit, stel je team samen en verdien punten per etappe.",
              },
            },
            {
              "@type": "Question",
              name: "Is meedoen aan de Giro poule gratis?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Ja, Koerspoule is volledig gratis. Je maakt in een paar minuten een account en start direct je poule.",
              },
            },
            {
              "@type": "Question",
              name: "Hoe verdien je punten in de wielerpool?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Je verdient punten voor etappe-overwinningen, het eindklassement en speciale prestaties van jouw renners.",
              },
            },
          ],
        },
      ],
    });
    document.head.appendChild(script);

    return () => {
      document.title = prevTitle;
      document.getElementById(ldId)?.remove();
    };
  }, []);

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <article className="max-w-4xl mx-auto space-y-7">
        {/* Hero */}
        <header className="text-center">
          <div className="vintage-ornament mb-3">
            <span className="vintage-ornament-symbol">✦</span>
            <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
              La Corsa Rosa · 2026
            </span>
            <span className="vintage-ornament-symbol">✦</span>
          </div>
          <h1 className="vintage-heading text-3xl md:text-4xl font-bold mb-3">
            🏆 Giro d'Italia Poule 2026 maken
          </h1>
          <p className="text-lg text-muted-foreground font-serif italic max-w-2xl mx-auto">
            De Giro d'Italia is één van de mooiste wielerrondes van het jaar. Drie weken lang
            strijden de beste renners ter wereld in Italië. Maak het nog spannender door je eigen
            Giro poule te starten. Speel samen met vrienden, familie of collega's en ontdek wie de
            beste wielerkenner is.
          </p>
          <div className="vintage-divider mt-4 max-w-md mx-auto" />
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="retro-border-primary font-bold">
              <Link to="/login">🚀 Start gratis je poule</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/regels">📖 Bekijk de regels</Link>
            </Button>
          </div>
        </header>

        {/* Hoe werkt de Giro poule */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🚀 Hoe werkt de Giro poule?
          </h2>
          <ol className="space-y-2.5">
            {[
              "Maak een gratis account aan",
              "Start je eigen poule",
              "Nodig vrienden uit met een toegangscode",
              "Stel je team samen uit de officiële startlijst",
              "Verdien punten per etappe en klim in het klassement",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono font-bold text-sm">
                  {i + 1}
                </span>
                <span className="font-sans pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground font-serif italic">
            👉 Binnen een paar minuten ben je klaar om te spelen.
          </p>
        </section>

        {/* Stel je team samen */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🧠 Stel je wielerteam samen
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Kies slim uit verschillende type renners — de juiste balans bepaalt jouw winstkansen:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Trophy,
                emoji: "🌹",
                title: "Klassementsrenners",
                desc: "Voor het roze — de mannen die meedoen om de eindwinst.",
              },
              {
                icon: Zap,
                emoji: "⚡",
                title: "Sprinters",
                desc: "Voor de vlakke etappes — pure snelheid in de massasprint.",
              },
              {
                icon: Mountain,
                emoji: "🏔️",
                title: "Klimmers",
                desc: "Voor de bergen — wie pakt de Cima Coppi en de bergetappes?",
              },
            ].map(({ icon: Icon, emoji, title, desc }) => (
              <Card key={title} className="ornate-frame retro-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{emoji}</span>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Hoe verdien je punten */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
            📊 Hoe verdien je punten?
          </h2>
          <p className="text-muted-foreground mb-4 font-serif">
            Tijdens de Giro verdien je punten voor:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Flag, label: "Etappe-overwinningen" },
              { icon: Trophy, label: "Eindklassement" },
              { icon: Sparkles, label: "Speciale prestaties" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 p-3 rounded-md border-2 border-border bg-secondary/30">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="font-sans font-medium">{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground font-serif italic">
            Hoe beter jouw renners presteren, hoe hoger jij eindigt in de poule.
          </p>
        </section>

        {/* Speel samen met vrienden */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
            🏁 Speel samen met vrienden
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { emoji: "🔒", title: "Eigen privé poule", desc: "Beveiligd met een unieke toegangscode." },
              { emoji: "📈", title: "Live tussenstanden", desc: "Volg na elke etappe wie er aan kop staat." },
              { emoji: "🎉", title: "Dagelijkse spanning", desc: "Drie weken lang plezier in je vriendengroep." },
            ].map(({ emoji, title, desc }) => (
              <Card key={title} className="ornate-frame retro-border bg-card">
                <CardContent className="p-5">
                  <div className="text-2xl mb-2">{emoji}</div>
                  <h3 className="font-display text-lg font-bold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground font-serif italic text-center">
            Perfect voor vriendengroepen, werk of familie.
          </p>
        </section>

        {/* Waarom Koerspoule */}
        <section className="ornate-frame retro-border p-6 md:p-8 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--vintage-gold))] via-primary to-[hsl(var(--vintage-gold))]" />
          <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
            🎯 Waarom Koerspoule?
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Gratis en makkelijk",
              "Snel een poule starten",
              "Live updates per etappe",
              "Voor elke wielerfan",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0" />
                <span className="font-sans">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Final CTA */}
        <section className="text-center ornate-frame retro-border bg-card p-8">
          <Users className="h-10 w-10 mx-auto text-primary mb-3" />
          <h2 className="vintage-heading text-3xl font-bold mb-3">
            👉 Start jouw Giro d'Italia poule 2026
          </h2>
          <p className="text-muted-foreground font-serif italic max-w-xl mx-auto mb-6">
            De Giro begint deze week — dus wacht niet te lang. Maak nu je poule en begin direct met
            spelen.
          </p>
          <Button asChild size="lg" className="retro-border-primary font-bold animate-pulse">
            <Link to="/login">🚴‍♂️ Maak nu je gratis poule</Link>
          </Button>
        </section>
      </article>
    </div>
  );
}
