// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RACE_PALETTES } from "@/hooks/useAccentColor";

export type Game = {
  id: string;
  name: string;
  game_type: "giro" | "tdf" | "vuelta" | null;
  year: number | null;
  status: "draft" | "open" | "locked" | "live" | "finished";
  starts_at: string | null;
  slug: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  accent_color?: string | null;
};

// Convert ISO timestamp ↔ datetime-local input string (in user's local TZ)
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TYPE_LABELS: Record<string, string> = {
  giro: "Giro d'Italia",
  tdf: "Tour de France",
  vuelta: "Vuelta a España",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  open: "Open (inschrijving)",
  locked: "Gesloten (deadline)",
  live: "Live (loopt)",
  finished: "Afgerond",
};

// Color swatches for race theme selector
const COLOR_OPTIONS = [
  { label: "Auto",   value: null,           style: { backgroundColor: "hsl(35,14%,88%)", border: "1px dashed hsl(35,12%,65%)" } },
  { label: "Giro",   value: RACE_PALETTES.giro.primary,   style: { backgroundColor: `hsl(${RACE_PALETTES.giro.primary})` } },
  { label: "Tour",   value: RACE_PALETTES.tdf.primary,    style: { backgroundColor: `hsl(${RACE_PALETTES.tdf.primary})` } },
  { label: "Vuelta", value: RACE_PALETTES.vuelta.primary, style: { backgroundColor: `hsl(${RACE_PALETTES.vuelta.primary})` } },
];

