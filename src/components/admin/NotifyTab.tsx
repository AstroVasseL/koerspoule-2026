import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Mail, Send, Loader2, Eye, EyeOff, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Game = { id: string; name: string; year: number | null };

const LOGO_URL = "https://koerspoule.nl/koerspoule-badge.png";

const DEFAULT_BODY = `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Beste deelnemer,</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
  Schrijf hier je bericht...
</p>
<p style="font-size:14px;color:#666;line-height:1.5;">Veel koersplezier,<br/>Het Koerspoule team</p>`;

export function buildEmailHtml(
  body: string,
  unsubscribeUrl: string,
  opts: { titleColor: string; titleSize: number }
): string {
  return `<!doctype html>
<html><body style="margin:0;background:#faf7f2;font-family:Georgia,serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;border:1px solid #e8e0d5;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${LOGO_URL}" alt="Koerspoule" width="72" height="72"
           style="display:block;margin:0 auto 10px;border-radius:8px;" />
      <span style="font-family:'Times New Roman',Times,serif;font-size:${opts.titleSize}px;font-weight:700;color:${opts.titleColor};letter-spacing:0.06em;display:block;">KOERSPOULE</span>
    </div>
    ${body}
    <hr style="border:none;border-top:1px solid #ede8df;margin:32px 0 16px;"/>
    <p style="font-size:11px;color:#999;text-align:center;margin:0;">
      Koerspoule &nbsp;·&nbsp;
      <a href="https://koerspoule.nl" style="color:#999;">koerspoule.nl</a>
      &nbsp;·&nbsp;
      <a href="${unsubscribeUrl}" style="color:#999;">Uitschrijven</a>
    </p>
  </div>
</body></html>`;
}

function buildPreviewHtml(body: string, titleColor: string, titleSize: number) {
  return buildEmailHtml(body, "#", { titleColor, titleSize });
}

