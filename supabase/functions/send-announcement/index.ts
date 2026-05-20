// Stuurt een aangepast bericht naar alle deelnemers van een koers (of alle koersen).
// Admin-only. Filtert uitgeschreven adressen. Voegt persoonlijke uitschrijflink toe.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAIL_WORKER = "https://koerspoule-mail.luuk-loohuis.workers.dev";
const BASE_URL = "https://koerspoule.nl";
const LOGO_URL = "https://cdn.jsdelivr.net/gh/LuukLoohuis/koerspoule-2026@main/public/koerspoule-badge.png";

function buildHtml(
  body: string,
  unsubscribeUrl: string,
  _titleColor = "#1a1a1a",
  _titleSize = 11
): string {
  const datum = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Koerspoule</title></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:'Times New Roman',Times,serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f1ea;padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#fbfaf6;border-collapse:collapse;">
        <tr><td style="padding:56px 56px 14px 56px;">
          <div style="font-family:'Times New Roman',Times,serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#6b6357;border-bottom:1px solid #d9d2c2;padding-bottom:12px;">
            Koerspoule &nbsp;·&nbsp; Communiqué &nbsp;·&nbsp; ${datum}
          </div>
        </td></tr>
        <tr><td style="padding:24px 56px 48px 56px;font-family:'Times New Roman',Times,serif;font-size:16px;line-height:1.75;color:#1a1a1a;">
          ${body}
        </td></tr>
        <tr><td style="padding:0 56px 40px 56px;">
          <div style="font-family:'Times New Roman',Times,serif;font-size:11px;color:#8a8275;border-top:1px solid #ece7da;padding-top:16px;">
            <a href="${BASE_URL}" style="color:#8a8275;text-decoration:none;">koerspoule.nl</a>
            &nbsp;·&nbsp;
            <a href="${unsubscribeUrl}" style="color:#8a8275;text-decoration:underline;">uitschrijven</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function getOrCreateToken(admin: ReturnType<typeof createClient>, email: string): Promise<string> {
  const { data: existing } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", email)
    .maybeSingle();
  if (existing?.token) return existing.token;

  const token = crypto.randomUUID().replace(/-/g, "");
  await admin.from("email_unsubscribe_tokens").insert({ token, email });
  return token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Admin auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const { subject, body, gameId, testEmail, dryRun, titleColor, titleSize } = await req.json() as {
      subject?: string;
      body?: string;
      gameId?: string;
      testEmail?: string;
      dryRun?: boolean;
      titleColor?: string;
      titleSize?: number;
    };

    const tColor = titleColor ?? "#c8102e";
    const tSize = titleSize ?? 24;

    // Test mail: stuur alleen naar testEmail, geen token/opt-out check
    if (testEmail) {
      const token = await getOrCreateToken(admin, testEmail);
      const unsubUrl = `${BASE_URL}/uitschrijven?token=${token}`;
      await fetch(MAIL_WORKER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          subject: `[TEST] ${subject ?? "Testmail Koerspoule"}`,
          html: buildHtml(body ?? "<p>Testmail</p>", unsubUrl, tColor, tSize),
        }),
      });
      return new Response(JSON.stringify({ sent: 1, total: 1 }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Haal deelnemers op (uniek per user_id)
    let entriesQuery = admin.from("entries").select("user_id").not("user_id", "is", null);
    if (gameId) entriesQuery = entriesQuery.eq("game_id", gameId);
    const { data: entries, error: entriesErr } = await entriesQuery;
    if (entriesErr) throw entriesErr;

    const userIds = [...new Set((entries ?? []).map((e: { user_id: string }) => e.user_id).filter(Boolean))];

    // Haal emails op via auth.users
    const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) throw usersErr;

    const emailMap = new Map<string, string>();
    for (const u of users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    const allEmails = userIds.map((id) => emailMap.get(id)).filter(Boolean) as string[];

    // Haal uitgeschreven adressen op
    const { data: suppressed } = await admin.from("suppressed_emails").select("email");
    const suppressedSet = new Set((suppressed ?? []).map((s: { email: string }) => s.email.toLowerCase()));

    const recipients = allEmails.filter((e) => !suppressedSet.has(e.toLowerCase()));
    const suppressedCount = allEmails.length - recipients.length;

    if (dryRun) {
      return new Response(
        JSON.stringify({ recipients_count: recipients.length, suppressed_count: suppressedCount }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Verstuur
    let sent = 0;
    const errors: string[] = [];

    await Promise.allSettled(
      recipients.map(async (email) => {
        try {
          const token = await getOrCreateToken(admin, email);
          const unsubUrl = `${BASE_URL}/uitschrijven?token=${token}`;
          const res = await fetch(MAIL_WORKER, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: email,
              subject: subject ?? "Bericht van Koerspoule",
              html: buildHtml(body ?? "", unsubUrl, tColor, tSize),
            }),
          });
          if (res.ok) sent++;
          else errors.push(`${email}: HTTP ${res.status}`);
        } catch (e) {
          errors.push(`${email}: ${e instanceof Error ? e.message : String(e)}`);
        }
      })
    );

    return new Response(
      JSON.stringify({ sent, total: recipients.length, suppressed: suppressedCount, errors: errors.slice(0, 10) }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
