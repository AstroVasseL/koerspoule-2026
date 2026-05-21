// Edge Function: generate-stage-commentary
// POST { stage_id: string, subpoule_id?: string, force?: boolean }
//
// Genereert per subpoule een commentaar in de stijl van Michel Wuyts & José De Cauwer
// op basis van de daguitslag en klassementsverschuivingen, en slaat het op in
// `etappe_commentaren`. Idempotent (UPSERT). Roep aan vanuit de admin-UI nadat een
// etappe is gefiatteerd.
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

// ─── Stijlgids + few-shot voor Wuyts/De Cauwer ──────────────────────────────
const SYSTEM_PROMPT = `Je bent twee Vlaamse wielercommentatoren in dialoog: **Michel Wuyts** en **José De Cauwer**. Je schrijft commentaar op een fantasy-wielerpoule waarin DEELNEMERS (geen renners) tegen elkaar strijden. De deelnemers scoren punten doordat de renners die zij gekozen hebben goed presteren in de echte etappe.

STIJL:
- Levendig, dramatisch, sportcommentaartaal: "slaat zijn slag", "verwijst naar plek 2", "klopt op de meet", "is de baas met".
- Korte krachtige zinnen, uitroeptekens bij hoogtepunten.
- Nederlands/Vlaams wielerjargon: "dagzilver", "dagbrons", "wipt over X heen", "stuivertje wisselen", "remontada", "off-day", "kemphanen", "klassementsleider".
- Bijnamen blijven informeel; spelersnamen exact overnemen uit de input.
- Drama en spanning: "nagelbijtend spannend", "alles is nog mogelijk", "het blijft koersen".
- Soms ironie of humor.

ROLVERDELING — schrijf BEIDEN, elk 2–4 zinnen:
- **Michel Wuyts** (veld \`michelWuyts\`): dramatisch, gepassioneerd, focus op de DAGUITSLAG. Korte krachtige zinnen, veel energie. Begin niet altijd hetzelfde — varieer.
- **José De Cauwer** (veld \`joseDeCauwer\`): analytischer, focus op het KLASSEMENT. Getallen, tactiek, langetermijngevolgen. Beschouwender van toon.

REGELS:
1. Gebruik UITSLUITEND de namen, getallen en feiten uit de input. Verzin geen deelnemers, renners of punten.
2. Spelersnamen letterlijk overnemen zoals ze in de input staan (informele bijnamen incl.).
3. Detecteer en benoem bijzonderheden:
   - Deelnemer met 0 punten → "off-day" / "zwarte dag"
   - Grote sprong (≥4 plekken in klassement) → "remontada" / "wipt over X heen"
   - Klein verschil aan de top (<10 punten) → "nagelbijtend spannend"
   - Speler valt van podium → "duikelt van het podium af"
   - Speler komt op podium → "beklimt het podium"
4. Output: STRIKT één geldig JSON-object met exact deze twee velden: \`michelWuyts\` (string), \`joseDeCauwer\` (string). Geen markdown, geen toelichting, geen extra velden, geen wrapping in code fences.

VOORBEELDEN (toon en lengte):

Voorbeeld A — Normale etappe, klein verschil aan de top:
{"michelWuyts":"Pijke pakt de dagzege op weg naar La Plagne! Met Pogi, Vingegaard en MvdP verwijst hij Koen naar plek 2. Hiermee slaat hij een dubbelslag — wat een knaller!","joseDeCauwer":"Klassementsleider Koen behoudt de leiding, maar ziet Pijke tot op 27 punten naderen. Ploffel duikelt van het podium af, Roel beklimt 'm. Het blijft stuivertje wisselen bovenin — alles is nog mogelijk."}

Voorbeeld B — Tijdrit, dagzege en klassementsbeweging:
{"michelWuyts":"Johannes klopt op de meet en pakt de dagzege! Blijkbaar heeft hij van veel dingen geen verstand, maar wel van tijdrijden. APP en CRod schoten over de finish — drie poppetjes, drie keer raak.","joseDeCauwer":"Met deze zege loopt Johannes 18 punten in op leider Bart. Het verschil aan de top is gekrompen tot zes schamele puntjes. Roel is bezig met een heuse remontada — vier plekken erbij. Nagelbijtend wordt het."}

Voorbeeld C — Eerste etappe (geen voor-klassement):
{"michelWuyts":"En de openingsetappe is van Koen! Met een sublieme keuze voor Philipsen en Pedersen pakt hij de dagzilver en dagbrons in één klap. Pijke en Bart kijken toe vanuit plek 4 en 5.","joseDeCauwer":"Eerste klassement is een feit: Koen aan kop met 96 punten, Johannes volgt op vier punten, Pijke maakt het podium compleet. Lang verhaal kort: alles is nog open, maar Koen heeft de eerste schermutseling gewonnen."}

Voorbeeld D — Speler met off-day:
{"michelWuyts":"Bart slaat zijn slag op weg naar de Tourmalet! Hij pakt de dagzege voor de neuzen van Pijke en Koen. Roel daarentegen kent een zwarte dag — nul punten, het kan verkeren.","joseDeCauwer":"Bart wipt naar plek 2 in het klassement, slechts 12 punten achter leider Pijke. Roel zakt twee plekken weg na zijn off-day. Het peloton in deze subpoule blijft compact — niemand mag steken laten vallen."}`;

