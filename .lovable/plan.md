# Plan – Uitslagen, etappebeheer & GC

## 1. Database (migratie)

**`stages` tabel uitbreiden:**
- Nieuwe kolom `distance_km` (`integer`, nullable) – afstand per etappe.
- Nieuwe kolom `is_gc` (`boolean`, default `false`) – markeert de speciale GC-"etappe".
- Constraint: per `game_id` mag maar 1 rij `is_gc = true` bestaan (unique partial index).

Geen wijziging aan RLS (bestaande policies dekken het).

## 2. Admin – `StagesTab.tsx`

- Veld **KM** toevoegen aan het "Nieuwe etappe"-formulier en aan de tabelrij (inline edit, net als `stage_type`).
- Tabelkolom **KM** tonen.
- GC-rij krijgt herkenbare badge ("GC – Eindklassement") en is niet verwijderbaar via de normale knop (alleen via aparte actie).
- Knop **"GC-etappe aanmaken"** (verschijnt alleen als er nog geen `is_gc`-rij is en als alle 21 etappes bestaan). Dit creëert een stage met `stage_number = 22`, `is_gc = true`, naam *"Eindklassement (GC)"*.

## 3. Admin – `CalculationTab.tsx`

- Bestaande knop **"Herbereken voorspellingen"** hernoemen naar **"Eindklassementen berekenen"**, inclusief uitleg-tekst:
  > "Berekent uitsluitend GC-podium en truienpunten. Staat los van de etappepunten."
- Functie blijft `calculate_prediction_points` aanroepen (die rekent al GC-podium + truien).
- In de etappe-overview-tabel: GC-rij filteren uit "berekening per etappe" (want die heeft geen stage-uitslag).

## 4. Frontend – `ResultsView.tsx` (Uitslagen-tab)

**Etappe-roadbook strip (boven):**
- Modernere kaart-layout per etappe in plaats van smalle knopjes.
- Per kaart: nummer, type-icoon, naam, datum, KM, eigen punten.
- GC-kaart krijgt eigen styling (gouden accent, label "GC") en is alleen klikbaar/zichtbaar zodra etappe 21 `approved` is.

**Geselecteerde etappe-header:**
- Toont KM prominenter (bijv. `MapPin · 198 km · 12 mei`).
- Bij GC: andere header met "Eindklassement" + truienoverzicht.

**GC-detailweergave (als geselecteerde "etappe" `is_gc` is):**
- Kolom 1: eindklassement top 20 renners (uit `stage_results.gc_position`).
- Kolom 2: truiwinnaars (groen/berg/wit – via `points_position`, `mountain_position`, `youth_position`).
- Kolom 3: jouw GC-punten (uit `entry_prediction_points`).

## 5. Logica-samenvatting

| Onderdeel | Bron |
|-----------|------|
| Etappe 1–21 punten | `stage_points` (per etappe berekend) |
| GC-podium + truien | `entry_prediction_points` (knop "Eindklassementen berekenen") |
| GC-zichtbaarheid frontend | alleen wanneer etappe 21 `results_status = 'approved'` |

## Bestanden

- **migratie:** `supabase/migrations/<timestamp>_stages_km_and_gc.sql`
- **edit:** `src/components/admin/StagesTab.tsx`
- **edit:** `src/components/admin/CalculationTab.tsx`
- **edit:** `src/components/ResultsView.tsx`
- **edit:** `src/hooks/useResults.ts` (type `Stage` uitbreiden met `distance_km`, `is_gc`)
- types-bestand wordt automatisch door Supabase ververst na de migratie.

## Buiten scope (tenzij gewenst)
- Geen aparte GC-puntenberekenings-RPC; we hergebruiken bestaande `calculate_prediction_points`.
- Geen wijziging aan deelnemerszijde van het puntensysteem (etappepunten blijven gescheiden).
