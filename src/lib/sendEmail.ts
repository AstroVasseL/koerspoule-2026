const MAIL_WORKER = "https://koerspoule-mail.luuk-loohuis.workers.dev";
const LOGO_URL = "https://cdn.jsdelivr.net/gh/LuukLoohuis/koerspoule-2026@main/public/koerspoule-badge.png";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await fetch(MAIL_WORKER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch {
    // Fire-and-forget — email failure blokkeert nooit de hoofdflow
  }
}

// ── HTML templates ────────────────────────────────────────────────────────────

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

export function registratieHtml(naam: string) {
  return wrap(`
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:0 0 8px;color:#c8102e;">Welkom bij Koerspoule 🌹</h1>
    <p style="font-size:15px;line-height:1.6;margin:16px 0;">Beste ${naam},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Je account is aangemaakt. Stel nu je ploeg samen, kies je jokers en daag vrienden uit in een subpoule.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="https://koerspoule.nl/mijn-peloton" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:bold;font-size:14px;">
        Stel je ploeg samen →
      </a>
    </p>
    <p style="font-size:14px;color:#666;line-height:1.5;">Veel koersplezier,<br/>Het Koerspoule team</p>
  `);
}

export function ploegIngediendHtml(naam: string, teamName?: string | null) {
  const ploeg = teamName ? `<strong>${teamName}</strong>` : "je ploeg";
  return wrap(`
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:0 0 8px;color:#c8102e;">Ploeg ingediend ✅</h1>
    <p style="font-size:15px;line-height:1.6;margin:16px 0;">Beste ${naam},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      ${ploeg} is succesvol ingediend voor de Koerspoule. De etappes kunnen beginnen!
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="https://koerspoule.nl/mijn-peloton" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:bold;font-size:14px;">
        Bekijk je ploeg →
      </a>
    </p>
    <p style="font-size:14px;color:#666;line-height:1.5;">Veel koersplezier,<br/>Het Koerspoule team</p>
  `);
}

export function etappeAfgeslotenHtml(naam: string, stageNumber: number, stageName?: string | null) {
  const etappe = stageName ? `Rit ${stageNumber} — ${stageName}` : `Rit ${stageNumber}`;
  return wrap(`
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:0 0 8px;color:#c8102e;">Uitslag gepubliceerd 🏁</h1>
    <p style="font-size:15px;line-height:1.6;margin:16px 0;">Beste ${naam},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      De uitslag van <strong>${etappe}</strong> is gepubliceerd. Bekijk je punten en de tussenstand.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="https://koerspoule.nl/uitslagen" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:bold;font-size:14px;">
        Bekijk uitslagen →
      </a>
    </p>
    <p style="font-size:14px;color:#666;line-height:1.5;">Veel koersplezier,<br/>Het Koerspoule team</p>
  `);
}
