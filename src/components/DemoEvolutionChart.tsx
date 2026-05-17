import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { LINE_COLORS, CHART_VISUAL } from "@/components/SubpouleEvolutionChart";

const DEMO_MEMBERS = [
  { user_id: "u1", display_name: "Lars van Dijk" },
  { user_id: "u2", display_name: "Sofie Hendriks" },
  { user_id: "u3", display_name: "Bas de Groot" },
  { user_id: "u4", display_name: "Emma Janssen" },
  { user_id: "u5", display_name: "Pieter Kuipers" },
  { user_id: "u6", display_name: "Roos Bakker" },
];

// Per-stage point gains (8 stages played)
const STAGE_DELTAS: Record<string, number[]> = {
  u1: [42, 18, 50, 12, 38, 56, 28, 68],
  u2: [38, 26, 44, 18, 32, 48, 36, 56],
  u3: [30, 22, 48, 16, 28, 52, 38, 41],
  u4: [36, 14, 40, 22, 30, 44, 32, 43],
  u5: [28, 20, 36, 18, 26, 48, 30, 38],
  u6: [24, 18, 32, 14, 24, 44, 28, 44],
};

function buildChartData() {
  const cum: Record<string, number> = {};
  for (const m of DEMO_MEMBERS) cum[m.user_id] = 0;
  return Array.from({ length: 8 }, (_, i) => {
    const row: Record<string, any> = { stage: `E${i + 1}`, stageNumber: i + 1 };
    for (const m of DEMO_MEMBERS) {
      const delta = STAGE_DELTAS[m.user_id][i];
      cum[m.user_id] += delta;
      row[`pts_${m.user_id}`] = cum[m.user_id];
      row[`delta_${m.user_id}`] = delta;
    }
    const sorted = DEMO_MEMBERS
      .map((m) => ({ id: m.user_id, pts: cum[m.user_id] }))
      .sort((a, b) => b.pts - a.pts);
    let lastPts = -Infinity, lastRank = 0;
    sorted.forEach((s, idx) => {
      const rank = s.pts === lastPts ? lastRank : idx + 1;
      lastPts = s.pts; lastRank = rank;
      row[`rank_${s.id}`] = rank;
    });
    return row;
  });
}

const CHART_DATA = buildChartData();

