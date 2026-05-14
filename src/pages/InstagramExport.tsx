import { useRef, useState, useMemo, useEffect } from "react";
import html2canvas from "html2canvas";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useStages, useStagePoints, useEntries } from "@/hooks/useResults";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Download, Copy, Instagram } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };

// ── Data hooks ────────────────────────────────────────────────────────────────

function usePickStats(gameId?: string) {
  return useQuery({
    queryKey: ["ig-pick-stats", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PickStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_pick_stats", { p_game_id: gameId });
      if (error) throw error;
      return (data ?? []) as PickStat[];
    },
  });
}

function useRiderNames(ids: string[]) {
  const key = ids.slice().sort().join(",");
  return useQuery({
    queryKey: ["ig-rider-names", key],
    enabled: ids.length > 0,
    queryFn: async () => {
      if (!supabase || ids.length === 0) return [] as Array<{ id: string; name: string }>;
      const { data, error } = await supabase.from("riders").select("id, name").in("id", ids);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
}

// ── Export helpers ────────────────────────────────────────────────────────────

const CANVAS_OPTS = { scale: 1, useCORS: true, backgroundColor: null, logging: false, width: 1080, height: 1080 };

async function doDownload(ref: React.RefObject<HTMLDivElement>, filename: string, setLoading: (v: boolean) => void) {
  if (!ref.current) return;
  setLoading(true);
  try {
    const canvas = await html2canvas(ref.current, CANVAS_OPTS as any);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Afbeelding gedownload!");
  } catch {
    toast.error("Download mislukt.");
  } finally {
    setLoading(false);
  }
}

async function doCopy(ref: React.RefObject<HTMLDivElement>, setLoading: (v: boolean) => void) {
  if (!ref.current) return;
  setLoading(true);
  try {
    const canvas = await html2canvas(ref.current, CANVAS_OPTS as any);
    await new Promise<void>((res, rej) =>
      canvas.toBlob((b) => {
        if (!b) return rej(new Error("No blob"));
        navigator.clipboard.write([new ClipboardItem({ "image/png": b })]).then(res).catch(rej);
      }, "image/png")
    );
    toast.success("Afbeelding gekopieerd naar klembord!");
  } catch {
    toast.error("Kopiëren mislukt — probeer downloaden.");
  } finally {
    setLoading(false);
  }
}

// ── Preview scale wrapper ─────────────────────────────────────────────────────

const DISPLAY = 480;
const SCALE = DISPLAY / 1080;

function PreviewWrapper({
  children,
  refObj,
}: {
  children: React.ReactNode;
  refObj: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      className="mx-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
      style={{ width: DISPLAY, height: DISPLAY, position: "relative", flexShrink: 0 }}
    >
      <div
        ref={refObj}
        style={{
          width: 1080,
          height: 1080,
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ExportButtons({
  onDownload,
  onCopy,
  loading,
}: {
  onDownload: () => void;
  onCopy: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex gap-3 justify-center mt-3">
      <button
        onClick={onCopy}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
      >
        <Copy className="h-4 w-4" />
        Kopieer afbeelding
      </button>
      <button
        onClick={onDownload}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 transition-colors disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {loading ? "Bezig…" : "Download PNG"}
      </button>
    </div>
  );
}

function StageSelect({
  label,
  stages,
  value,
  onChange,
}: {
  label: string;
  stages: Array<{ id: string; stage_number: number; name: string | null }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium focus:outline-none"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            Rit {s.stage_number}{s.name ? ` — ${s.name}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE SHARED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PINK = "#E91E63";
const GOLD = "#FFD700";
const SILVER = "#C0C0C0";
const BRONZE = "#CD7F32";
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const TYPE_COLOR: Record<string, string> = {
  vlak: "#34d399",
  heuvelachtig: "#fbbf24",
  bergop: "#f43f5e",
  tijdrit: "#38bdf8",
  ploegentijdrit: "#a78bfa",
};
const TYPE_LABEL: Record<string, string> = {
  vlak: "VLAK",
  heuvelachtig: "HEUVELACHTIG",
  bergop: "BERGOP",
  tijdrit: "TIJDRIT",
  ploegentijdrit: "PLOEGENTIJDRIT",
};

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1: KLASSEMENT UPDATE
// ─────────────────────────────────────────────────────────────────────────────

function KlassementTemplate({
  gameName,
  stageNumber,
  standings,
}: {
  gameName: string;
  stageNumber: number;
  standings: Array<{ rank: number; name: string; pts: number }>;
}) {
  const rankColor = (r: number) =>
    r === 1 ? GOLD : r === 2 ? SILVER : r === 3 ? BRONZE : "rgba(255,255,255,0.65)";
  const rankBorder = (r: number) =>
    r === 1 ? `rgba(255,215,0,0.5)` : r === 2 ? `rgba(192,192,192,0.35)` : r === 3 ? `rgba(205,127,50,0.35)` : `rgba(255,255,255,0.07)`;
  const rowBg = (r: number) =>
    r === 1 ? "rgba(255,215,0,0.08)" : r === 2 ? "rgba(192,192,192,0.05)" : r === 3 ? "rgba(205,127,50,0.06)" : "rgba(255,255,255,0.04)";

  return (
    <div style={{
      width: 1080, height: 1080,
      background: "linear-gradient(145deg, #0a0418 0%, #0d1a38 55%, #0a0418 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: FONT,
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glows */}
      <div style={{ position: "absolute", top: -200, right: -150, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${PINK}18 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -150, left: -100, width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Top bar */}
      <div style={{ height: 10, background: `linear-gradient(90deg, ${PINK}, #9c27b0, ${PINK})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: "58px 80px 28px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 10 }}>
          <div style={{ fontSize: 76, lineHeight: 1 }}>🏆</div>
          <div>
            <div style={{ fontSize: 82, fontWeight: 900, color: "white", letterSpacing: "-2px", lineHeight: 1, textTransform: "uppercase" }}>
              TUSSENSTAND
            </div>
            <div style={{ fontSize: 30, color: PINK, fontWeight: 700, marginTop: 8, letterSpacing: "3px", textTransform: "uppercase" }}>
              {gameName} · Na rit {stageNumber}
            </div>
          </div>
        </div>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${PINK} 0%, rgba(233,30,99,0.3) 60%, transparent 100%)`, marginTop: 24 }} />
      </div>

      {/* Standings */}
      <div style={{ flex: 1, padding: "4px 80px 0", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
        {standings.slice(0, 5).map((s) => (
          <div key={s.rank} style={{
            display: "flex", alignItems: "center",
            background: rowBg(s.rank),
            borderRadius: 16,
            padding: "22px 30px",
            border: `1px solid ${rankBorder(s.rank)}`,
            borderLeft: `6px solid ${s.rank <= 3 ? rankColor(s.rank) : "rgba(255,255,255,0.08)"}`,
          }}>
            <div style={{ width: 80, fontSize: s.rank <= 3 ? 60 : 40, fontWeight: 900, color: rankColor(s.rank), flexShrink: 0, lineHeight: 1, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
              {s.rank}
            </div>
            <div style={{ flex: 1, fontSize: 38, fontWeight: s.rank <= 3 ? 800 : 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.name}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: s.rank === 1 ? 56 : 46, fontWeight: 900, color: s.rank === 1 ? GOLD : "white", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {s.pts}
              </div>
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.35)", marginTop: 3, letterSpacing: "2px" }}>PT</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: "24px 80px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        marginTop: 20,
      }}>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>koerspoule.nl</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: PINK }} />
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.35)", letterSpacing: "4px", fontWeight: 700, textTransform: "uppercase" }}>Giro d'Italia 2026</div>
        </div>
      </div>
      <div style={{ height: 8, background: `linear-gradient(90deg, ${PINK}, #9c27b0, ${PINK})`, flexShrink: 0 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2: DAGSCORE
// ─────────────────────────────────────────────────────────────────────────────

function DagscoreTemplate({
  stageNumber,
  stageName,
  stageType,
  standings,
}: {
  stageNumber: number;
  stageName?: string;
  stageType?: string;
  standings: Array<{ rank: number; name: string; pts: number }>;
}) {
  const accent = TYPE_COLOR[stageType ?? "vlak"] ?? "#38bdf8";

  return (
    <div style={{
      width: 1080, height: 1080,
      background: "linear-gradient(150deg, #050d1a 0%, #0a1628 60%, #050d1a 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: FONT,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -180, left: -180, width: 520, height: 520, borderRadius: "50%", background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -120, right: -120, width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(circle, ${PINK}18 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ height: 10, background: `linear-gradient(90deg, ${PINK}, ${accent}, ${PINK})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: "52px 80px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, color: accent, fontWeight: 700, letterSpacing: "5px", textTransform: "uppercase", marginBottom: 6 }}>
              DAGUITSLAG
            </div>
            <div style={{ fontSize: 96, fontWeight: 900, color: "white", letterSpacing: "-4px", lineHeight: 0.9, textTransform: "uppercase" }}>
              RIT {stageNumber}
            </div>
            {stageName && (
              <div style={{ fontSize: 30, color: "rgba(255,255,255,0.5)", marginTop: 14, fontWeight: 500 }}>
                {stageName}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", paddingTop: 8 }}>
            <div style={{ fontSize: 64, lineHeight: 1 }}>🚴</div>
            {stageType && (
              <div style={{
                marginTop: 14,
                padding: "8px 22px",
                borderRadius: 40,
                background: `${accent}20`,
                border: `1px solid ${accent}55`,
                color: accent,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}>
                {TYPE_LABEL[stageType] ?? stageType}
              </div>
            )}
          </div>
        </div>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${PINK}, transparent)`, marginTop: 24 }} />
      </div>

      {/* Standings */}
      <div style={{ flex: 1, padding: "8px 80px 0", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
        {standings.slice(0, 5).map((s) => (
          <div key={s.rank} style={{
            display: "flex", alignItems: "center",
            background: s.rank === 1 ? `${accent}15` : "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding: "20px 28px",
            border: `1px solid ${s.rank === 1 ? `${accent}45` : "rgba(255,255,255,0.07)"}`,
            borderLeft: `5px solid ${s.rank === 1 ? accent : s.rank === 2 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
          }}>
            <div style={{ width: 64, fontSize: s.rank === 1 ? 56 : 38, fontWeight: 900, color: s.rank === 1 ? accent : "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums", flexShrink: 0, lineHeight: 1, textAlign: "center" }}>
              {s.rank}
            </div>
            <div style={{ flex: 1, fontSize: 38, fontWeight: s.rank === 1 ? 800 : 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.name}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: s.rank === 1 ? 56 : 44, fontWeight: 900, color: s.rank === 1 ? accent : "white", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                +{s.pts}
              </div>
              <div style={{ fontSize: 17, color: "rgba(255,255,255,0.3)", marginTop: 3, letterSpacing: "2px" }}>PT</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "22px 80px", marginTop: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>koerspoule.nl</div>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.35)", letterSpacing: "4px", fontWeight: 700, textTransform: "uppercase" }}>Giro d'Italia 2026</div>
      </div>
      <div style={{ height: 8, background: `linear-gradient(90deg, ${PINK}, ${accent}, ${PINK})`, flexShrink: 0 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3: ETAPPE PREVIEW
// ─────────────────────────────────────────────────────────────────────────────

function EtappePreviewTemplate({
  stageNumber,
  stageName,
  distanceKm,
  stageType,
  date,
  topRiders,
}: {
  stageNumber: number;
  stageName?: string;
  distanceKm?: number;
  stageType?: string;
  date?: string;
  topRiders: Array<{ name: string; pickPct: number }>;
}) {
  const accent = TYPE_COLOR[stageType ?? "vlak"] ?? "#38bdf8";
  const dateStr = date
    ? new Date(date).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })
    : "";
  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div style={{
      width: 1080, height: 1080,
      background: `linear-gradient(148deg, #05111e 0%, #0b1e2e 55%, #05111e 100%)`,
      display: "flex", flexDirection: "column",
      fontFamily: FONT,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -100, right: -100, width: 520, height: 520, borderRadius: "50%", background: `radial-gradient(circle, ${accent}1e 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${PINK}14 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ height: 10, background: `linear-gradient(90deg, ${PINK}, ${accent}, ${PINK})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: "52px 80px 28px", flexShrink: 0 }}>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.38)", letterSpacing: "5px", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>
          PREVIEW 👀
        </div>
        <div style={{ fontSize: 98, fontWeight: 900, color: "white", letterSpacing: "-4px", lineHeight: 0.88 }}>
          RIT {stageNumber}
        </div>
        {stageName && (
          <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginTop: 16 }}>
            {stageName}
          </div>
        )}
        {/* Meta pills row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
          {stageType && (
            <div style={{
              padding: "8px 24px", borderRadius: 40,
              background: `${accent}1e`, border: `1px solid ${accent}55`,
              color: accent, fontSize: 23, fontWeight: 700, letterSpacing: "2px",
            }}>
              {TYPE_LABEL[stageType]}
            </div>
          )}
          {distanceKm && (
            <div style={{
              padding: "8px 24px", borderRadius: 40,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.75)", fontSize: 23, fontWeight: 600,
            }}>
              {distanceKm} km
            </div>
          )}
          {dateStr && (
            <div style={{ fontSize: 23, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
              {dateStr}
            </div>
          )}
        </div>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${PINK}, transparent)`, marginTop: 28 }} />
      </div>

      {/* Top riders */}
      <div style={{ flex: 1, padding: "8px 80px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.30)", letterSpacing: "5px", fontWeight: 700, textTransform: "uppercase", marginBottom: 22 }}>
          Meest gekozen renners
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {topRiders.slice(0, 3).map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 24,
              background: i === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
              borderRadius: 18,
              padding: "30px 36px",
              border: `1px solid ${i === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`,
            }}>
              <div style={{ fontSize: 56, lineHeight: 1, flexShrink: 0 }}>{MEDALS[i]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 44, fontWeight: 800, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: accent, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {r.pickPct.toFixed(0)}%
                </div>
                <div style={{ fontSize: 18, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>van de pools</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "22px 80px", marginTop: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>koerspoule.nl</div>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.35)", letterSpacing: "4px", fontWeight: 700, textTransform: "uppercase" }}>Giro d'Italia 2026</div>
      </div>
      <div style={{ height: 8, background: `linear-gradient(90deg, ${PINK}, ${accent}, ${PINK})`, flexShrink: 0 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function InstagramExport({ gameId: propGameId }: { gameId?: string }) {
  const { data: game } = useCurrentGame();
  const gameId = propGameId ?? game?.id;

  const { data: stages = [] } = useStages(gameId);
  const { data: stagePoints = [] } = useStagePoints(gameId);
  const { data: entries = [] } = useEntries(gameId);
  const { data: pickStats = [] } = usePickStats(gameId);

  const [activeTab, setActiveTab] = useState<"klassement" | "dagscore" | "etappe">("klassement");
  const [klassementStageId, setKlassementStageId] = useState<string>("");
  const [dagscoreStageId, setDagscoreStageId] = useState<string>("");
  const [previewStageId, setPreviewStageId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);

  const approvedStages = useMemo(() => stages.filter((s) => !s.is_gc && s.results_status === "approved"), [stages]);
  const allRegularStages = useMemo(() => stages.filter((s) => !s.is_gc), [stages]);

  // Auto-select latest approved stage
  useEffect(() => {
    if (approvedStages.length > 0) {
      const last = approvedStages[approvedStages.length - 1].id;
      setKlassementStageId((v) => v || last);
      setDagscoreStageId((v) => v || last);
    }
    if (allRegularStages.length > 0) {
      setPreviewStageId((v) => v || allRegularStages[allRegularStages.length - 1].id);
    }
  }, [approvedStages.length, allRegularStages.length]);

  const gameName = game?.name ?? "Giro d'Italia 2026";

  // Klassement standings (cumulative up to selected stage)
  const klassementStage = stages.find((s) => s.id === klassementStageId);
  const klassementStandings = useMemo(() => {
    const idx = stages.findIndex((s) => s.id === klassementStageId);
    if (idx < 0) return [];
    const allowed = new Set(stages.slice(0, idx + 1).map((s) => s.id));
    const m = new Map<string, number>();
    stagePoints.filter((sp) => allowed.has(sp.stage_id)).forEach((sp) => {
      m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points);
    });
    return [...entries]
      .map((e) => ({ name: e.team_name ?? e.display_name ?? "—", pts: m.get(e.id) ?? 0 }))
      .sort((a, b) => b.pts - a.pts)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [stages, stagePoints, entries, klassementStageId]);

  // Dagscore standings (single stage)
  const dagscoreStage = stages.find((s) => s.id === dagscoreStageId);
  const dagscoreStandings = useMemo(() => {
    if (!dagscoreStageId) return [];
    const m = new Map<string, number>();
    stagePoints.filter((sp) => sp.stage_id === dagscoreStageId).forEach((sp) => {
      m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points);
    });
    return [...entries]
      .map((e) => ({ name: e.team_name ?? e.display_name ?? "—", pts: m.get(e.id) ?? 0 }))
      .filter((e) => e.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [stagePoints, entries, dagscoreStageId]);

  // Preview stage
  const previewStage = stages.find((s) => s.id === previewStageId);

  // Top picked riders
  const topRiderIds = useMemo(
    () => [...pickStats].sort((a, b) => b.pick_count - a.pick_count).slice(0, 10).map((p) => p.rider_id),
    [pickStats]
  );
  const { data: riderData = [] } = useRiderNames(topRiderIds);
  const ridersById = useMemo(() => Object.fromEntries(riderData.map((r) => [r.id, r])), [riderData]);
  const topRidersForPreview = useMemo(() => {
    const totalEntries = pickStats[0]?.total_entries ?? 1;
    return [...pickStats]
      .sort((a, b) => b.pick_count - a.pick_count)
      .slice(0, 3)
      .map((p) => ({
        name: ridersById[p.rider_id]?.name ?? "Onbekend",
        pickPct: (p.pick_count / Math.max(1, totalEntries)) * 100,
      }));
  }, [pickStats, ridersById]);

  const tabs = [
    { key: "klassement" as const, label: "Klassement Update" },
    { key: "dagscore" as const, label: "Daguitslag" },
    { key: "etappe" as const, label: "Etappe Preview" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-pink-500/10">
          <Instagram className="h-6 w-6 text-pink-500" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">Instagram Export</h2>
          <p className="text-sm text-muted-foreground">Genereer 1080×1080px posts klaar voor Instagram.</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-xl border-2 border-foreground/15 bg-secondary/30 p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              activeTab === key
                ? "bg-card text-foreground shadow-sm border border-foreground/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Template 1: Klassement ── */}
      {activeTab === "klassement" && (
        <div>
          <StageSelect
            label="Na rit:"
            stages={approvedStages}
            value={klassementStageId}
            onChange={setKlassementStageId}
          />
          <div className="flex flex-col items-center gap-3">
            <PreviewWrapper refObj={ref1}>
              <KlassementTemplate
                gameName={gameName}
                stageNumber={klassementStage?.stage_number ?? 0}
                standings={klassementStandings}
              />
            </PreviewWrapper>
            <ExportButtons
              onDownload={() => doDownload(ref1, `klassement-rit${klassementStage?.stage_number ?? 0}.png`, setLoading)}
              onCopy={() => doCopy(ref1, setLoading)}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* ── Template 2: Dagscore ── */}
      {activeTab === "dagscore" && (
        <div>
          <StageSelect
            label="Rit:"
            stages={approvedStages}
            value={dagscoreStageId}
            onChange={setDagscoreStageId}
          />
          <div className="flex flex-col items-center gap-3">
            <PreviewWrapper refObj={ref2}>
              <DagscoreTemplate
                stageNumber={dagscoreStage?.stage_number ?? 0}
                stageName={dagscoreStage?.name ?? undefined}
                stageType={dagscoreStage?.stage_type ?? undefined}
                standings={dagscoreStandings}
              />
            </PreviewWrapper>
            <ExportButtons
              onDownload={() => doDownload(ref2, `daguitslag-rit${dagscoreStage?.stage_number ?? 0}.png`, setLoading)}
              onCopy={() => doCopy(ref2, setLoading)}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* ── Template 3: Etappe Preview ── */}
      {activeTab === "etappe" && (
        <div>
          <StageSelect
            label="Rit:"
            stages={allRegularStages}
            value={previewStageId}
            onChange={setPreviewStageId}
          />
          <div className="flex flex-col items-center gap-3">
            <PreviewWrapper refObj={ref3}>
              <EtappePreviewTemplate
                stageNumber={previewStage?.stage_number ?? 0}
                stageName={previewStage?.name ?? undefined}
                distanceKm={previewStage?.distance_km ?? undefined}
                stageType={previewStage?.stage_type ?? undefined}
                date={previewStage?.date ?? undefined}
                topRiders={topRidersForPreview}
              />
            </PreviewWrapper>
            <ExportButtons
              onDownload={() => doDownload(ref3, `preview-rit${previewStage?.stage_number ?? 0}.png`, setLoading)}
              onCopy={() => doCopy(ref3, setLoading)}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
