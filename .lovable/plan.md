## Doel
Homepage en navigatie van Koerspoule strakker maken: hergebruik bestaande componenten in plaats van mock-visuals, voeg Giro 2026-categorieblokken toe, vervang de "Aap met dartpijlen"-visual door een echte heatmap, en verbeter scrollgedrag van de twee CTA-knoppen.

---

## 1. Preview etappe-evolutie (subpoule grafiek)

In `src/components/FeaturePreview.tsx` is de eerste kaart "Etappe-evolutie" nu een **mock LineChart** met hardcoded data (Tadej / Marco / Eddy / JIJ).

We vervangen die mock door de **echte grafiek uit `SubpouleStandings.tsx`** — exact dezelfde stijl (donker gradient panel, glow, legend pills, ranking-lines). Concreet:

- We splitsen de chart-sectie van `SubpouleStandings` af naar een herbruikbare component `SubpouleEvolutionChart` (props: `subpouleId`, optioneel `compact`/`previewMode` om de header iets kleiner te tonen).
- `SubpouleStandings` blijft die nieuwe component intern gebruiken — geen visuele verandering daar.
- Op de homepage tonen we de chart voor de **eerste subpoule waar de ingelogde user lid van is**. Heeft de user geen subpoule (of niet ingelogd) → fallback met dezelfde demo-data als nu, maar in dezelfde donkere stijl.

## 2. Giro 2026 categorieblokken

De huidige derde kaart "Categorieën & voorspellingen" in `FeaturePreview.tsx` toont 6 categorieën in één lijstje. Dit splitsen we op in **twee duidelijke preview-blokken** die qua structuur de bestaande `categories`-tabel volgen:

- **Blok A — Klassement**: GC favorieten, Baby Giro, Bergkoning, etc.
- **Blok B — Sprint & aanval**: Sprinters, Aanvallers, Tijdrijders, etc.

Elk blok:
- Toont 3 categorieën uit `useCategories(game.id)` (filter op `category_group` of op naam-pattern als er nog geen group-veld is — fallback: eerste helft / tweede helft).
- Per categorie: top-pick (uit `game_pick_stats` wanneer live), max picks, korte status (live % ownership of "open").
- Schaalbaar: meer categorieën verschijnen automatisch wanneer admin er toevoegt.

## 3. Heatmap visual i.p.v. "Aap met dartpijlen"

De middelste kaart "Aap met de dartpijl" (Monte Carlo histogram) wordt **volledig verwijderd** uit `FeaturePreview.tsx`.

In de plaats komt een **compacte preview van de bestaande `SubpouleHeatmap`** (zelfde component die in Coup Tactique gebruikt wordt):
- Toont 21 etappes × top-picks ownership-intensiteit per categorie.
- Stijl = sport-dashboard (HSL-schaal, geen cartoon).
- Bij niet-live race: toont een geblurde "preview"-versie met dummy-cellen + label "Beschikbaar zodra de Giro start".
- Geen nieuwe heatmap bouwen — we wrappen `SubpouleHeatmap` in een `HeatmapPreview`-component met `previewMode` prop (kleinere cellen, geen filters).

## 4. Navigatie & scroll

Twee knoppen krijgen nieuw gedrag:

**"Bekijk uitslagen"** (in CTA-row van `FeaturePreview` + hero):
- Behoudt `<Link to="/uitslagen">`.
- Voegt `onClick` toe die na navigatie `window.scrollTo({ top: 0, behavior: "smooth" })` triggert.
- Implementeren via een kleine helper `useScrollToTopOnNav` of inline `setTimeout(() => scrollTo(0,0), 0)` na navigate().

**"Stel je ploeg samen"** (hero + CTA-row):
- Op de homepage: scrollt smooth naar de Features-sectie ("Hoe werkt het?") die we hernoemen / aanvullen tot een sectie met `id="stel-je-ploeg-samen"` en een directe inline-CTA naar `/team-samenstellen`.
- We voegen `scroll-margin-top: 80px` toe zodat de sectie netjes onder de sticky header eindigt.
- Knop gebruikt `<a href="#stel-je-ploeg-samen">` met `scrollIntoView({ behavior: "smooth", block: "start" })`.
- Op andere pagina's: navigeert naar `/#stel-je-ploeg-samen` en scrollt na mount.

## 5. UX

- Eén centrale `smoothScrollTo(id)` helper in `src/lib/utils.ts` om dubbele triggers te vermijden.
- Geen `scroll-behavior: smooth` globaal (kan stutteren) — alleen op expliciete acties.
- Alle bestaande animaties (`animate-fade-in`) blijven; geen nieuwe libs nodig.

---

## Technische samenvatting (voor ontwikkelaar)

| Bestand | Wijziging |
|---|---|
| `src/components/SubpouleEvolutionChart.tsx` | **Nieuw** — geëxtraheerd uit `SubpouleStandings.tsx` (regels ~267–500). Props: `subpouleId`, `compact?`, `showHeader?`. |
| `src/components/SubpouleStandings.tsx` | Refactor: gebruikt nieuwe `SubpouleEvolutionChart` intern (geen visuele change). |
| `src/components/FeaturePreview.tsx` | Verwijder `subpouleData` mock + Monte Carlo kaart. Kaart 1 → `SubpouleEvolutionChart` (eerste subpoule of demo). Kaart 2 → `HeatmapPreview`. Categorieën-kaart → splits in twee blokken (Klassement / Sprint). |
| `src/components/HeatmapPreview.tsx` | **Nieuw** — wrapper rond `SubpouleHeatmap` met compacte styling + locked-state als geen live race. |
| `src/pages/Index.tsx` | Voeg `id="stel-je-ploeg-samen"` toe aan Features-sectie + `scroll-mt-20`. Update hero-button "Stel je ploeg samen" naar anchor scroll. Update "Bekijk uitslagen" met scroll-to-top behavior. |
| `src/lib/utils.ts` | Voeg `smoothScrollTo(id)` + `scrollToTopOnRoute()` helpers toe. |

Geen DB-migraties, geen nieuwe routes, geen externe deps.
