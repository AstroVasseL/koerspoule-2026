// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Clock, FileEdit, ShieldCheck, Undo2, RefreshCw, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

type BreakdownRow = {
  entry_id: string;
  team_name: string | null;
  display_name: string;
  total_stage_points: number;
  breakdown: Array<{
    rider_id: string;
    rider_name: string | null;
    finish_position: number | null;
    base_pts: number;
    is_joker: boolean;
    multiplier: number;
    total: number;
  }>;
};

function StageBreakdown({ stageId }: { stageId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BreakdownRow[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_stage_points_breakdown", { p_stage_id: stageId });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as BreakdownRow[]);
  }

  function onToggle(o: boolean) {
    setOpen(o);
    if (o && rows === null) load();
  }

  return (
    <Collapsible open={open} onOpenChange={onToggle} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          {open ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
          <Sparkles className="w-3 h-3 mr-1" />
          Toon puntenberekening per deelnemer
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 border rounded-md p-2 bg-muted/30">
        {loading && <p className="text-xs text-muted-foreground italic">Berekening laden…</p>}
        {!loading && rows && rows.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Geen ingediende deelnemers gevonden.</p>
        )}
        {!loading && rows && rows.length > 0 && (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {rows.map((r) => {
              const isOpen = expanded[r.entry_id] ?? false;
              return (
                <div key={r.entry_id} className="border-b last:border-0 pb-1">
                  <button
                    type="button"
                    onClick={() => setExpanded((s) => ({ ...s, [r.entry_id]: !isOpen }))}
                    className="w-full flex items-center justify-between gap-2 py-1 text-left text-sm hover:bg-muted/50 rounded px-1"
                  >
                    <span className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <strong>{r.display_name}</strong>
                      {r.team_name && <span className="text-xs text-muted-foreground">— {r.team_name}</span>}
                    </span>
                    <Badge variant="secondary">{r.total_stage_points} pt</Badge>
                  </button>
                  {isOpen && (
                    <table className="w-full text-xs mt-1 mb-2">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="py-1 pr-2">Renner</th>
                          <th className="py-1 pr-2">Finish</th>
                          <th className="py-1 pr-2">Basis</th>
                          <th className="py-1 pr-2">×</th>
                          <th className="py-1 pr-2 text-right">Totaal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.breakdown.map((b, i) => (
                          <tr key={`${b.rider_id}-${i}`} className="border-t border-muted">
                            <td className="py-0.5 pr-2">
                              {b.rider_name ?? "—"}
                              {b.is_joker && <Badge className="ml-1 text-[10px] py-0" variant="outline">Joker</Badge>}
                            </td>
                            <td className="py-0.5 pr-2">{b.finish_position ?? "—"}</td>
                            <td className="py-0.5 pr-2">{b.base_pts}</td>
                            <td className="py-0.5 pr-2">{b.multiplier}</td>
                            <td className="py-0.5 pr-2 text-right font-mono">{b.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

type Row = {
  stage_id: string;
  stage_number: number;
  stage_name: string | null;
  stage_date: string | null;
  results_status: "draft" | "pending" | "approved";
  submitted_for_approval_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
};

export default function ApprovalsTab({ activeGameId }: { activeGameId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (!supabase || !activeGameId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_pending_approvals", { p_game_id: activeGameId });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGameId]);

  async function approve(stageId: string) {
    if (!confirm("Uitslag publiceren naar deelnemers? De punten zijn al berekend; fiatteren is je controle vóór publicatie.")) return;
    setBusyId(stageId);
    const { error } = await supabase.rpc("approve_stage_results", { p_stage_id: stageId });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Uitslag gefiatteerd");
    load();
    // Trigger Wuyts/De Cauwer-commentaargenerator (async, niet-blokkerend)
    void (async () => {
      try {
        const { data, error: ge } = await supabase.functions.invoke("generate-stage-commentary", {
          body: { stage_id: stageId, force: false },
        });
        if (ge) {
          // Lees echte response body uit FunctionsHttpError.context
          let detail = ge.message;
          const ctx = (ge as { context?: Response }).context;
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
        }
        if (errors.length > 0) {
          toast.error(`Per-subpoule fouten: ${errors[0].error}${errors.length > 1 ? ` (en ${errors.length - 1} meer)` : ""}`);
        }
      } catch (e) {
        toast.error(`Commentaargenerator faalde: ${(e as Error).message}`);
      }
    })();
  }

  const pending = rows.filter((r) => r.results_status === "pending");
  const drafts = rows.filter((r) => r.results_status === "draft");
  const approved = rows.filter((r) => r.results_status === "approved");

  function StatusBadge({ s }: { s: Row["results_status"] }) {
    if (s === "approved")
      return <Badge className="bg-green-600 hover:bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" />Goedgekeurd</Badge>;
    if (s === "pending")
      return <Badge className="bg-orange-500 hover:bg-orange-500 gap-1"><Clock className="w-3 h-3" />In afwachting</Badge>;
    return <Badge variant="secondary" className="gap-1"><FileEdit className="w-3 h-3" />Concept</Badge>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-orange-300">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />Te fiatteren
              {pending.length > 0 && (
                <Badge className="bg-orange-500 hover:bg-orange-500">{pending.length}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />Herlaad
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Stap 3 — De punten zijn al berekend. Klap per etappe de puntenberekening uit om te controleren waarom een deelnemer een bepaald aantal punten heeft, en publiceer daarna naar de deelnemers.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Geen uitslagen wachten op goedkeuring.</p>
          ) : (
            pending.map((r) => (
              <div key={r.stage_id} className="border rounded-md p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold">Etappe {r.stage_number}</span>
                      {r.stage_name && <span className="text-sm text-muted-foreground">— {r.stage_name}</span>}
                      <StatusBadge s={r.results_status} />
                    </div>
                    {r.submitted_for_approval_at && (
                      <p className="text-xs text-muted-foreground">
                        Ingediend op {new Date(r.submitted_for_approval_at).toLocaleString("nl-NL")}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => approve(r.stage_id)}
                    disabled={busyId === r.stage_id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />Fiatteren
                  </Button>
                </div>
                <StageBreakdown stageId={r.stage_id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Concepten ({drafts.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {drafts.length === 0 ? (
            <p className="text-muted-foreground italic">Geen concepten.</p>
          ) : drafts.map((r) => (
            <div key={r.stage_id} className="flex items-center gap-2">
              <StatusBadge s={r.results_status} />
              <span>Etappe {r.stage_number}</span>
              {r.stage_name && <span className="text-muted-foreground">— {r.stage_name}</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Goedgekeurd ({approved.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {approved.length === 0 ? (
            <p className="text-muted-foreground italic">Nog niets gefiatteerd.</p>
          ) : approved.slice(0, 30).map((r) => (
            <div key={r.stage_id} className="border-b last:border-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge s={r.results_status} />
                <span>Etappe {r.stage_number}</span>
                {r.approved_at && (
                  <span className="text-xs text-muted-foreground">
                    · {new Date(r.approved_at).toLocaleDateString("nl-NL")}
                    {r.approved_by_name ? ` · ${r.approved_by_name}` : ""}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm("Goedkeuring intrekken?")) return;
                    const { error } = await supabase.rpc("revoke_stage_approval", { p_stage_id: r.stage_id });
                    if (error) toast.error(error.message);
                    else { toast.success("Ingetrokken"); load(); }
                  }}
                >
                  <Undo2 className="w-3 h-3 mr-1" />Intrekken
                </Button>
              </div>
              <StageBreakdown stageId={r.stage_id} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
