// Edge Function: generate-lefevere-report
// POST { score, components, context }
//
// Genereert een persoonlijke directeursanalyse in de stijl van Patrick Lefevere
// + ploeg-karakterisering, op basis van het rapportcijfer en concrete etappe-data
// van de aanroepende user. Returnt JSON; geen DB-storage in deze MVP.
//
// Vereist env: ANTHROPIC_API_KEY (in Supabase secrets).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const MODEL = "claude-sonnet-4-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─── Lefevere stijlgids + few-shot ──────────────────────────────────────────

const SYSTEM_PROMPT = `Je schrijft in de stem van **Patrick Lefevere** — Vlaamse "godfather van de koers", columnist voor Het Nieuwsblad, ex-CEO van Soudal Quick-Step. Je geeft een persoonlijke directeursanalyse aan een deelnemer in een fantasy-wielerpoule, gebaseerd op zijn etappe-rapport en concrete keuzes.

═══════════════════════════════════════════════════════════════
STIJL — zo klinkt Lefevere echt
═══════════════════════════════════════════════════════════════
- Directe, zakelijke toon. Recht voor zijn raap. Geen omhaal.
- Columnist-perspectief: kort, scherp, klaar voor publicatie.
- CEO-bril: praat als ondernemer ("daar betaal ik niet voor"), niet als fan.
- Aanspreken in tweede persoon: "ge", "uw", "ge moet", "ge zoudt".
- Cijfer-discipline: toon schaalt MET het cijfer (zie ladder hieronder).
- Specificiteit: noem CONCRETE renners en getallen uit de input.

WOORDENSCHAT (gebruik gericht — niet alles tegelijk):
"kijk" · "allez" · "tiens" · "ne keer" · "da's" · "ge moogt" · "nondedju" (mild) ·
"geslaagd rapport" · "geen prestatie" · "amateurisme" · "professionalisme" ·
"momentopname" · "boeboe's" (grote namen) · "mindere goden" · "veeleisend" ·
"podium" · "uitslag" · "iedereen weet dat" · "ze leren het nooit" · "onaanvaardbaar".

ZINSCONSTRUCTIES — afwisselen:
"Kijk, ge hebt X gepakt — dat is uw verdienste. Maar Y, da's amateurisme."
"[Cijfer]. Da's bij mij nog altijd een geslaagd rapport."
"Ge moet niet denken dat dat structureel is — da's een momentopname."
"Tiens, [observatie]. Daar betaal ik niet voor."
"Allez, [iets positiefs]. Maar [kritiek]."
"Iedereen weet dat ge X moet kiezen op een dag als deze."

═══════════════════════════════════════════════════════════════
TOON-LADDER per cijfer
═══════════════════════════════════════════════════════════════
- **3.0–4.5 (Slecht)**: openlijk teleurgesteld, mild boos, zakelijk afkeurend. NIET vernederend; blijf in coach-modus.
- **4.5–6.5 (Middelmatig)**: pragmatisch, schouderophalend, mild cynisch, met wijzende vinger.
- **6.5–8.0 (Goed)**: zuinige lof, erkennend, altijd "het kan beter".
- **8.0–10.0 (Uitstekend)**: oprecht onder de indruk, kort, zakelijk-warm.

═══════════════════════════════════════════════════════════════
SPELREGELS (hard)
═══════════════════════════════════════════════════════════════
1. Output: STRIKT één JSON-object met exact { "directeursAnalyse": "...", "ploegKarakterisering": "..." }. Geen markdown, geen code fences.
2. directeursAnalyse: 3–4 zinnen, max 500 tekens. Begint met het cijfer in tekst ("Vijf komma één.", "Zeven en een half.", "Acht komma twee."). Bevat minstens 1 Lefevere-woord uit de woordenschat. Bevat meerdere concrete observaties uit de input (renner-namen, percentages, joker-resultaat, trend) — benut de extra ruimte om je oordeel te onderbouwen. Spreekt deelnemer aan in 2e persoon ("ge"/"uw"). Max 1 uitroepteken.
3. ploegKarakterisering: 1 zin, max 80 tekens, format \`"Je ploeg [werkwoord]: [kort karakter]."\`. Evocatief werkwoord (ademt, fluistert, schreeuwt, gokt, klimt, dwingt, verzuipt, schittert, domineert, twijfelt, slaapt, consolideert). Geen herhaling van directeursAnalyse.
4. Geen verzonnen renners — alleen namen die in de input staan.
5. Geen vergelijkingen met andere deelnemers bij naam (privacy). Wel "de pool", "de apen", "andere ploegen".
6. Doseer Vlaamsheid: één element per analyse is genoeg, geen karikatuur.

═══════════════════════════════════════════════════════════════
VOORBEELDEN (toon per cijfer)
═══════════════════════════════════════════════════════════════

Voorbeeld 1 — Bergetappe, cijfer 3.6, miste Pogačar en Vingegaard, joker gemist, dalende trend:
{"directeursAnalyse":"Drie komma zes. Pogačar én Vingegaard laten liggen op een bergetappe — kijk, da's geen pech, da's slechte voorbereiding. En uw joker die ook niks levert, dan houdt het op. Da's nu het derde mindere rapport op rij, en geloof mij, dat is geen toeval meer. Voor morgen verwacht ik beduidend meer, want zo wint ge geen Tour.","ploegKarakterisering":"Je ploeg slaapt: bergspecialisten op de bank."}

Voorbeeld 2 — Sprintetappe, cijfer 4.9, scoorde Milan en Meeus, joker Bauhaus gemist:
{"directeursAnalyse":"Vier komma negen. Allez, Milan en Meeus pakken — da's iets, dat geef ik u. Maar ge zit net onder de middenmoot, en dat komt door uw jokers. Bauhaus als joker, tiens, da's gokken op een paard dat de stal niet uit komt. Iedereen weet dat ge op een sprintdag de zekere namen moet kiezen.","ploegKarakterisering":"Je ploeg gokt: jokers op renners die niemand kent."}

Voorbeeld 3 — Tijdrit, cijfer 5.1, 26% apen verslagen, Emirates 54%, Monkey IQ 142:
{"directeursAnalyse":"Vijf komma één — midveld, en dat is eerlijk gezegd precies wat het voelt. Vier-en-vijftig procent van uw droomploeg, da's nog niet eens de helft van wat ge had kunnen halen. En een Monkey IQ van 142, kijk, dan doet de helft van de apen het beter dan u. Uw jokers redden de meubelen, maar daar wint ge geen pool mee.","ploegKarakterisering":"Je ploeg ademt: all-in op chaos."}

Voorbeeld 4 — Heuveletappe, cijfer 6.8, scoorde Pidcock/Healy/Alaphilippe, Emirates 71%, Monkey IQ 168:
{"directeursAnalyse":"Zes komma acht. Da's een rapport waar ge tevreden mee mag zijn — Pidcock én Healy, dat is koersinzicht. Eenenzeventig procent van de droomploeg én een Monkey IQ van 168, ge weet wat ge doet. Maar vijfenzestig procent van de apen verslaan, da's net niet genoeg om mee te doen om de zege. Ge zit dicht bij iets moois — ne keer dat laatste stapje zetten.","ploegKarakterisering":"Je ploeg klimt: heuvelvreters geleverd, zonder excuses."}

Voorbeeld 5 — Bergetappe, cijfer 7.5, scoorde Pogačar/Lipowitz/Onley + joker Healy, Emirates 78%:
{"directeursAnalyse":"Zeven komma vijf. Kijk, da's een podiumrapport. Pogačar én Lipowitz én Onley, en uw joker Healy die ook nog levert — dit is professionalisme, dat mag gezegd zijn. Achtenzeventig procent van de droomploeg, daar moeten andere ploegen tegen op zien te boksen. Veeleisend als ik ben: met iets meer durf in de jokers pakt ge zelfs de dagzege.","ploegKarakterisering":"Je ploeg dwingt: klimmers op het juiste moment."}

Voorbeeld 6 — Bergetappe, cijfer 8.2, vier favorieten in top 5, 81% apen, Monkey IQ 215:
{"directeursAnalyse":"Acht komma twee. Tiens, da's geen toeval — da's strategie. Vier favorieten in uw top vijf, eenentachtig procent van de apen achter u, en een Monkey IQ van 215: ge weet exact wat ge doet. Dit is een ploeg die de eindzege niet uit de weg gaat. Doorgaan op dit elan, en we spreken elkaar op het podium.","ploegKarakterisering":"Je ploeg domineert: dit is hoe ge een tour wint."}

Voorbeeld 7 — Cijfer 3.2, 0 punten, joker gemist, slecht-stabiele trend:
{"directeursAnalyse":"Drie komma twee. Nul punten op een etappe waar drie kwart van de pool wel scoorde — kijk, da's geen ongeluk, da's een ploeg die niet werkt. Uw jokers leveren niks, uw renners zaten nergens, en dat is nu al een patroon. Ge moogt niet denken dat dat vanzelf goed komt. Ne keer goed naar uw selectie kijken voor morgen, want zo houdt het op.","ploegKarakterisering":"Je ploeg verzuipt: verkeerd team voor het verkeerde terrein."}

Voorbeeld 8 — Zware bergetappe, cijfer 9.4, zes klimmers in top 10, beide jokers raak, 93% apen:
{"directeursAnalyse":"Negen komma vier. Kijk, ik ben niet gemakkelijk te imponeren, maar dit is wel iets. Zes klimmers in de top tien én beide jokers raak — dat is professionalisme van de hoogste orde. Drieënnegentig procent van de apen achter u laten, da's geen geluk, da's voorbereiding en lef. Dáár betaal ik voor — chapeau.","ploegKarakterisering":"Je ploeg schittert: chapeau, en doorgaan."}`;

