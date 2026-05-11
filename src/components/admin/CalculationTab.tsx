// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, Sparkles, RotateCcw, Save, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Stage } from "./StagesTab";

const DEFAULT_STAGE_POINTS = [50, 40, 32, 26, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export default function CalculationTab({
  activeGameId,
  stages,
}: {
  activeGameId: string;
  stages: Stage[];
}) {
  const [busy, setBusy] = useState(false);
  const [stageId, setStageId] = useState("");
  const [schemaPoints, setSchemaPoints] = useState<number[]>(DEFAULT_STAGE_POINTS);
  const [loadingSchema, setLoadingSchema] = useState(false);

  type StageOverview = {
    stage_id: string;
    stage_number: number;
    stage_name: string | null;
    results_status: "draft" | "pending" | "approved";
    results_count: number;
    points_count: number;
    points_sum: number;
    last_calc_at: string | null;
  };
  const [overview, setOverview] = useState<StageOverview[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [stageBusy, setStageBusy] = useState<string | null>(null);

  const regularStages = stages.filter((s: any) => !s.is_gc);

  const loadOverview = useCallback(async () => {
    if (!supabase || !activeGameId) return;
    setLoadingOverview(true);
    try {
      const stageIds = regularStages.map((s) => s.id);
      if (stageIds.length === 0) { setOverview([]); return; }
      const [resultsRes, pointsRes, stagesRes] = await Promise.all([
        supabase.from("stage_results").select("stage_id").in("stage_id", stageIds),
        supabase.from("stage_points").select("stage_id, points, created_at").in("stage_id", stageIds),
        supabase.from("stages").select("id, results_status").in("id", stageIds),
      ]);
      const rCount = new Map<string, number>();
      (resultsRes.data ?? []).forEach((r: any) => rCount.set(r.stage_id, (rCount.get(r.stage_id) ?? 0) + 1));
      const pAgg = new Map<string, { count: number; sum: number; last: string | null }>();
      (pointsRes.data ?? []).forEach((p: any) => {
        const cur = pAgg.get(p.stage_id) ?? { count: 0, sum: 0, last: null };
        cur.count += 1;
        cur.sum += Number(p.points ?? 0);
        if (!cur.last || (p.created_at && p.created_at > cur.last)) cur.last = p.created_at;
        pAgg.set(p.stage_id, cur);
      });
      const statusMap = new Map<string, string>();
      (stagesRes.data ?? []).forEach((s: any) => statusMap.set(s.id, s.results_status ?? "draft"));
      setOverview(
        regularStages.map((s) => {
          const p = pAgg.get(s.id) ?? { count: 0, sum: 0, last: null };
          return {
            stage_id: s.id,
            stage_number: s.stage_number,
            stage_name: s.name,
            results_status: (statusMap.get(s.id) ?? "draft") as StageOverview["results_status"],
            results_count: rCount.get(s.id) ?? 0,
            points_count: p.count,
            points_sum: p.sum,
            last_calc_at: p.last,
          };
        })
      );
    } finally {
      setLoadingOverview(false);
    }
  }, [activeGameId, stages]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  async function calcOne(sid: string) {
    if (!supabase) return;
    setStageBusy(sid);
    try {
      const { error } = await supabase.rpc("calculate_stage_scores", { p_stage_id: sid });
      if (error) throw error;
      await supabase.rpc("update_total_ranking", { p_game_id: activeGameId }).catch(() => undefined);
      toast.success("Etappe berekend");
      await loadOverview();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStageBusy(null);
    }
  }

  async function deleteResults(sid: string, num: number) {
    if (!supabase) return;
    if (!confirm(`Weet je zeker dat je de uitslag van etappe ${num} wilt wissen? Punten worden herberekend. Andere etappes blijven ongewijzigd.`)) return;
    setStageBusy(sid);
    try {
      const { error } = await supabase.rpc("delete_stage_results", { p_stage_id: sid });
      if (error) throw error;
      toast.success(`Uitslag etappe ${num} verwijderd`);
      await loadOverview();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStageBusy(null);
    }
  }

  async function loadSchema() {
    if (!supabase || !activeGameId) return;
    setLoadingSchema(true);
    const { data, error } = await supabase
      .from("points_schema")
      .select("position, points")
      .eq("game_id", activeGameId)
      .eq("classification", "stage")
      .order("position", { ascending: true });
    setLoadingSchema(false);
    if (error) {
      toast.error(`Puntenschema laden mislukt: ${error.message}`);
      return;
    }
    const arr = [...DEFAULT_STAGE_POINTS];
    (data ?? []).forEach((row: any) => {
      if (row.position >= 1 && row.position <= 20) arr[row.position - 1] = row.points;
    });
    setSchemaPoints(arr);
  }

  useEffect(() => {
    loadSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGameId]);

  async function saveSchema(values: number[]) {
    if (!supabase || !activeGameId) return;
    setBusy(true);
    try {
      const { error: delErr } = await supabase
        .from("points_schema")
        .delete()
        .eq("game_id", activeGameId)
        .eq("classification", "stage");
      if (delErr) throw delErr;
      const rows = values.map((points, i) => ({
        game_id: activeGameId,
        classification: "stage",
        position: i + 1,
        points,
      }));
      const { error: insErr } = await supabase.from("points_schema").insert(rows);
      if (insErr) throw insErr;
      setSchemaPoints(values);
      toast.success("Puntenschema opgeslagen");
    } catch (e) {
      toast.error(`Opslaan mislukt: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function resetToDefault() {
    if (!confirm("Standaard puntentabel terugzetten? (50, 40, 32, ... , 1)")) return;
    saveSchema([...DEFAULT_STAGE_POINTS]);
  }

  // Try multiple RPC variants. Each variant has its own arg shape so we don't
  // pass unknown parameters (which makes Postgres report "function not found").
  async function callRpc(variants: Array<{ name: string; args: Record<string, unknown> }>): Promise<void> {
    if (!supabase) throw new Error("Supabase niet beschikbaar");
    let lastErr: Error | null = null;
    for (const v of variants) {
      const { error } = await supabase.rpc(v.name, v.args);
      if (!error) return;
      lastErr = new Error(`${v.name}: ${error.message}`);
      const msg = error.message.toLowerCase();
      // Only fall through to next variant if the function signature isn't found
      if (!msg.includes("could not find") && !msg.includes("does not exist") && !msg.includes("schema cache")) {
        throw lastErr;
      }
    }
    throw lastErr ?? new Error("Geen RPC gelukt");
  }

  async function calcStage() {
    if (!supabase || !stageId) {
      toast.error("Kies een etappe");
      return;
    }
    setBusy(true);
    try {
      await callRpc([
        { name: "calculate_stage_points_v4", args: { p_stage_id: stageId } },
        { name: "calculate_stage_points_v3", args: { p_stage_id: stageId } },
        { name: "calculate_stage_scores", args: { p_stage_id: stageId } },
      ]);
      // Voorspellingen meenemen (podium GC + truien) voor het totaal
      await callRpc([
        { name: "calculate_prediction_points", args: { p_game_id: activeGameId } },
      ]).catch(() => undefined);
      await callRpc([
        { name: "update_total_points_v4", args: { p_game_id: activeGameId } },
        { name: "update_total_ranking", args: { p_game_id: activeGameId } },
      ]);
      toast.success("Etappe herberekend en totaalstand bijgewerkt");
    } catch (e) {
      console.error("Recalc error:", e);
      toast.error(`Herberekenen mislukt: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function calcPredictions() {
    if (!supabase || !activeGameId) return;
    setBusy(true);
    try {
      await callRpc([
        { name: "calculate_prediction_points", args: { p_game_id: activeGameId } },
      ]);
      await callRpc([
        { name: "update_total_ranking", args: { p_game_id: activeGameId } },
      ]);
      toast.success("Voorspellingen herberekend en totaalstand bijgewerkt");
    } catch (e) {
      console.error("Predictions recalc error:", e);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function fullRecalc() {
    if (!supabase || !activeGameId) return;
    if (!confirm("Volledige herberekening uitvoeren? Dit kan even duren.")) return;
    setBusy(true);
    try {
      await callRpc([
        { name: "full_recalculation_v4", args: { p_game_id: activeGameId } },
        { name: "full_recalculation_v3", args: { p_game_id: activeGameId } },
        { name: "full_recalculation", args: { p_game_id: activeGameId } },
      ]);
      toast.success("Volledige herberekening voltooid");
    } catch (e) {
      console.error("Full recalc error:", e);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function seedDefaults() {
    if (!supabase || !activeGameId) return;
    if (!confirm("Standaard puntentabellen laden? Bestaande puntenregels worden vervangen.")) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("seed_default_points_schema", { p_game_id: activeGameId });
      if (error) throw error;
      toast.success("Standaard puntentabellen geladen");
    } catch (e) {
      console.error("Seed error:", e);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Sparkles className="w-5 h-5" />Puntentabel etappes (top 20)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Standaard: <span className="font-mono">50, 40, 32, 26, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1</span>.
            Pas hieronder per positie aan indien gewenst. Truien en GC-podium lopen via voorspellingen, niet via dit schema.
          </p>
          {loadingSchema ? (
            <p className="text-sm text-muted-foreground italic">Schema laden...</p>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
              {schemaPoints.map((pts, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Pos. {i + 1}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={pts}
                    onChange={(e) => {
                      const next = [...schemaPoints];
                      next[i] = Number(e.target.value) || 0;
                      setSchemaPoints(next);
                    }}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveSchema(schemaPoints)} disabled={busy || loadingSchema}>
              <Save className="w-4 h-4 mr-1" />Opslaan
            </Button>
            <Button onClick={resetToDefault} disabled={busy} variant="outline">
              <RotateCcw className="w-4 h-4 mr-1" />Terug naar standaard
            </Button>
            <Button onClick={loadSchema} disabled={busy || loadingSchema} variant="ghost">
              Herlaad
            </Button>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Tip: na opslaan een etappe herberekenen om de stand bij te werken.
          </p>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <Calculator className="w-5 h-5" />Berekening per etappe
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadOverview} disabled={loadingOverview}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingOverview ? "animate-spin" : ""}`} />Herlaad
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Stap 2 — Punten worden hier per etappe berekend op basis van de geüploade uitslag. Controleer daarna in <strong>Fiatteren</strong> en publiceer naar deelnemers.
          </p>
        </CardHeader>
        <CardContent>
          {loadingOverview ? (
            <p className="text-sm text-muted-foreground italic">Laden…</p>
          ) : overview.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Geen etappes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-2">Etappe</th>
                    <th className="py-2 pr-2">Uitslag</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Berekening</th>
                    <th className="py-2 pr-2">Laatste calc</th>
                    <th className="py-2 pr-2 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map((o) => {
                    const hasResults = o.results_count > 0;
                    const calculated = o.points_count > 0;
                    return (
                      <tr key={o.stage_id} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-2">
                          <div className="font-display font-bold">Etappe {o.stage_number}</div>
                          {o.stage_name && <div className="text-xs text-muted-foreground">{o.stage_name}</div>}
                        </td>
                        <td className="py-2 pr-2">
                          {hasResults ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                              {o.results_count} renners
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <AlertTriangle className="w-3.5 h-3.5" />Geen uitslag
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          {o.results_status === "approved" ? (
                            <Badge className="bg-green-600 hover:bg-green-600">Goedgekeurd</Badge>
                          ) : o.results_status === "pending" ? (
                            <Badge className="bg-orange-500 hover:bg-orange-500">In afwachting</Badge>
                          ) : (
                            <Badge variant="secondary">Concept</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          {calculated ? (
                            <span className="text-xs">
                              <strong>{o.points_count}</strong> entries · <strong>{o.points_sum}</strong> pt totaal
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Niet berekend</span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">
                          {o.last_calc_at ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(o.last_calc_at).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!hasResults || stageBusy === o.stage_id}
                              onClick={() => calcOne(o.stage_id)}
                              title={!hasResults ? "Upload eerst een uitslag" : undefined}
                            >
                              <Calculator className="w-3.5 h-3.5 mr-1" />
                              {calculated ? "Herbereken" : "Bereken"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={!hasResults || stageBusy === o.stage_id}
                              onClick={() => deleteResults(o.stage_id, o.stage_number)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />Wis uitslag
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Sparkles className="w-5 h-5" />Eindklassementen berekenen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Berekent uitsluitend de <strong>GC-podium punten</strong> (50 / 25, max 150) en
            <strong> truienpunten</strong> (25 per juiste winnaar) op basis van de laatst
            beschikbare uitslag. Staat volledig los van de etappepunten (1 t/m 21).
          </p>
          <Button data-testid="recalc-predictions-btn" onClick={calcPredictions} disabled={busy} variant="outline">
            {busy ? "Bezig..." : "Eindklassementen berekenen"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-destructive">Volledige herberekening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Wist alle berekende punten en bouwt het klassement opnieuw op vanuit de uitslagen.
          </p>
          <Button data-testid="full-recalc-btn" onClick={fullRecalc} disabled={busy} variant="destructive">
            {busy ? "Bezig..." : "Volledige herberekening"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
