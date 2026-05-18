// @ts-nocheck
// Edge function: rider-stats
// Fetches a rider's 2026 season results from firstcycling.com and caches them.
// POST body: { fc_id: number }           → return season results
// POST body: { name: string }            → search riders by name (for admin matching)

import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "Mozilla/5.0 (compatible; KoerspouleBot/1.0)";
const SEASON = 2026;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let fc_id: number | null = null;
  let name: string | null = null;

  try {
    const body = await req.json();
    fc_id = body.fc_id ? Number(body.fc_id) : null;
    name = typeof body.name === "string" ? body.name.trim() : null;
  } catch {
    return respond({ error: "invalid JSON body" }, 400);
  }

  if (!fc_id && !name) {
    return respond({ error: "fc_id or name required" }, 400);
  }

  // ── Name search mode ────────────────────────────────────────────────────────
  if (name) {
    const results = await searchByName(name);
    return respond(results);
  }

  // ── Stats mode ──────────────────────────────────────────────────────────────
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check cache
  const { data: cached } = await sb
    .from("rider_results_cache")
    .select("*")
    .eq("firstcycling_id", fc_id)
    .eq("season", SEASON)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at).getTime();
    if (age < CACHE_TTL_MS) {
      return respond(cached, 200, { "X-Cache": "HIT" });
    }
  }

  // Fetch fresh data
  const fresh = await fetchRiderStats(fc_id);

  if (fresh) {
    await sb.from("rider_results_cache").upsert({
      firstcycling_id: fc_id,
      season: SEASON,
      rider_name: fresh.rider_name,
      rider_team: fresh.rider_team,
      rider_nationality: fresh.rider_nationality,
      results: fresh.results,
      cached_at: new Date().toISOString(),
    });
  }

  return respond(fresh ?? { firstcycling_id: fc_id, rider_name: "", rider_team: "", rider_nationality: "", results: [] });
});

function respond(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", ...extra },
  });
}

// ── FirstCycling fetcher & parser ───────────────────────────────────────────

async function fetchRiderStats(fcId: number) {
  try {
    const res = await fetch(
      `https://firstcycling.com/rider.php?r=${fcId}&y=${SEASON}`,
      { headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    return parseRiderPage(await res.text(), fcId);
  } catch (err) {
    console.error("FirstCycling fetch error:", err);
    return null;
  }
}

function parseRiderPage(html: string, fcId: number) {
  // Rider name from <title> e.g. "Tadej Pogačar - FirstCycling"
  const titleMatch = html.match(/<title>([^<]+?)\s*[-–]\s*FirstCycling/i);
  const riderName = titleMatch?.[1]?.trim() ?? "";

  // Nationality flag e.g. /images/flags/SI.png
  const natMatch = html.match(/\/(?:images\/)?flags\/([A-Z]{2,3})\.(?:png|svg)/i);
  const riderNationality = natMatch?.[1]?.toUpperCase() ?? "";

  // Current team link
  const teamMatch = html.match(/team\.php[^"]*"[^>]*>([^<]+)<\/a>/);
  const riderTeam = teamMatch?.[1]?.trim() ?? "";

  // Parse results table rows
  const results: Array<{
    date: string;
    race: string;
    race_url: string;
    category: string;
    result: string;
    stage: string | null;
  }> = [];

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    if (/<th[\s>]/i.test(row)) continue; // Skip header rows

    const cells = extractCells(row);
    if (cells.length < 5) continue;

    // First cell must look like DD.MM (day.month)
    const dateText = stripTags(cells[0]).trim();
    if (!/^\d{2}\.\d{2}$/.test(dateText)) continue;

    // Find race cell: first cell with <a href="race.php...">
    let raceName = "";
    let raceUrl = "";
    let raceCellIdx = -1;
    for (let i = 1; i < cells.length; i++) {
      const m = cells[i].match(/href="(race\.php[^"]+)"[^>]*>([\s\S]+?)<\/a>/);
      if (m) {
        raceUrl = `https://firstcycling.com/${m[1]}`;
        raceName = stripTags(m[2]).trim();
        raceCellIdx = i;
        break;
      }
    }
    if (!raceName) continue;

    // Category: cell right after race cell
    const category =
      raceCellIdx + 1 < cells.length
        ? stripTags(cells[raceCellIdx + 1]).trim()
        : "";

    // Result: last non-empty, non-decoration cell (walk backwards)
    let result = "";
    for (let i = cells.length - 1; i >= 0; i--) {
      const t = stripTags(cells[i]).trim();
      if (t && t !== "·" && t !== "-" && t.length > 0) {
        result = t;
        break;
      }
    }
    if (!result) continue;

    // Stage number: cell[1] if it's a plain integer
    const stageRaw = cells.length > 1 ? stripTags(cells[1]).trim() : "";
    const stage = /^\d+$/.test(stageRaw) ? stageRaw : null;

    // Build ISO date (results are all in SEASON so year is known)
    const day = dateText.slice(0, 2);
    const month = dateText.slice(3, 5);

    results.push({
      date: `${SEASON}-${month}-${day}`,
      race: decode(raceName),
      race_url: raceUrl,
      category,
      result,
      stage,
    });
  }

  return {
    firstcycling_id: fcId,
    rider_name: riderName,
    rider_team: riderTeam,
    rider_nationality: riderNationality,
    results,
  };
}

// ── Name search ─────────────────────────────────────────────────────────────

async function searchByName(query: string) {
  try {
    const res = await fetch(
      `https://firstcycling.com/rider.php?s=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const riders: Array<{ fc_id: number; name: string; nationality: string; team: string }> = [];

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let m: RegExpExecArray | null;
    while ((m = rowRegex.exec(html)) !== null) {
      const row = m[1];
      if (/<th[\s>]/i.test(row)) continue;
      const linkMatch = row.match(/rider\.php\?r=(\d+)[^"]*"[^>]*>([\s\S]+?)<\/a>/);
      if (!linkMatch) continue;
      const fc_id = parseInt(linkMatch[1]);
      const name = stripTags(linkMatch[2]).trim();
      if (!fc_id || !name) continue;
      const cells = extractCells(row);
      riders.push({
        fc_id,
        name: decode(name),
        nationality: cells.length > 1 ? stripTags(cells[1]).trim() : "",
        team: cells.length > 2 ? stripTags(cells[2]).trim() : "",
      });
    }
    return riders.slice(0, 8);
  } catch (err) {
    console.error("FC search error:", err);
    return [];
  }
}

// ── HTML utilities ──────────────────────────────────────────────────────────

function extractCells(rowHtml: string): string[] {
  const cells: string[] = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowHtml)) !== null) cells.push(m[1]);
  return cells;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