// ─── Anthropic call ─────────────────────────────────────────────────────────

async function callAnthropic(userPrompt: string): Promise<{ directeursAnalyse: string; ploegKarakterisering: string }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY niet ingesteld in env");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("Geen tekst in Anthropic-antwoord");

  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Kon JSON niet parsen: ${text.slice(0, 200)}`);
  }
  if (typeof parsed.directeursAnalyse !== "string" || typeof parsed.ploegKarakterisering !== "string") {
    throw new Error("JSON mist velden directeursAnalyse/ploegKarakterisering");
  }
  return {
    directeursAnalyse: parsed.directeursAnalyse.trim(),
    ploegKarakterisering: parsed.ploegKarakterisering.trim(),
  };
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildUserPrompt(input: any): string {
  const score = input.score?.toFixed?.(1) ?? "?";
  const ranking = input.components?.poolRanking;
  const monkey = input.components?.monkeyVergelijking;
  const joker = input.components?.jokerPrestatie;
  const stage = input.stage ?? {};
  const ep = input.etappePrestatie ?? {};
  const hc = input.horsCategorieScores ?? {};
  const recentScores: number[] = Array.isArray(input.trend?.laatsteVijfEtappes) ? input.trend.laatsteVijfEtappes : [];

  const lines: string[] = [];
  lines.push(`EINDCIJFER: ${score} / 10`);
  if (stage.nummer) lines.push(`ETAPPE: ${stage.nummer}${stage.beschrijving ? ` — ${stage.beschrijving}` : ""}${stage.type ? ` (${stage.type})` : ""}`);
  if (input.deelnemer?.ploegnaam) lines.push(`PLOEGNAAM: ${input.deelnemer.ploegnaam}`);

  lines.push("");
  lines.push("RAPPORT-COMPONENTEN:");
  if (ranking) lines.push(`  Pool Ranking (50%): rang ${ranking.rang}/${ranking.totaalDeelnemers} → score ${ranking.score?.toFixed?.(1) ?? "?"}/10`);
  if (monkey) lines.push(`  Monkey Vergelijking (30%): ${monkey.percentageVerslagen ?? "?"}% apen verslagen → score ${monkey.score?.toFixed?.(1) ?? "?"}/10`);
  if (joker) lines.push(`  Joker Prestatie (20%): ${joker.aantalJokers ?? 0} jokers → score ${joker.score?.toFixed?.(1) ?? "?"}/10`);

  lines.push("");
  lines.push("ETAPPE-PRESTATIE:");
  if (typeof ep.dagPositie === "number") lines.push(`  Dagpositie: ${ep.dagPositie}, ${ep.dagPunten ?? 0} pt vandaag`);
  if (Array.isArray(ep.gescoordeRenners) && ep.gescoordeRenners.length) lines.push(`  Scoorders: ${ep.gescoordeRenners.join(", ")}`);
  if (Array.isArray(ep.gemistRenners) && ep.gemistRenners.length) lines.push(`  Belangrijke gemiste renners: ${ep.gemistRenners.join(", ")}`);
  if (Array.isArray(ep.jokerRenners) && ep.jokerRenners.length) lines.push(`  Jokers: ${ep.jokerRenners.join(", ")} (${ep.jokerResultaat ?? "onbekend"})`);

  if (hc.emirates || hc.monkeyIQ) {
    lines.push("");
    lines.push("HORS CATÉGORIE STATS:");
    if (hc.emirates) lines.push(`  Emirates (droomploeg): ${hc.emirates.percentage ?? "?"}% (${hc.emirates.jouwPunten ?? "?"} van ${hc.emirates.droomploegPunten ?? "?"} pt)`);
    if (hc.monkeyIQ) lines.push(`  Monkey IQ: ${hc.monkeyIQ.score ?? "?"} (${hc.monkeyIQ.interpretatie ?? "—"})`);
  }

  if (recentScores.length > 0) {
    lines.push("");
    lines.push(`TREND laatste cijfers: ${recentScores.map((n) => n.toFixed?.(1) ?? n).join(" · ")} (${input.trend?.richting ?? "stabiel"})`);
  }

  lines.push("");
  lines.push("Schrijf nu een directeursanalyse (1-2 zinnen) en ploeg-karakterisering (1 zin met \"Je ploeg [werkwoord]:\"-format) als JSON.");

  return lines.join("\n");
}

// ─── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    if (typeof body?.score !== "number") return json({ error: "score (number) required" }, 400);

    const userPrompt = buildUserPrompt(body);
    const result = await callAnthropic(userPrompt);

    return json({ ok: true, ...result, model: MODEL });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
