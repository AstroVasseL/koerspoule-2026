## Doel

In de Gazetta-tab van *Mijn Peloton* de `MiniStrip` uitbreiden zodat de drie Hors Catégorie-shortcuts (Monkey IQ, Emirates, Wielerdirecteur) elk hun bijhorende kerncijfer tonen, en de "→ bekijk je volledige ploeg" CTA visueel verduidelijken. Geen wijzigingen aan rekenlogica of andere tabs.

## Wat verandert er visueel

Per shortcut-cel in `MiniStrip`:

- **Monkey IQ** → percentage verslagen sim-apen, bv. `73%` met onderschrift `apen verslagen`.
- **Emirates** → percentage van de droomploeg, bv. `62%` met onderschrift `van droomploeg`.
- **Wielerdirecteur** → rapportcijfer 1.0–10.0, bv. `7.4` met onderschrift `rapport`.

Layout per cel wordt: klein icoon bovenaan, groot cijfer in het midden (zelfde `font-oswald` look als de score-cellen links), label eronder. Cellen blijven volledig klikbaar en navigeren naar dezelfde tabs als nu.

CTA-balk onderaan ("→ bekijk je volledige ploeg") wordt:

- Een echte knop-achtige strook met een herkenbaar icoon (`Users` of `ArrowRight` in een kleine cirkel), label "Bekijk je volledige ploeg", en een `ChevronRight` rechts.
- Iets meer verticale ademruimte, contrast-achtergrond (`bg-secondary/40` → hover `bg-secondary/60`), zodat ie onmiskenbaar als knop leest in plaats van als platte tekstregel.

## Hoe data ontstaan

De cijfers worden vandaag binnen `HorsCategorieTab.tsx` (1700+ regels) berekend. Om die file niet te raken, komt er één nieuwe lichte hook `useHorsCategorieSummary({ gameId, userId })` die enkel de drie geaggregeerde getallen retourneert die `MiniStrip` nodig heeft.

Die hook hergebruikt dezelfde bronnen die `HorsCategorieTab` gebruikt:

- entries + stage_results (Emirates: jouw punten ÷ droomploeg-totaal).
- monte-carlo simulatie-distributie → percentage verslagen apen.
- pool-ranking + monkey + joker subscores → eindcijfer Wielerdirecteur (zelfde formule `max(3.0, round((raw × 9 + 1) × 10) / 10)`).

Resultaat-type:

```ts
type HorsSummary = {
  monkeyBeatPct: number | null;      // 0..100
  emiratesPct: number | null;         // 0..100
  directorScore: number | null;       // 1.0..10.0
};
```

`null` betekent: nog niet berekenbaar (geen gefiatteerde etappes / geen entry). `MiniStrip` toont in dat geval een neutraal "—".

## Bestanden

```text
src/hooks/useHorsCategorieSummary.ts   (nieuw — lichte aggregator, leunt op
                                        bestaande RPC's & tabellen)
src/components/karavaan/MiniStrip.tsx  (NavCell uitgebreid met value-prop;
                                        CTA-strook redesigned)
src/components/karavaan/KaravaanFeed.tsx
                                       (haalt summary op, geeft door aan
                                        MiniStrip via nieuwe prop `horsScores`)
```

Geen wijzigingen aan `HorsCategorieTab.tsx`, geen wijziging aan bestaande hooks/RPC's, geen DB-migraties, geen edge-functions.

## Out of scope

- Geen layout-wijziging aan de score-cellen links (subpoule / overall / punten).
- Geen wijziging aan de bestaande Hors Catégorie tab zelf.
- Geen extra tracking of analytics.
