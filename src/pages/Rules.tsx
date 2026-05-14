import { useEffect, useMemo } from "react";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { usePointsSchema } from "@/hooks/usePointsSchema";

export default function Rules() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: game, isLoading: gameLoading } = useCurrentGame();
  const { data: categories = [], isLoading: catsLoading } = useCategories(game?.id);
  const { data: schema = [], isLoading: schemaLoading } = usePointsSchema(game?.id);

  const stagePoints = useMemo(
    () => schema.filter((s) => s.classification === "stage").sort((a, b) => a.position - b.position),
    [schema],
  );

  // (jerseyPoints schema is niet meer relevant — truien lopen via voorspellingen, niet via points_schema.)

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.sort_order - b.sort_order), [categories]);

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Speluitleg & Reglement</h1>
          <p className="text-muted-foreground font-serif italic">
            "De jury, bestaande uit J.W.M. Broos, heeft gelijk. Zo niet, dan toch."
          </p>
          {game && (
            <p className="text-xs text-muted-foreground mt-2 font-sans uppercase tracking-wider">
              Actieve koers: <span className="font-bold">{game.name}</span>
            </p>
          )}
          <div className="vintage-divider max-w-xs mx-auto mt-4" />
        </div>

        {/* Rules */}
        <section className="retro-border bg-card p-4 mb-4">
          <h2 className="font-display text-2xl font-bold mb-3">📜 Het Reglement</h2>
          <ol className="space-y-3 font-sans text-sm">
            {[
              "De jury, bestaande uit J.W.M. Broos, heeft gelijk.",
              "Zo niet, dan toch.",
              "De inschrijving dient binnen te zijn vóór de start van de eerste etappe.",
              "Stel je droomploeg samen in de Team Samenstellen-pagina en zet je beste renners aan de start.",
              "Als iemand uit de koers stapt, pech voor jou :(",
            ].map((rule, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* How to play */}
        <section className="retro-border bg-card p-4 mb-4">
          <h2 className="font-display text-2xl font-bold mb-3">🚴 Hoe speel je mee?</h2>
          <div className="space-y-4 font-sans text-sm">
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">Stap 1 — Maak een account aan</h3>
              <p className="text-muted-foreground">Registreer je met een e-mailadres en kies een ploegnaam.</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">Stap 2 — Stel je ploeg samen</h3>
              <p className="text-muted-foreground">
                {catsLoading || gameLoading ? (
                  "Categorieën worden geladen..."
                ) : sortedCategories.length > 0 ? (
                  <>
                    Kies uit <span className="font-bold">{sortedCategories.length}</span> categorieën telkens 1 renner.
                    Voeg 2 Jokers toe (vrije keuze buiten de categorieën). Jokers moeten unieke renners zijn en mogen
                    niet voorkomen in de gekozen categorie-renners.
                  </>
                ) : (
                  "Categorieën worden binnenkort beschikbaar gesteld door de admin."
                )}
              </p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">Stap 3 — Voorspel de klassementen</h3>
              <p className="text-muted-foreground">
                Voorspel het podium van het eindklassement + winnaar puntentrui, bergtrui en jongerentrui.
              </p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">Stap 4 — Daag je vrienden uit</h3>
              <p className="text-muted-foreground">
                Maak een subpoule aan of voer een code in om een bestaande poule te joinen.
              </p>
            </div>
          </div>
        </section>

        {/* Points */}
        <section className="retro-border bg-card p-4 mb-4">
          <h2 className="font-display text-2xl font-bold mb-3">📊 Puntentelling</h2>

          <h3 className="font-display text-lg font-bold mb-2">Per etappe (top 20)</h3>
          <p className="text-sm text-muted-foreground mb-3 font-sans">
            Alleen renners die in jouw selectie zitten en bij de finish in de top 20 eindigen leveren punten op. Renners
            die niet finishen (DNS / DNF) krijgen 0 punten.
          </p>
          {schemaLoading ? (
            <p className="text-sm text-muted-foreground italic mb-6">Puntenschema laden...</p>
          ) : stagePoints.length === 0 ? (
            <p className="text-sm text-muted-foreground italic mb-6">Nog geen puntenschema ingesteld door de admin.</p>
          ) : (
            <div className="retro-border bg-background p-4 mb-6">
              <div className="grid grid-cols-4 md:grid-cols-5 gap-2 text-sm font-sans">
                {stagePoints.map((row) => (
                  <div key={row.position} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono text-xs w-5 text-right">{row.position}.</span>
                    <span className="font-bold text-accent">{row.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="font-display text-lg font-bold mb-2">Podium algemeen klassement</h3>
          <div className="space-y-2 font-sans text-sm mb-3">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>Juiste renner op de juiste plek (1, 2 of 3)</span>
              <span className="font-bold text-accent">50 pt</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>Juiste renner in top 3, maar verkeerde plek</span>
              <span className="font-bold text-accent">25 pt</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>Renner niet in top 3</span>
              <span className="font-bold text-muted-foreground">0 pt</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Elke positie wordt apart beoordeeld. Een renner kan maximaal één keer punten opleveren. Maximaal 150
              punten in totaal voor het GC-podium.
            </p>
          </div>

          <h3 className="font-display text-lg font-bold mb-2">Truien (groen, berg, wit)</h3>
          <div className="space-y-2 font-sans text-sm mb-3">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>Juiste winnaar puntentrui (groen)</span>
              <span className="font-bold text-accent">25 pt</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>Juiste winnaar bergtrui</span>
              <span className="font-bold text-accent">25 pt</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>Juiste winnaar jongerentrui (wit)</span>
              <span className="font-bold text-accent">25 pt</span>
            </div>
          </div>

          <h3 className="font-display text-lg font-bold mb-2">Jokers</h3>
          <p className="text-sm text-muted-foreground mb-3 font-sans">
            Kies twee Jokers uit je selectie. De etappepunten van een Joker tellen
            <span className="font-bold text-accent"> dubbel</span> in elke etappe.
          </p>

          <h3 className="font-display text-lg font-bold mb-2">Totaalklassement</h3>
          <p className="text-sm text-muted-foreground font-sans">
            Het totaal van een speler is de som van alle etappepunten plus de behaalde voorspellingspunten (podium +
            truien). Het klassement wordt automatisch bijgewerkt na elke verwerkte etappe. De stand na de laatste etappe
            is de definitieve eindstand.
          </p>
        </section>

        {/* Categories overview */}
        <section className="retro-border bg-card p-4">
          <h2 className="font-display text-2xl font-bold mb-3">📋 Categorieën</h2>
          <p className="text-sm text-muted-foreground mb-4 font-sans">Kies 1 renner per categorie + 2 vrije Jokers.</p>

          {catsLoading || gameLoading ? (
            <p className="text-sm text-muted-foreground italic">Categorieën laden...</p>
          ) : sortedCategories.length === 0 ? (
            <div className="p-6 text-center bg-secondary/30 rounded-md">
              <p className="text-sm text-muted-foreground">Nog geen categorieën ingesteld voor deze koers.</p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                De admin stelt deze in voor de start van de koers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedCategories.map((cat, idx) => (
                <div key={cat.id} className="p-3 bg-secondary/30 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="jersey-badge bg-primary text-primary-foreground text-xs">#{idx + 1}</span>
                    <span className="font-bold text-sm font-sans">{cat.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cat.category_riders.length === 0 ? (
                      <em>Nog geen renners toegewezen</em>
                    ) : (
                      cat.category_riders
                        .map((cr) => cr.riders?.name)
                        .filter(Boolean)
                        .join(" • ")
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tot slot */}
        <section className="retro-border bg-card p-4 mt-4">
          <h2 className="font-display text-2xl font-bold mb-3">🏁 Tot slot</h2>
          <div className="space-y-3 font-sans text-sm text-muted-foreground">
            <p>
              Deze koerspoule is met zorg en enthousiasme ontwikkeld. Het doel is simpel: samen
              meer plezier beleven aan het volgen van de koers 🚴
            </p>
            <p>
              Wil je ons helpen om deze koerspoule te blijven verbeteren en draaiende te houden? Dat kan via de knop{" "}
              <span className="font-bold text-foreground">"Steun de kopgroep"</span>. Alle steun wordt enorm
              gewaardeerd!
            </p>
          </div>
          <div className="vintage-divider max-w-xs mx-auto my-5" />
          <div className="flex justify-center">
            <a
              href="https://www.buymeacoffee.com/luukloohuis"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-bold text-white shadow-md hover:opacity-90 transition"
              style={{ backgroundColor: "#e6007e", fontFamily: "Arial, sans-serif", border: "1px solid #ffffff" }}
            >
              <span>🚴</span>
              <span>Steun de kopgroep</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
