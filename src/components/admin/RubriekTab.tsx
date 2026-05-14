import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useAllRubriekItems, type RubriekItem } from "@/hooks/useRubriek";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, Edit2, X } from "lucide-react";
import { toast } from "sonner";

type Props = { activeGameId: string };

type DraftForm = {
  type: "text" | "poll";
  content: string;
  question: string;
  options: string[];
  deadline: string;
};

const empty = (): DraftForm => ({
  type: "text",
  content: "",
  question: "",
  options: ["", ""],
  deadline: "",
});

export default function RubriekTab({ activeGameId }: Props) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useAllRubriekItems(activeGameId);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(empty());
  const [saving, setSaving] = useState(false);

  function reload() {
    qc.invalidateQueries({ queryKey: ["rubriek-items-admin", activeGameId] });
    qc.invalidateQueries({ queryKey: ["active-rubriek", activeGameId] });
  }

  function openCreate() {
    setEditingId(null);
    setForm(empty());
    setShowForm(true);
  }

  function openEdit(item: RubriekItem) {
    setEditingId(item.id);
    setForm({
      type: item.type,
      content: item.content ?? "",
      question: item.question ?? "",
      options: (item.options && item.options.length > 0) ? [...item.options, "", ""].slice(0, Math.max(item.options.length, 2)) : ["", ""],
      deadline: item.deadline ? item.deadline.slice(0, 16) : "",
    });
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
  }

  async function save() {
    if (!supabase) return;

    if (form.type === "text" && !form.content.trim()) {
      toast.error("Tekst mag niet leeg zijn");
      return;
    }
    if (form.type === "poll") {
      if (form.question.trim().length < 3) {
        toast.error("Vraag te kort (min. 3 tekens)");
        return;
      }
      const cleanOpts = form.options.map((o) => o.trim()).filter(Boolean);
      if (cleanOpts.length < 2) {
        toast.error("Minimaal 2 opties");
        return;
      }
    }

    setSaving(true);
    try {
      const cleanOpts = form.options.map((o) => o.trim()).filter(Boolean);
      const payload = {
        type: form.type,
        content: form.type === "text" ? form.content.trim() : null,
        question: form.type === "poll" ? form.question.trim() : null,
        options: form.type === "poll" ? cleanOpts : null,
        deadline: (form.type === "poll" && form.deadline)
          ? new Date(form.deadline).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("rubriek_items")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rubriek_items")
          .insert({ ...payload, game_id: activeGameId, is_active: false });
        if (error) throw error;
      }

      toast.success(editingId ? "Rubriek bijgewerkt" : "Rubriek aangemaakt");
      setShowForm(false);
      setEditingId(null);
      reload();
    } catch (e) {
      toast.error(`Opslaan mislukt: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function setActive(id: string) {
    if (!supabase) return;
    const { error: e1 } = await supabase
      .from("rubriek_items")
      .update({ is_active: false })
      .eq("game_id", activeGameId);
    if (e1) { toast.error(e1.message); return; }
    const { error: e2 } = await supabase
      .from("rubriek_items")
      .update({ is_active: true })
      .eq("id", id);
    if (e2) { toast.error(e2.message); return; }
    toast.success("Rubriek geactiveerd");
    reload();
  }

  async function deactivate(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("rubriek_items")
      .update({ is_active: false })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rubriek gedeactiveerd");
    reload();
  }

  async function deleteItem(id: string) {
    if (!supabase) return;
    if (!confirm("Rubriek verwijderen? Alle stemmen gaan ook verloren.")) return;
    const { error } = await supabase.from("rubriek_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Verwijderd");
    if (editingId === id) cancel();
    reload();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Rubriek</CardTitle>
          {!showForm && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />Nieuw item
            </Button>
          )}
        </CardHeader>

        {showForm && (
          <CardContent className="border-t pt-4">
            <ItemForm
              form={form}
              setForm={setForm}
              saving={saving}
              isEdit={Boolean(editingId)}
              onSave={save}
              onCancel={cancel}
            />
          </CardContent>
        )}
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground px-1">Laden…</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground px-1">Nog geen rubriek-items aangemaakt.</p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onEdit={() => openEdit(item)}
            onDelete={() => deleteItem(item.id)}
            onSetActive={() => setActive(item.id)}
            onDeactivate={() => deactivate(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────
// Matches PollComposer style from the Koerscafé.

function ItemForm({
  form,
  setForm,
  saving,
  isEdit,
  onSave,
  onCancel,
}: {
  form: DraftForm;
  setForm: (f: DraftForm) => void;
  saving: boolean;
  isEdit: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const updateOption = (i: number, v: string) =>
    setForm({ ...form, options: form.options.map((o, idx) => (idx === i ? v : o)) });

  const addOption = () => {
    if (form.options.length >= 6) return;
    setForm({ ...form, options: [...form.options, ""] });
  };

  const removeOption = (i: number) => {
    if (form.options.length <= 2) return;
    setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border-t-2 border-foreground bg-secondary/40 p-3 space-y-3 rounded-b-md max-w-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-sm">
          {isEdit ? "✏️ Rubriek bewerken" : "📝 Nieuw rubriek-item"}
        </h4>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={form.type === "text" ? "default" : "outline"}
          onClick={() => setForm({ ...form, type: "text" })}
        >
          Tekst
        </Button>
        <Button
          size="sm"
          variant={form.type === "poll" ? "default" : "outline"}
          onClick={() => setForm({ ...form, type: "poll" })}
        >
          📊 Poll
        </Button>
      </div>

      {form.type === "text" ? (
        <div>
          <Label htmlFor="rubriek-content" className="text-xs">Tekst</Label>
          <Textarea
            id="rubriek-content"
            rows={4}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder={"Eerste regel = koptekst\nVervolgregel(s) = cursieve subtekst"}
            className="text-sm resize-y"
          />
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="rubriek-question" className="text-xs">Vraag</Label>
            <Textarea
              id="rubriek-question"
              rows={2}
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value.slice(0, 200) })}
              placeholder="Wie wint de etappe vandaag?"
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Opties (2–6)</Label>
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value.slice(0, 80))}
                  placeholder={`Optie ${i + 1}`}
                  className="text-sm h-8"
                />
                {form.options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Optie verwijderen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {form.options.length < 6 && (
              <button
                onClick={addOption}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Optie toevoegen
              </button>
            )}
          </div>

          <div>
            <Label htmlFor="rubriek-deadline" className="text-xs">Deadline (optioneel)</Label>
            <Input
              id="rubriek-deadline"
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="text-sm h-8"
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Annuleren
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "Opslaan…" : isEdit ? "Opslaan" : "Plaatsen"}
        </Button>
      </div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onEdit,
  onDelete,
  onSetActive,
  onDeactivate,
}: {
  item: RubriekItem;
  onEdit: () => void;
  onDelete: () => void;
  onSetActive: () => void;
  onDeactivate: () => void;
}) {
  const preview =
    item.type === "text"
      ? (item.content ?? "").split("\n")[0]
      : item.question ?? "";

  return (
    <Card className={item.is_active ? "border-primary/50 bg-primary/[0.03]" : ""}>
      <CardContent className="flex items-start gap-3 py-3 px-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <Badge
              variant={item.type === "poll" ? "secondary" : "outline"}
              className="text-[10px] uppercase tracking-wide"
            >
              {item.type === "poll" ? "📊 Poll" : "Tekst"}
            </Badge>
            {item.is_active && (
              <Badge className="text-[10px] uppercase tracking-wide bg-primary text-primary-foreground">
                Actief
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate">{preview}</p>
          {item.type === "poll" && item.options && item.options.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.options.join(" · ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {item.is_active ? (
            <Button size="sm" variant="outline" onClick={onDeactivate} title="Deactiveren">
              <X className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onSetActive} title="Activeren">
              <Check className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit} title="Bewerken">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            title="Verwijderen"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
