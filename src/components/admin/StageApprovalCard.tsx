// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileEdit, ShieldCheck, Undo2, Mic } from "lucide-react";
import { toast } from "sonner";

// Fire-and-forget: roep de Wuyts/De Cauwer-commentaargenerator aan voor deze etappe.
// Faalt stil; admin krijgt een toast met de échte error uit de response body.
async function triggerCommentary(stageId: string, force = false) {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.functions.invoke("generate-stage-commentary", {
      body: { stage_id: stageId, force },
    });
    if (error) {
      // Haal de echte error-body uit de FunctionsHttpError context op
      let detail = error.message;
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.text === "function") {
        try {
          const body = await ctx.text();
          if (body) detail = body;
        } catch { /* keep fallback */ }
      }
      throw new Error(detail);
    }
    const generated = (data as { generated?: number })?.generated ?? 0;
    const errors = (data as { errors?: Array<{ error: string }> })?.errors ?? [];
    if (generated > 0) {
      toast.success(`🎙️ Commentaar gegenereerd voor ${generated} subpoule${generated === 1 ? "" : "s"}`);
    } else if (force) {
      toast.info("Commentaargenerator klaar — geen subpoules verwerkt.");
    }
    if (errors.length > 0) {
      toast.error(`Per-subpoule fouten: ${errors[0].error}${errors.length > 1 ? ` (en ${errors.length - 1} meer)` : ""}`);
    }
  } catch (e) {
    toast.error(`Commentaargenerator faalde: ${(e as Error).message}`);
  }
}

type StageStatus = {
  id: string;
  results_status: "draft" | "pending" | "approved";
  approved_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  submitted_for_approval_at: string | null;
};

export default function StageApprovalCard({
  stageId,
  onChanged,
}: {
  stageId: string;
  onChanged?: () => void;
}) {
  const [status, setStatus] = useState<StageStatus | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!supabase || !stageId) return;
    const { data, error } = await supabase
      .from("stages")
      .select("id, results_status, approved_at, approved_by, submitted_for_approval_at, profiles:approved_by(display_name)")
      .eq("id", stageId)
      .maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      setStatus({
        id: data.id,
        results_status: (data.results_status ?? "draft") as StageStatus["results_status"],
        approved_at: data.approved_at,
        approved_by: data.approved_by,
        approved_by_name: (data as any).profiles?.display_name ?? null,
        submitted_for_approval_at: data.submitted_for_approval_at,
      });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId]);

  async function call(rpc: string, success: string) {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc(rpc, { p_stage_id: stageId });
      if (error) throw error;
      toast.success(success);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  const s = status.results_status;
  const badge =
    s === "approved" ? (
      <Badge className="bg-green-600 hover:bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" />Goedgekeurd</Badge>
    ) : s === "pending" ? (
      <Badge className="bg-orange-500 hover:bg-orange-500 gap-1"><Clock className="w-3 h-3" />In afwachting van goedkeuring</Badge>
    ) : (
      <Badge variant="secondary" className="gap-1"><FileEdit className="w-3 h-3" />Concept</Badge>
    );

  return (
    <Card className="border-primary/30">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Status uitslag</span>
              {badge}
            </div>
            {s === "approved" && status.approved_at && (
              <p className="text-xs text-muted-foreground">
                Goedgekeurd door <strong>{status.approved_by_name ?? "admin"}</strong> op{" "}
                {new Date(status.approved_at).toLocaleString("nl-NL")}
              </p>
            )}
            {s === "pending" && status.submitted_for_approval_at && (
              <p className="text-xs text-muted-foreground">
                Ingediend voor controle op {new Date(status.submitted_for_approval_at).toLocaleString("nl-NL")}
              </p>
            )}
            {s === "draft" && (
              <p className="text-xs text-muted-foreground">Niet zichtbaar voor deelnemers tot fiat.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {s === "draft" && (
              <Button
                disabled={busy}
                onClick={() => call("submit_stage_for_approval", "Ingediend voor goedkeuring")}
              >
                <Clock className="w-4 h-4 mr-2" />Klaar voor controle
              </Button>
            )}
            {s === "pending" && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => call("revert_stage_to_draft", "Teruggezet naar concept")}
                >
                  <Undo2 className="w-4 h-4 mr-2" />Terug naar concept
                </Button>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm("Uitslag fiatteren? De punten worden direct herberekend en zichtbaar voor alle deelnemers.")) return;
                    await call("approve_stage_results", "Uitslag gefiatteerd en gepubliceerd");
                    // Trigger Wuyts/De Cauwer-commentaargenerator (async, niet-blokkerend voor admin)
                    void triggerCommentary(stageId, false);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />Fiatteren
                </Button>
              </>
            )}
            {s === "approved" && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm("Wuyts/De Cauwer-commentaar opnieuw genereren voor alle subpoules? Overschrijft bestaand commentaar.")) return;
                    setBusy(true);
                    await triggerCommentary(stageId, true);
                    setBusy(false);
                  }}
                  className="border-[hsl(var(--vintage-gold))] text-[hsl(var(--vintage-gold))]"
                >
                  <Mic className="w-4 h-4 mr-2" />Commentaar regenereren
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (!confirm("Goedkeuring intrekken? De uitslag verdwijnt voor deelnemers en de punten worden gewist.")) return;
                    call("revoke_stage_approval", "Goedkeuring ingetrokken");
                  }}
                >
                  <Undo2 className="w-4 h-4 mr-2" />Goedkeuring intrekken
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