function ColorSwatchPicker({
  current,
  onChange,
}: {
  current: string | null | undefined;
  onChange: (color: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {COLOR_OPTIONS.map((opt) => {
        const isActive = (current ?? null) === opt.value;
        return (
          <button
            key={opt.label}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            style={opt.style}
            className={cn(
              "w-5 h-5 rounded-full transition-all",
              isActive
                ? "ring-2 ring-offset-1 ring-foreground/60 scale-125"
                : "opacity-55 hover:opacity-90 hover:scale-110"
            )}
          />
        );
      })}
    </div>
  );
}

export default function GamesTab({
  games,
  setActiveGameId,
  reload,
}: {
  games: Game[];
  setActiveGameId: (id: string) => void;
  reload: () => Promise<void> | void;
}) {
  const [type, setType] = useState<"giro" | "tdf" | "vuelta">("tdf");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [startsAt, setStartsAt] = useState("");
  const [creating, setCreating] = useState(false);

  async function createGame() {
    if (!supabase) return;
    const yr = Number(year);
    if (!Number.isFinite(yr) || yr < 1900 || yr > 2100) {
      toast.error("Vul een geldig jaartal in");
      return;
    }

    setCreating(true);
    try {
      const name = `${TYPE_LABELS[type]} ${yr}`;
      const payload: Record<string, unknown> = {
        name,
        game_type: type,
        year: yr,
        status: "draft",
      };
      if (startsAt) payload.starts_at = startsAt;

      const { error } = await supabase.from("games").insert(payload);
      if (error) throw error;
      toast.success(`${name} aangemaakt`);
      setStartsAt("");
      await reload();
    } catch (e) {
      const msg = (e as Error).message;
      console.error("Game create error:", e);
      toast.error(msg.includes("duplicate") ? "Deze game bestaat al" : `Aanmaken mislukt: ${msg}`);
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(id: string, status: Game["status"]) {
    if (!supabase) return;
    const { error } = await supabase.from("games").update({ status }).eq("id", id);
    if (error) {
      toast.error(`Status wijzigen mislukt: ${error.message}`);
      return;
    }
    toast.success("Status bijgewerkt");
    await reload();
  }

  async function setAccentColor(id: string, color: string | null) {
    if (!supabase) return;
    const { error } = await supabase.from("games").update({ accent_color: color }).eq("id", id);
    if (error) {
      if (error.message.includes("accent_color") || error.message.includes("schema cache")) {
        toast.error(
          "Voer eerst de migratie uit in de Supabase SQL editor: ALTER TABLE games ADD COLUMN IF NOT EXISTS accent_color text; — daarna Settings → API → Reload schema.",
          { duration: 8000 }
        );
      } else {
        toast.error(`Themakleur bijwerken mislukt: ${error.message}`);
      }
      return;
    }
    toast.success("Themakleur bijgewerkt");
    await reload();
  }

  async function setRegistrationWindow(
    id: string,
    field: "registration_opens_at" | "registration_closes_at",
    value: string,
  ) {
    if (!supabase) return;
    const iso = value ? new Date(value).toISOString() : null;
    const { error } = await supabase.from("games").update({ [field]: iso }).eq("id", id);
    if (error) {
      toast.error(`Bijwerken mislukt: ${error.message}`);
      return;
    }
    toast.success("Inschrijvingstijd bijgewerkt");
    await reload();
  }

  async function deleteGame(g: Game) {
    if (!supabase) return;
    if (!confirm(`Weet je zeker dat je "${g.name}" volledig wilt verwijderen?\n\nAlle inzendingen, picks, jokers, uitslagen, etappes, categorieën, puntenregels, renners en subpoules van deze game worden gewist. Dit kan niet ongedaan worden gemaakt.`)) return;

    try {
      const { data: entries } = await supabase.from("entries").select("id").eq("game_id", g.id);
      const entryIds = (entries ?? []).map((e: { id: string }) => e.id);

      const { data: subps } = await supabase.from("subpoules").select("id").eq("game_id", g.id);
      const subpouleIds = (subps ?? []).map((s: { id: string }) => s.id);

      const { data: stages } = await supabase.from("stages").select("id").eq("game_id", g.id);
      const stageIds = (stages ?? []).map((s: { id: string }) => s.id);

      const { data: cats } = await supabase.from("categories").select("id").eq("game_id", g.id);
      const categoryIds = (cats ?? []).map((c: { id: string }) => c.id);

      if (entryIds.length) {
        await supabase.from("entry_picks").delete().in("entry_id", entryIds);
        await supabase.from("entry_jokers").delete().in("entry_id", entryIds);
        await supabase.from("total_points").delete().in("entry_id", entryIds);
      }
      if (stageIds.length) {
        await supabase.from("stage_points").delete().in("stage_id", stageIds);
        await supabase.from("stage_results").delete().in("stage_id", stageIds);
      }
      if (categoryIds.length) {
        await supabase.from("category_riders").delete().in("category_id", categoryIds);
      }
      if (subpouleIds.length) {
        await supabase.from("subpoule_members").delete().in("subpoule_id", subpouleIds);
      }

      await supabase.from("entries").delete().eq("game_id", g.id);
      await supabase.from("stages").delete().eq("game_id", g.id);
      await supabase.from("categories").delete().eq("game_id", g.id);
      await supabase.from("game_riders").delete().eq("game_id", g.id);
      await supabase.from("riders").delete().eq("game_id", g.id);
      await supabase.from("teams").delete().eq("game_id", g.id);
      await supabase.from("points_schema").delete().eq("game_id", g.id);
      await supabase.from("startlists").delete().eq("game_id", g.id);
      await supabase.from("subpoules").delete().eq("game_id", g.id);

      const { error: delErr } = await supabase.from("games").delete().eq("id", g.id);
      if (delErr) throw delErr;

      toast.success(`${g.name} verwijderd`);
      await reload();
    } catch (e) {
      console.error("Game delete error:", e);
      toast.error(`Verwijderen mislukt: ${(e as Error).message}`);
    }
  }

  return (
    <div className="space-y-5">
      <Card data-testid="create-game-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Nieuwe game aanmaken</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Type koers</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger data-testid="game-type-select" className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="giro">Giro d'Italia</SelectItem>
                <SelectItem value="tdf">Tour de France</SelectItem>
                <SelectItem value="vuelta">Vuelta a España</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Jaartal</Label>
            <Input
              data-testid="game-year-input"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Startdatum (optioneel)</Label>
            <Input
              data-testid="game-starts-at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              data-testid="create-game-btn"
              onClick={createGame}
              disabled={creating}
              className="w-full h-8 text-sm"
            >
              {creating ? "Aanmaken..." : "Aanmaken"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accent color migration note */}
      <div className="text-xs text-muted-foreground bg-muted/50 border border-border rounded px-3 py-2">
        <strong>Themakleur:</strong> vereist kolom in database.{" "}
        <code className="font-mono bg-muted px-1 rounded">
          ALTER TABLE games ADD COLUMN IF NOT EXISTS accent_color text;
        </code>{" "}
        Voer dit eenmalig uit in de Supabase SQL editor.
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">
            Bestaande games ({games.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs pl-4">Type</TableHead>
                <TableHead className="text-xs">Jaar</TableHead>
                <TableHead className="text-xs">Naam</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Thema</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">Inschrijving opent</TableHead>
                <TableHead className="text-xs">Inschrijving sluit</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((g) => (
                <TableRow key={g.id} data-testid={`game-row-${g.id}`}>
                  <TableCell className="text-xs pl-4">
                    {TYPE_LABELS[g.game_type ?? ""] ?? g.game_type ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">{g.year ?? "—"}</TableCell>
                  <TableCell className="text-xs font-medium">{g.name}</TableCell>
                  <TableCell>
                    <Select value={g.status} onValueChange={(v) => setStatus(g.id, v as Game["status"])}>
                      <SelectTrigger className="w-40 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <ColorSwatchPicker
                      current={g.accent_color}
                      onChange={(color) => setAccentColor(g.id, color)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {g.starts_at ? new Date(g.starts_at).toLocaleString("nl-NL") : "—"}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="datetime-local"
                      className="h-7 text-xs w-44"
                      defaultValue={toLocalInput(g.registration_opens_at)}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== toLocalInput(g.registration_opens_at)) {
                          setRegistrationWindow(g.id, "registration_opens_at", v);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="datetime-local"
                      className="h-7 text-xs w-44"
                      defaultValue={toLocalInput(g.registration_closes_at)}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== toLocalInput(g.registration_closes_at)) {
                          setRegistrationWindow(g.id, "registration_closes_at", v);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5 pr-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => setActiveGameId(g.id)}
                        data-testid={`select-game-${g.id}`}
                      >
                        Selecteer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteGame(g)}
                        data-testid={`delete-game-${g.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {games.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8 text-sm">
                    Nog geen games. Maak hierboven je eerste game aan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
