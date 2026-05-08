import { Link } from "react-router-dom";
import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  Cell,
} from "recharts";
import { TrendingUp, Dices, Layers, ArrowRight, Sparkles, Lock } from "lucide-react";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// --- Mock subpoule lijngrafiek (etappe-evolutie) ---
const subpouleData = [
  { stage: "E1", JIJ: 38, Marco: 42, Eddy: 30, Tadej: 50 },
  { stage: "E5", JIJ: 180, Marco: 165, Eddy: 145, Tadej: 210 },
  { stage: "E9", JIJ: 320, Marco: 295, Eddy: 280, Tadej: 360 },
  { stage: "E13", JIJ: 480, Marco: 440, Eddy: 410, Tadej: 510 },
  { stage: "E17", JIJ: 640, Marco: 605, Eddy: 555, Tadej: 670 },
  { stage: "E21", JIJ: 812, Marco: 770, Eddy: 705, Tadej: 845 },
];

// --- Mock Monte Carlo histogram ---
const monteCarloData = (() => {
  const buckets: { score: number; count: number }[] = [];
  // Bell-curve achtige distributie
  for (let i = 0; i < 18; i++) {
    const x = i;
    const y = Math.round(80 * Math.exp(-Math.pow((x - 9) / 3.2, 2)) + Math.random() * 8);
    buckets.push({ score: 400 + i * 50, count: y });
  }
  return buckets;
})();
const userScore = 1010; // index ~12 → percentiel ~85

export default function FeaturePreview() {
  const { data: game } = useCurrentGame();
  const { data: categories = [] } = useCategories(game?.id);
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  const previewCategories = useMemo(() => {
    if (categories.length > 0) return categories.slice(0, 6);
    // Fallback voor gebruikers zonder game-data
    return [
      { id: "1", name: "Algemeen klassement", short_name: "GC favorieten", max_picks: 1 },
      { id: "2", name: "Klimmers", short_name: "Bergkoning", max_picks: 1 },
      { id: "3", name: "Sprinters", short_name: "Massasprint", max_picks: 1 },
      { id: "4", name: "Aanvallers", short_name: "Baroudeurs", max_picks: 1 },
      { id: "5", name: "Tijdrijders", short_name: "Chrono", max_picks: 1 },
      { id: "6", name: "Belofte", short_name: "Baby Giro", max_picks: 1 },
    ] as Array<{ id: string; name: string; short_name: string | null; max_picks: number }>;
  }, [categories]);

  const ctaPrimary = isLoggedIn ? "/team-samenstellen" : "/login";

  return (
    <section className="container mx-auto px-4 py-16 md:py-20">
      {/* Heading */}
      <div className="max-w-3xl mx-auto text-center mb-10">
        <div className="vintage-ornament max-w-xs mx-auto mb-4">
          <span className="vintage-ornament-symbol">✦</span>
          <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
            Wat krijg je?
          </span>
          <span className="vintage-ornament-symbol">✦</span>
        </div>
        <h2 className="vintage-heading text-3xl md:text-4xl font-bold mb-3">
          Wielerdata zoals in de ploegleiderswagen
        </h2>
        <p className="text-muted-foreground font-serif italic">
          Categorieën, voorspellingen en analyses — van subpoule-grafieken tot de "Aap met de dartpijl"
          simulatie die jouw team afzet tegen 5.000 willekeurige ploegen.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
        {/* Subpoule grafiek */}
        <article className="ornate-frame retro-border bg-card p-5 group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary opacity-70" />
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Subpoule
            </span>
          </div>
          <h3 className="font-display text-lg font-bold mb-3">Etappe-evolutie</h3>
          <div className="h-44 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subpouleData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="Tadej" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Marco" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} opacity={0.6} />
                <Line type="monotone" dataKey="Eddy" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} opacity={0.4} />
                <Line type="monotone" dataKey="JIJ" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-serif italic">
            Volg jouw klim op de algemene ranglijst — etappe per etappe.
          </p>
        </article>

        {/* Monte Carlo (extra nadruk) */}
        <article className="ornate-frame border-2 border-[hsl(var(--vintage-gold))] bg-gradient-to-br from-card to-[hsl(var(--vintage-gold))/0.06] p-5 group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden lg:scale-[1.02] shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--vintage-gold))] via-primary to-[hsl(var(--vintage-gold))]" />
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Dices className="h-5 w-5 text-[hsl(var(--vintage-gold))]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Hors Catégorie
              </span>
            </div>
            <span className="jersey-badge bg-[hsl(var(--vintage-gold))/0.15] text-[hsl(var(--vintage-gold))] border border-[hsl(var(--vintage-gold))/0.5]">
              <Sparkles className="h-3 w-3" /> Uniek
            </span>
          </div>
          <h3 className="font-display text-lg font-bold mb-3">Monte Carlo simulatie</h3>
          <div className="h-44 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monteCarloData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="score" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine
                  x={1000}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  label={{ value: "JIJ", fill: "hsl(var(--primary))", fontSize: 10, position: "top" }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {monteCarloData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.score >= userScore ? "hsl(var(--vintage-gold))" : "hsl(var(--muted-foreground) / 0.45)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-serif italic">
            5.000 willekeurige ploegen → jij scoort beter dan <strong className="text-foreground">85%</strong>.
            Aap met de dartpijl verslagen.
          </p>
        </article>

        {/* Categorieën preview */}
        <article className="ornate-frame retro-border bg-card p-5 group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary opacity-70" />
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Openbaar
            </span>
          </div>
          <h3 className="font-display text-lg font-bold mb-3">Categorieën &amp; voorspellingen</h3>
          <div className="space-y-1.5">
            {previewCategories.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-secondary/30 hover:bg-secondary hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium font-sans text-sm truncate">
                    {c.short_name ?? c.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {c.max_picks}× pick
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-serif italic">
              + 2 jokers &amp; podium-voorspelling
            </span>
            <Link
              to="/regels"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Ontdek <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </article>
      </div>

      {/* CTA row — duidelijk onderscheid publiek vs account */}
      <div className="ornate-frame retro-border bg-gradient-to-r from-card via-secondary/40 to-card p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <p className="font-display font-bold text-lg mb-1">
            {isLoggedIn ? "Klaar voor de volgende etappe?" : "Verken vrij — speel mee met een account"}
          </p>
          <p className="text-sm text-muted-foreground font-serif italic">
            {isLoggedIn
              ? "Stel je ploeg samen of bekijk je analyses in Mijn Peloton."
              : "Categorieën, regels en uitslagen zijn openbaar. Inzenden vraagt een gratis account."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link
            to="/uitslagen"
            className="px-4 py-2 text-sm font-medium border-2 border-foreground rounded-md hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
          >
            Bekijk uitslagen
          </Link>
          <Link
            to="/regels"
            className="px-4 py-2 text-sm font-medium border-2 border-foreground rounded-md hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
          >
            Ontdek analyses
          </Link>
          <Link
            to={ctaPrimary}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-md inline-flex items-center gap-1.5 transition-colors",
              "bg-primary text-primary-foreground border-2 border-foreground hover:bg-primary/90"
            )}
          >
            {isLoggedIn ? (
              <>Doe mee <ArrowRight className="h-4 w-4" /></>
            ) : (
              <><Lock className="h-3.5 w-3.5" /> Maak account & doe mee</>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}