export default function DemoEvolutionChart() {
  const isMobile = useIsMobile();
  const [highlightId, setHighlightId] = useState("u1");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const toggleVisible = (uid: string) =>
    setHiddenIds((prev) => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });

  const allHidden = DEMO_MEMBERS.every((m) => hiddenIds.has(m.user_id));
  const toggleAll = () =>
    allHidden ? setHiddenIds(new Set()) : setHiddenIds(new Set(DEMO_MEMBERS.map((m) => m.user_id)));

  const chartHeight = isMobile ? 220 : 260;

  return (
    <div className={CHART_VISUAL.containerClass} style={CHART_VISUAL.containerStyle}>
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgba(52,211,153,0.4)]" />
              Live performance
            </div>
            <h3 className="mt-1 font-display text-foreground text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Jouw subpoule
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Etappe-evolutie · klik op een naam om te markeren</p>
          </div>
          <button onClick={toggleAll} className={CHART_VISUAL.toggleBtnClass}>
            {allHidden ? "Toon alles" : "Verberg alles"}
          </button>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {DEMO_MEMBERS.map((m, idx) => {
            const color = LINE_COLORS[idx % LINE_COLORS.length];
            const visible = !hiddenIds.has(m.user_id);
            const isHighlighted = m.user_id === highlightId;
            return (
              <button
                key={m.user_id}
                onClick={() => { setHighlightId(m.user_id); if (!visible) toggleVisible(m.user_id); }}
                onDoubleClick={() => toggleVisible(m.user_id)}
                className={cn(
                  CHART_VISUAL.pillBase,
                  visible ? CHART_VISUAL.pillVisible : CHART_VISUAL.pillHidden,
                  isHighlighted && visible && CHART_VISUAL.pillHighlighted
                )}
                title={visible ? "Dubbelklik om te verbergen" : "Klik om te tonen"}
              >
                <span
                  className="h-2 w-2 rounded-full transition-all"
                  style={{
                    backgroundColor: visible ? color : "transparent",
                    border: visible ? "none" : `1.5px solid ${color}`,
                    boxShadow: isHighlighted && visible ? `0 0 6px ${color}` : "none",
                  }}
                />
                <span className="truncate max-w-[110px]">{m.display_name}</span>
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <div className="mt-4" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={CHART_DATA} margin={{ top: 20, right: isMobile ? 8 : 24, left: -8, bottom: 4 }}>
              <defs>
                {DEMO_MEMBERS.map((m) => (
                  <filter key={m.user_id} id={`demo-glow-${m.user_id}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke={CHART_VISUAL.gridStroke} />
              <XAxis
                dataKey="stage"
                tick={CHART_VISUAL.xTick(isMobile)}
                axisLine={false}
                tickLine={false}
                padding={{ left: 12, right: 12 }}
                dy={6}
              />
              <YAxis
                allowDecimals={false}
                tick={CHART_VISUAL.yTick(isMobile)}
                width={40}
                axisLine={false}
                tickLine={false}
                domain={[0, "auto"]}
                tickCount={isMobile ? 5 : 6}
              />
              <ReferenceLine
                x="E8"
                stroke="hsl(var(--primary))"
                strokeWidth={1}
                strokeDasharray="3 4"
                strokeOpacity={0.6}
                label={{ value: "NU", position: "top", fill: "hsl(var(--primary))", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}
              />
              <Tooltip
                cursor={CHART_VISUAL.tooltipCursor}
                content={(props: any) => {
                  const { active, payload, label } = props;
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as Record<string, any>;
                  const visible = DEMO_MEMBERS.filter((m) => !hiddenIds.has(m.user_id));
                  const sorted = [...visible].sort((a, b) => (row[`rank_${a.user_id}`] ?? 999) - (row[`rank_${b.user_id}`] ?? 999));
                  return (
                    <div className={CHART_VISUAL.tooltipClass} style={{ padding: "10px 12px", maxWidth: 240 }}>
                      <div className="font-display font-semibold text-sm mb-2 text-foreground flex items-baseline gap-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Etappe</span>
                        <span>{String(label).replace("E", "")}</span>
                      </div>
                      <div className="space-y-1">
                        {sorted.map((m) => {
                          const idx = DEMO_MEMBERS.findIndex((r) => r.user_id === m.user_id);
                          const color = LINE_COLORS[idx % LINE_COLORS.length];
                          const rank = row[`rank_${m.user_id}`];
                          const pts = row[`pts_${m.user_id}`] ?? 0;
                          const delta = row[`delta_${m.user_id}`] ?? 0;
                          return (
                            <div key={m.user_id} className="flex items-center gap-2 py-0.5 px-1 -mx-1 rounded">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="w-5 tabular-nums text-muted-foreground/60 text-[10px]">#{rank}</span>
                              <span className="truncate flex-1 text-foreground/80">{m.display_name}</span>
                              <span className="tabular-nums font-medium text-foreground">{pts}</span>
                              {delta > 0 && <span className="tabular-nums text-emerald-600 text-[10px] font-semibold">+{delta}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              {DEMO_MEMBERS.map((m, idx) => {
                if (hiddenIds.has(m.user_id)) return null;
                const color = LINE_COLORS[idx % LINE_COLORS.length];
                const isHighlighted = m.user_id === highlightId;
                const dimmed = highlightId && !isHighlighted;
                return (
                  <Line
                    key={m.user_id}
                    type="monotone"
                    dataKey={`pts_${m.user_id}`}
                    stroke={color}
                    strokeWidth={isHighlighted ? 3 : 1.75}
                    strokeOpacity={dimmed ? 0.25 : 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={isHighlighted ? `url(#demo-glow-${m.user_id})` : undefined}
                    dot={false}
                    activeDot={{ r: isHighlighted ? 6 : 4, strokeWidth: 2, stroke: CHART_VISUAL.activeDotStroke, fill: color }}
                    animationDuration={700}
                    animationEasing="ease-out"
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        <div className={CHART_VISUAL.footerText}>
          <span className={CHART_VISUAL.footerLine} />
          <span>Cumulatieve punten</span>
          <span className={CHART_VISUAL.footerLine} />
        </div>
      </div>
    </div>
  );
}
