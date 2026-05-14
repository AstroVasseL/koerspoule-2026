## Doel
Vervang het huidige Koerspoule-logo door de nieuwe uploaded versie (rode renner + KOERSPOULE shield met Italiaanse vlag) op:
1. **Homepage hero** — groot, goed zichtbaar
2. **Header links boven** — in de masthead

Logo moet transparant zijn (PNG zonder achtergrond).

## Stappen

1. **Asset toevoegen**
   - Kopieer `user-uploads://ChatGPT_Image_May_14_2026_10_47_41_AM.png` → `src/assets/koerspoule-logo-2026.png`
   - Het origineel heeft een donkere achtergrond. Ik genereer een transparante versie via `imagegen` (of strip background) zodat het op elke achtergrond werkt.

2. **Header (`src/components/Layout.tsx`)**
   - Vervang de huidige `/lovable-uploads/449638...png` reference met een ES6 import van het nieuwe logo
   - Vergroot iets (h-10 → h-12) voor betere zichtbaarheid

3. **Homepage hero (`src/pages/Index.tsx`)**
   - Vervang `koerspouleLogo` import met nieuwe asset
   - Behoud bestaande responsive sizing (`w-72 md:w-[28rem]`) en `-mb-20` overlap met ondertitel
   - Eventueel `drop-shadow-lg` behouden voor diepte

## Technische details
- Nieuwe file: `src/assets/koerspoule-logo-2026.png` (transparante PNG)
- Geen wijzigingen aan favicon of `lovable-uploads/` bestanden
- Geen design-system tokens raken

## Open vraag
Wil je het oude logo (`koerspoule-logo.png` in `src/assets`) helemaal vervangen, of als nieuwe variant naast het oude bewaren? Default plan: nieuwe variant toevoegen, oude blijft staan ongebruikt.
