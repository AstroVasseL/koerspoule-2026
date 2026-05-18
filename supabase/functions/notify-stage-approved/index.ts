// Stuurt een e-mail naar alle deelnemers van de koers wanneer een etappe is goedgekeurd.
// Roep aan vanuit de admin ApprovalsTab na approve_stage_results.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAIL_WORKER = "https://koerspoule-mail.luuk-loohuis.workers.dev";
const LOGO_URL = "https://cdn.jsdelivr.net/gh/LuukLoohuis/koerspoule-2026@main/public/koerspoule-badge.png";

function wrap(content: string) {
  return `<!doctype html>
<html><body style="margin:0;background:#faf7f2;font-family:Georgia,serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;border:1px solid #e8e0d5;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${LOGO_URL}" alt="Koerspoule" width="72" height="72"
           style="display:block;margin:0 auto 10px;border-radius:8px;" />
      <span style="font-family:'Times New Roman',Times,serif;font-size:24px;font-weight:700;color:#c8102e;letter-spacing:0.06em;display:block;">KOERSPOULE</span>
    </div>
    ${content}
    <hr style="border:none;border-top:1px solid #ede8df;margin:32px 0 16px;"/>
    <p style="font-size:11px;color:#999;text-align:center;margin:0;">
      Koerspoule · <a href="https://koerspoule.nl" style="color:#999;">koerspoule.nl</a>
    </p>
  </div>
</body></html>`;
}

function buildHtml(naam: string, stageNumber: number, stageName: string | null) {
  const etappe = stageName ? `Rit ${stageNumber} — ${stageName}` : `Rit ${stageNumber}`;
  return wrap(`
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:0 0 8px;color:#c8102e;">Uitslag gepubliceerd 🏁</h1>
    <p style="font-size:15px;line-height:1.6;margin:16px 0;">Beste ${naam},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      De uitslag van <strong>${etappe}</strong> is gepubliceerd. Bekijk je punten en de tussenstand in de poule.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="https://koerspoule.nl/uitslagen" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:bold;font-size:14px;">
        Bekijk uitslagen →
      </a>
    </p>
    <p style="font-size:14px;color:#666;line-height:1.5;">Veel koersplezier,<br/>Het Koerspoule team</p>
  `);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Controleer admin autorisatie
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const { stage_id } = await req.json() as { stage_id: string };
    if (!stage_id) {
      return new Response(JSON.stringify({ error: "stage_id verplicht" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Haal etappe-info op
    const { data: stage, error: stageErr } = await admin
      .from("stages")
      .select("stage_number, name, game_id")
      .eq("id", stage_id)
      .single();
    if (stageErr || !stage) {
      return new Response(JSON.stringify({ error: "Stage niet gevonden" }), { status: 404, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Haal alle deelnemers van de koers op (entries met user_id)
    const { data: entries, error: entriesErr } = await admin
      .from("entries")
      .select("user_id")
      .eq("game_id", stage.game_id);
    if (entriesErr) throw entriesErr;

    const userIds = [...new Set((entries ?? []).map((e: any) => e.user_id).filter(Boolean))];
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Haal e-mailadressen op via auth.users (vereist service role)
    const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) throw usersErr;

    const emailMap = new Map<string, string>();
    for (const u of users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    // Stuur e-mail naar elke deelnemer
    let sent = 0;
    await Promise.allSettled(
      userIds.map(async (uid) => {
        const email = emailMap.get(uid);
        if (!email) return;
        const naam = email.split("@")[0];
        await fetch(MAIL_WORKER, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: email,
            subject: `Uitslag rit ${stage.stage_number} gepubliceerd — Koerspoule`,
            html: buildHtml(naam, stage.stage_number, stage.name ?? null),
          }),
        });
        sent++;
      })
    );

    return new Response(JSON.stringify({ sent }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