export default function NotifyTab() {
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState<string>("all");
  const [subject, setSubject] = useState("Bericht van Koerspoule");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [titleColor, setTitleColor] = useState("#c8102e");
  const [titleSize, setTitleSize] = useState(24);
  const [testEmail, setTestEmail] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{ recipients: number; suppressed: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("games").select("id, name, year").order("year", { ascending: false }).then(({ data }) => {
      setGames((data ?? []) as Game[]);
    });
  }, []);

  useEffect(() => {
    if (showPreview && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(buildPreviewHtml(body, titleColor, titleSize));
        doc.close();
      }
    }
  }, [showPreview, body, titleColor, titleSize]);

  async function runDryRun() {
    if (!supabase) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-announcement", {
      body: { subject, body, gameId: gameId === "all" ? undefined : gameId, dryRun: true },
    });
    setSending(false);
    if (error) { toast.error(`Fout: ${error.message}`); return; }
    const r = data as { recipients_count: number; suppressed_count: number };
    setDryRunResult({ recipients: r.recipients_count ?? 0, suppressed: r.suppressed_count ?? 0 });
    setConfirmOpen(true);
  }

  async function sendTest() {
    if (!supabase || !testEmail.trim()) return;
    setSending(true);
    const { error } = await supabase.functions.invoke("send-announcement", {
      body: { subject, body, titleColor, titleSize, testEmail: testEmail.trim() },
    });
    setSending(false);
    if (error) toast.error(`Testmail mislukt: ${error.message}`);
    else toast.success(`Testmail verstuurd naar ${testEmail}`);
  }

  async function sendForReal() {
    if (!supabase) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-announcement", {
      body: { subject, body, titleColor, titleSize, gameId: gameId === "all" ? undefined : gameId },
    });
    setSending(false);
    setConfirmOpen(false);
    if (error) { toast.error(`Verzenden mislukt: ${error.message}`); return; }
    const r = data as { sent: number; total: number };
    toast.success(`${r?.sent ?? 0} van ${r?.total ?? 0} mails verstuurd`);
  }

  const selectedGameName = gameId === "all"
    ? "Alle deelnemers"
    : games.find((g) => g.id === gameId)?.name ?? gameId;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" /> Bericht aan deelnemers
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Schrijf een bericht en verstuur het naar alle deelnemers van een koers. Deelnemers kunnen zichzelf uitschrijven via de link in de mail.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Game selector */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Ontvangers
            </Label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een koers…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle deelnemers (alle koersen)</SelectItem>
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}{g.year ? ` (${g.year})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Onderwerp</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Onderwerp van de mail…" />
          </div>

          {/* Header style controls */}
          <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
            <h3 className="text-sm font-semibold">Header-stijl (KOERSPOULE tekst)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Kleur</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className="h-9 w-14 rounded border cursor-pointer p-0.5"
                  />
                  <Input
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className="font-mono text-xs h-9"
                    maxLength={9}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Lettergrootte — <span className="font-mono font-bold">{titleSize}px</span>
                </Label>
                <Slider
                  min={14}
                  max={48}
                  step={1}
                  value={[titleSize]}
                  onValueChange={([v]) => setTitleSize(v)}
                  className="mt-3"
                />
              </div>
            </div>
            {/* Live mini-preview of header */}
            <div className="border rounded bg-white p-3 text-center">
              <img src="/koerspoule-badge.png" alt="" width={40} height={40} className="mx-auto mb-1.5 rounded" />
              <span style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: titleSize * 0.55, color: titleColor, fontWeight: 700, letterSpacing: "0.06em" }}>
                KOERSPOULE
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Inhoud (HTML)</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview((v) => !v)} className="text-xs h-7">
                {showPreview ? <><EyeOff className="w-3 h-3 mr-1" />Bewerk</> : <><Eye className="w-3 h-3 mr-1" />Preview</>}
              </Button>
            </div>
            {!showPreview ? (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                placeholder="<p>Schrijf hier je bericht in HTML...</p>"
              />
            ) : (
              <div className="border rounded-md overflow-hidden">
                <iframe
                  ref={iframeRef}
                  title="E-mail preview"
                  className="w-full"
                  style={{ height: 480, border: "none" }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Gebruik HTML-opmaak. Het logo, de header en uitschrijflink worden automatisch toegevoegd.
            </p>
          </div>

          {/* Test email */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <h3 className="text-sm font-semibold">Testmail verzenden</h3>
            <div className="flex gap-2">
              <Input
                placeholder="jouw@email.nl"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={sendTest} disabled={sending || !testEmail.trim()}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="ml-2">Test</span>
              </Button>
            </div>
          </div>

          {/* Send button */}
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={runDryRun}
            disabled={sending || !subject.trim() || !body.trim()}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Versturen naar {selectedGameName}…
          </Button>

        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bericht versturen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Je staat op het punt een mail te sturen naar{" "}
                  <strong>{dryRunResult?.recipients ?? 0} deelnemers</strong> van{" "}
                  <strong>{selectedGameName}</strong>.
                </p>
                {(dryRunResult?.suppressed ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded p-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{dryRunResult!.suppressed} adres(sen) overgeslagen (uitgeschreven).</span>
                  </div>
                )}
                <div className="bg-muted/40 rounded p-2 text-sm">
                  <span className="text-muted-foreground">Onderwerp: </span>
                  <em>"{subject}"</em>
                </div>
                <p className="text-sm font-medium text-destructive">Dit kan niet ongedaan worden gemaakt.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={sendForReal} disabled={sending}>
              {sending ? "Verzenden…" : `Ja, verzend naar ${dryRunResult?.recipients ?? 0} deelnemers`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="shrink-0 mt-0.5">Info</Badge>
            <p>
              Mails worden verstuurd via <code>koerspoule-mail.luuk-loohuis.workers.dev</code>.
              Elke mail bevat een persoonlijke uitschrijflink. Uitgeschreven deelnemers ontvangen geen toekomstige mailings meer.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