// ─── Types ──────────────────────────────────────────────────────────────────

type SubpouleMember = {
  user_id: string;
  display_name: string | null;
  team_name: string | null;
  entry_id: string;
  stagePoints: number;
  pointsBefore: number;
  pointsAfter: number;
  scoredRiders: Array<{ name: string; position: number; isJoker: boolean }>;
};

type CommentaryResult = { michelWuyts: string; joseDeCauwer: string };

// ─── Anthropic call met prompt caching ─────────────────────────────────────

async function callAnthropic(userPrompt: string): Promise<CommentaryResult> {
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

  // Probeer JSON eruit te parsen (eventueel zit er wrap omheen ondanks instructies)
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Kon JSON niet parsen: ${text.slice(0, 200)}`);
  }
  if (typeof parsed.michelWuyts !== "string" || typeof parsed.joseDeCauwer !== "string") {
    throw new Error("JSON mist velden michelWuyts/joseDeCauwer");
  }
  return { michelWuyts: parsed.michelWuyts.trim(), joseDeCauwer: parsed.joseDeCauwer.trim() };
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildUserPrompt(opts: {
  subpouleNaam: string;
  stageNumber: number;
  stageName: string | null;
  stageType: string | null;
  isFirstStage: boolean;
  isLastStage: boolean;
  members: SubpouleMember[];
}): string {
  const { subpouleNaam, stageNumber, stageName, stageType, isFirstStage, isLastStage, members } = opts;

  // Daguitslag (sort by stagePoints desc), klassement voor en na
  const dag = [...members].sort((a, b) => b.stagePoints - a.stagePoints);
  const voor = [...members].sort((a, b) => b.pointsBefore - a.pointsBefore);
  const na = [...members].sort((a, b) => b.pointsAfter - a.pointsAfter);
  const rankBefore = new Map(voor.map((m, i) => [m.entry_id, i + 1]));
  const rankAfter = new Map(na.map((m, i) => [m.entry_id, i + 1]));

  const dagLines = dag.map((m, i) => {
    const renners = m.scoredRiders.length === 0
      ? "geen renners in top 20"
      : m.scoredRiders
          .map((r) => `${r.name}${r.isJoker ? " (joker)" : ""} P${r.position}`)
          .join(", ");
    return `${i + 1}. ${m.display_name || "?"} — ${m.stagePoints} pt | scoorders: ${renners}`;
  }).join("\n");

  const voorLines = voor.slice(0, 6).map((m, i) =>
    `${i + 1}. ${m.display_name || "?"} — ${m.pointsBefore} pt`
  ).join("\n");

  const naLines = na.slice(0, 6).map((m, i) => {
    const before = rankBefore.get(m.entry_id) ?? "?";
    const delta = typeof before === "number" ? before - (i + 1) : 0;
    const movement = delta > 0 ? ` (▲${delta})` : delta < 0 ? ` (▼${-delta})` : "";
    return `${i + 1}. ${m.display_name || "?"} — ${m.pointsAfter} pt${movement}`;
  }).join("\n");

  const leider = na[0];
  const tweede = na[1];
  const topGap = leider && tweede ? leider.pointsAfter - tweede.pointsAfter : null;

  const contextRegels: string[] = [];
  if (isFirstStage) contextRegels.push("Dit is de OPENINGSETAPPE — er is geen klassement van vóór deze etappe.");
  if (isLastStage) contextRegels.push("Dit is de LAATSTE ETAPPE — José schrijft een eindconclusie i.p.v. een vooruitblik.");
  if (topGap !== null && topGap < 10) contextRegels.push(`Slechts ${topGap} punten verschil aan de top.`);

  return `Subpoule: "${subpouleNaam}"
Etappe ${stageNumber}${stageName ? ` — ${stageName}` : ""}${stageType ? ` (${stageType})` : ""}

${contextRegels.length > 0 ? "Context: " + contextRegels.join(" ") + "\n\n" : ""}DAGUITSLAG (deze subpoule):
${dagLines}

${isFirstStage ? "" : `KLASSEMENT VOOR DEZE ETAPPE:\n${voorLines}\n\n`}KLASSEMENT NA DEZE ETAPPE:
${naLines}

Schrijf nu het commentaar als JSON met velden michelWuyts en joseDeCauwer (2-4 zinnen elk). Geen markdown, geen toelichting.`;
}

// ─── Subpoule context ophalen ───────────────────────────────────────────────

async function fetchSubpouleContext(
  admin: ReturnType<typeof createClient>,
  stageId: string,
  gameId: string,
  stageNumber: number,
  subpouleId: string,
): Promise<SubpouleMember[]> {
  // 1. Subpoule members (FK gaat naar auth.users, dus profiles los ophalen)
  const { data: memberRows, error: memErr } = await admin
    .from("subpoule_members")
    .select("user_id")
    .eq("subpoule_id", subpouleId);
  if (memErr) throw memErr;
  const userIds = (memberRows ?? []).map((r: any) => r.user_id as string);
  if (userIds.length === 0) return [];

  // 1b. Profiles los ophalen (display_name)
  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  const displayByUser = new Map<string, string>();
  for (const p of (profileRows ?? []) as Array<{ id: string; display_name: string | null }>) {
    if (p.display_name) displayByUser.set(p.id, p.display_name);
  }

  // 2. Entries van deze users in deze game
  const { data: entryRows, error: entErr } = await admin
    .from("entries")
    .select("id, user_id, team_name")
    .eq("game_id", gameId)
    .in("user_id", userIds);
  if (entErr) throw entErr;
  const entries = (entryRows ?? []) as Array<{ id: string; user_id: string; team_name: string | null }>;
  if (entries.length === 0) return [];
  const entryIds = entries.map((e) => e.id);

  // 3. Approved stages t/m deze etappe
  const { data: stageRows, error: stErr } = await admin
    .from("stages")
    .select("id, stage_number")
    .eq("game_id", gameId)
    .eq("results_status", "approved")
    .lte("stage_number", stageNumber)
    .order("stage_number");
  if (stErr) throw stErr;
  const stageIds = (stageRows ?? []).map((s: any) => s.id);

  // 4. Stage points voor alle relevante entries × stages
  const { data: spRows, error: spErr } = await admin
    .from("stage_points")
    .select("entry_id, stage_id, points")
    .in("entry_id", entryIds)
    .in("stage_id", stageIds.length > 0 ? stageIds : [stageId]);
  if (spErr) throw spErr;
  const spByEntry = new Map<string, Map<string, number>>();
  for (const r of (spRows ?? []) as any[]) {
    if (!spByEntry.has(r.entry_id)) spByEntry.set(r.entry_id, new Map());
    spByEntry.get(r.entry_id)!.set(r.stage_id, r.points);
  }

  // 5. Picks (welke renners hebben ze gekozen)
  const { data: picksRows, error: pErr } = await admin
    .from("entry_picks")
    .select("entry_id, rider_id, riders(name)")
    .in("entry_id", entryIds);
  if (pErr) throw pErr;
  const picksByEntry = new Map<string, Array<{ rider_id: string; name: string }>>();
  for (const r of (picksRows ?? []) as any[]) {
    if (!picksByEntry.has(r.entry_id)) picksByEntry.set(r.entry_id, []);
    picksByEntry.get(r.entry_id)!.push({ rider_id: r.rider_id, name: r.riders?.name ?? "?" });
  }

  // 6. Jokers
  const { data: jokerRows, error: jErr } = await admin
    .from("entry_jokers")
    .select("entry_id, rider_id")
    .in("entry_id", entryIds);
  if (jErr) throw jErr;
  const jokersByEntry = new Map<string, Set<string>>();
  for (const r of (jokerRows ?? []) as any[]) {
    if (!jokersByEntry.has(r.entry_id)) jokersByEntry.set(r.entry_id, new Set());
    jokersByEntry.get(r.entry_id)!.add(r.rider_id);
  }

  // 7. Stage results voor deze etappe (top 20 alleen)
  const { data: srRows, error: srErr } = await admin
    .from("stage_results")
    .select("rider_id, rider_name, finish_position")
    .eq("stage_id", stageId)
    .lte("finish_position", 20);
  if (srErr) throw srErr;
  const srByRider = new Map<string, { name: string; position: number }>();
  for (const r of (srRows ?? []) as any[]) {
    if (r.rider_id) srByRider.set(r.rider_id, { name: r.rider_name, position: r.finish_position });
  }

  // 8. Bouw per entry
  return entries.map((e) => {
    const spMap = spByEntry.get(e.id) ?? new Map();
    let pointsBefore = 0;
    let pointsAfter = 0;
    let stagePoints = 0;
    for (const [sid, pts] of spMap) {
      pointsAfter += pts;
      if (sid === stageId) stagePoints = pts;
      else pointsBefore += pts;
    }
    const myPicks = picksByEntry.get(e.id) ?? [];
    const myJokers = jokersByEntry.get(e.id) ?? new Set();
    const scoredRiders = myPicks
      .map((p) => {
        const hit = srByRider.get(p.rider_id);
        if (!hit) return null;
        return { name: p.name || hit.name, position: hit.position, isJoker: myJokers.has(p.rider_id) };
      })
      .filter((x): x is { name: string; position: number; isJoker: boolean } => Boolean(x))
      .sort((a, b) => a.position - b.position);

    const teamName = e.team_name?.trim() || displayByUser.get(e.user_id)?.trim() || "Naamloze ploeg";
    return {
      user_id: e.user_id,
      display_name: teamName,
      team_name: e.team_name,
      entry_id: e.id,
      stagePoints,
      pointsBefore,
      pointsAfter,
      scoredRiders,
    };
  });
}

// ─── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const callerUserId = userData.user.id;
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: callerUserId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json() as { stage_id?: string; subpoule_id?: string; force?: boolean };
    const stageId = body.stage_id;
    if (!stageId || typeof stageId !== "string") return json({ error: "stage_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Etappe info
    const { data: stage, error: stageErr } = await admin
      .from("stages")
      .select("id, game_id, stage_number, name, stage_type, results_status")
      .eq("id", stageId)
      .single();
    if (stageErr || !stage) return json({ error: "stage not found" }, 404);
    if (stage.results_status !== "approved") {
      return json({ error: "stage not approved yet" }, 400);
    }

    // Bepaal of het de eerste of laatste etappe is
    const { data: allStagesInGame } = await admin
      .from("stages")
      .select("stage_number, results_status")
      .eq("game_id", stage.game_id)
      .order("stage_number");
    const stageNumbers = (allStagesInGame ?? []).map((s: any) => s.stage_number as number);
    const isFirstStage = stage.stage_number === Math.min(...stageNumbers);
    const isLastStage = stage.stage_number === Math.max(...stageNumbers);

    // Subpoules om voor te genereren
    let subpouleQuery = admin
      .from("subpoules")
      .select("id, name")
      .eq("game_id", stage.game_id);
    if (body.subpoule_id) subpouleQuery = subpouleQuery.eq("id", body.subpoule_id);
    const { data: subpoules, error: spErr } = await subpouleQuery;
    if (spErr) throw spErr;
    if (!subpoules || subpoules.length === 0) {
      return json({ ok: true, generated: 0, skipped: 0, message: "Geen subpoules voor deze game" });
    }

    // Skip subpoules die al een commentaar hebben (tenzij force)
    let existing = new Set<string>();
    if (!body.force) {
      const { data: existRows } = await admin
        .from("etappe_commentaren")
        .select("subpoule_id")
        .eq("stage_id", stageId)
        .in("subpoule_id", subpoules.map((s: any) => s.id));
      for (const r of (existRows ?? []) as any[]) existing.add(r.subpoule_id);
    }

    let generated = 0;
    let skipped = 0;
    const errors: Array<{ subpoule_id: string; error: string }> = [];

    for (const sp of subpoules as Array<{ id: string; name: string }>) {
      if (existing.has(sp.id)) { skipped++; continue; }
      try {
        const members = await fetchSubpouleContext(admin, stageId, stage.game_id, stage.stage_number, sp.id);
        if (members.length === 0) { skipped++; continue; }

        const userPrompt = buildUserPrompt({
          subpouleNaam: sp.name,
          stageNumber: stage.stage_number,
          stageName: stage.name ?? null,
          stageType: (stage as any).stage_type ?? null,
          isFirstStage,
          isLastStage,
          members,
        });

        const result = await callAnthropic(userPrompt);

        const { error: upErr } = await admin
          .from("etappe_commentaren")
          .upsert(
            {
              stage_id: stageId,
              subpoule_id: sp.id,
              michel_tekst: result.michelWuyts,
              jose_tekst: result.joseDeCauwer,
              model: MODEL,
              generated_by: callerUserId,
              generated_at: new Date().toISOString(),
            },
            { onConflict: "stage_id,subpoule_id" },
          );
        if (upErr) throw upErr;
        generated++;
      } catch (e) {
        errors.push({ subpoule_id: sp.id, error: (e as Error).message });
      }
    }

    return json({ ok: true, generated, skipped, errors });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
