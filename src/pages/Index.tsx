/**
 * src/pages/Index.tsx — drop-in vervanger
 *
 * Behoudt t.o.v. de oude Index.tsx:
 *   - useNavigate, lazy imports voor FeaturePreview + HorsCategoriePreview
 *   - smoothScrollTo / smoothScrollToTop
 *   - <CountdownBanner /> in CTA-blok
 *   - features-array voor "Hoe werkt het?"
 *   - shadcn <Button> en react-router <Link>
 *
 * Nieuw t.o.v. de oude:
 *   - Race-aware hero met groot Playfair-titelblok + KoerspouleLogo sticker
 *   - Stats-strip (etappes / km / hm / inzet)
 *   - "De Courant" sectie: top-5 klassement + sparkline + mop van de dag
 *   - Caveat margin-notes en stickers
 *
 * Dependencies (alles al aanwezig in jouw repo behalve KoerspouleLogo):
 *   - @/components/KoerspouleLogo   ← nieuw, zie merge/KoerspouleLogo.tsx
 *   - @/components/CountdownBanner
 *   - @/components/FeaturePreview
 *   - @/components/HorsCategoriePreview
 *   - @/components/ui/button (shadcn)
 *   - @/hooks/useCurrentGame
 *   - @/lib/utils (smoothScrollTo / smoothScrollToTop)
 *   - lucide-react (Trophy, Users, Bike, BookOpen)
 */

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import RubriekBlock from "@/components/RubriekBlock";
import { Bike, BookOpen, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import CountdownBanner from "@/components/CountdownBanner";
import KoerspouleLogo, { type RaceKey } from "@/components/KoerspouleLogo";
import koerspouleLogo from "@/assets/koerspoule-logo-2026.png";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useAuth } from "@/hooks/useAuth";
import { useGameBenchmark } from "@/hooks/useSubpouleBenchmark";
import type { EntryStanding } from "@/hooks/useResults";
import { smoothScrollTo, smoothScrollToTop } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Race-aware copy
// ─────────────────────────────────────────────────────────────────────────────

type RaceCopy = {
  longName: string;
  line1: string;
  line2: string;
  yearTag: string; // korte editie (klein, accent)
  edition: string; // volledige editie-string voor eyebrow
  jersey: string;
  startToFinish: string; // bv. "9–31 mei 2026"
};

const RACE_COPY: Record<RaceKey, RaceCopy> = {
  giro: {
    longName: "Giro d'Italia",
    line1: "Giro",
    line2: "d'Italia",
    yearTag: "'26",
    edition: "Edizione N°109 · 9–31 mei MMXXVI",
    jersey: "maglia rosa",
    startToFinish: "9–31 mei 2026",
  },
  tdf: {
    longName: "Tour de France",
    line1: "Tour de",
    line2: "France",
    yearTag: "'26",
    edition: "Édition 113 · 4–26 juillet MMXXVI",
    jersey: "maillot jaune",
    startToFinish: "4–26 juli 2026",
  },
  vuelta: {
    longName: "Vuelta a España",
    line1: "Vuelta a",
    line2: "España",
    yearTag: "'26",
    edition: "Edición 81 · 22 ago–13 sep MMXXVI",
    jersey: "maillot rojo",
    startToFinish: "22 aug–13 sep 2026",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Spelregels (uit de oude Index.tsx — onveranderd)
// ─────────────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Bike,
    title: "Stel je ploeg samen",
    desc: "Kies uit 21 categorieën jouw droomrenners en voeg 2 jokers toe.",
  },
  {
    icon: Users,
    title: "Daag je vrienden uit",
    desc: "Maak een subpoule aan en strijd tegen je vrienden om de eer.",
  },
  {
    icon: Trophy,
    title: "Scoor punten",
    desc: "Verdien punten per etappe en met klassementsvoorspellingen.",
  },
  {
    icon: BookOpen,
    title: "Helder reglement",
    desc: "De jury heeft altijd gelijk. Zo niet, dan toch.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// "De Courant" — top 5 + sparkline + mop. Voor nu mock, hooks komen later.
// ─────────────────────────────────────────────────────────────────────────────

type TopFiveRow = {
  p: number;
  name: string;
  team: string;
  pts: number;
  jersey?: string | null;
  you?: boolean;
  spark: string;
};

// TODO: vervang door useSubpouleStandings() of useResults() zodra de game live is.
const MOCK_TOP_FIVE: TopFiveRow[] = [
  { p: 1, name: "Jan Bakker",      team: "Cipollini Memorial", pts: 832, jersey: "hsl(var(--primary))",      spark: "0,3 5,2 10,1 15,2 20,3 25,4 30,5 35,6 40,7 45,8 50,9 55,10 60,12 65,13 70,14" },
  { p: 2, name: "Eva Klootwijk",   team: "Team Bidon",          pts: 794, jersey: "hsl(var(--jersey-giallo))", spark: "0,12 5,10 10,9 15,8 20,7 25,7 30,8 35,8 40,9 45,9 50,10 55,10 60,11 65,11 70,12" },
  { p: 3, name: "Marco Terpstra",  team: "La Salsiccia",        pts: 752, jersey: "hsl(var(--jersey-verde))",  spark: "0,0 5,1 10,3 15,2 20,4 25,5 30,6 35,6 40,7 45,7 50,8 55,8 60,9 65,9 70,10" },
  { p: 4, name: "Sophie de Bruin", team: "Pogi Boys",           pts: 711, jersey: null,                         spark: "0,8 5,7 10,7 15,6 20,6 25,6 30,6 35,7 40,7 45,8 50,8 55,9 60,9 65,10 70,10" },
  { p: 5, name: "Henk Verheijen",  team: "Tiramisuper",         pts: 688, jersey: null, you: true,             spark: "0,13 5,12 10,11 15,11 20,10 25,10 30,9 35,8 40,8 45,7 50,7 55,6 60,6 65,5 70,4" },
];

// TODO: vervang door useEntry() sparkline-data
const MOCK_MY_PROGRESS = {
  from: 11,
  to: 5,
  pointsPolygon: "0,90 40,84 80,75 120,72 160,60 200,48 240,40 280,32 280,120 0,120",
  pointsLine:    "0,90 40,84 80,75 120,72 160,60 200,48 240,40 280,32",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Index() {
  const navigate = useNavigate();
  const { data: currentGame } = useCurrentGame();

  // useCurrentGame() levert (vermoedelijk) een object met `game_type`. Als jouw
  // hook anders heet of een andere shape teruggeeft, pas deze ene regel aan.
  const race = ((currentGame as { game_type?: string } | null | undefined)?.game_type ??
    "giro") as RaceKey;
  const copy = RACE_COPY[race];

  const { user } = useAuth();
  const gameId = currentGame?.id;

  // Single source of truth: game_benchmark_data RPC (SECURITY DEFINER).
  // Returns entries sorted by total_points DESC, approved stages with results,
  // and stage_points for all entries — all consistently filtered to approved results.
  // Only call when logged in (the RPC raises if auth.uid() IS NULL).
  const { data: benchmark } = useGameBenchmark(user ? gameId : undefined);

  const allEntries: EntryStanding[] = useMemo(
    () =>
      (benchmark?.entries ?? [])
        .filter((e) => e.entry_id != null)
        .map((e) => ({
          id: e.entry_id!,
          user_id: e.user_id,
          team_name: e.team_name,
          total_points: e.total_points,
          display_name: e.display_name ?? null,
        })),
    [benchmark]
  );
  // benchmark.stages: only approved stages that have stage_results (sorted by stage_number)
  const approvedStages = useMemo(() => benchmark?.stages ?? [], [benchmark]);
  const stagePoints = useMemo(() => benchmark?.stage_points ?? [], [benchmark]);
  // Last approved stage with results = last element of benchmark.stages
  const lastStage = approvedStages.length > 0 ? approvedStages[approvedStages.length - 1] : null;

  const sortedEntries = useMemo(
    () => [...allEntries].sort((a, b) => b.total_points - a.total_points),
    [allEntries]
  );
  const myEntry = useMemo(
    () => (user ? allEntries.find((e) => e.user_id === user.id) : undefined),
    [allEntries, user]
  );
  const myRank = useMemo(
    () => (myEntry ? sortedEntries.findIndex((e) => e.id === myEntry.id) + 1 : null),
    [sortedEntries, myEntry]
  );

  const cumulativeByEntry = useMemo(() => {
    const map = new Map<string, number[]>();
    if (!approvedStages.length || !allEntries.length) return map;
    for (const e of allEntries) map.set(e.id, []);
    const ptsByKey = new Map(stagePoints.map((sp) => [`${sp.stage_id}:${sp.entry_id}`, sp.points]));
    for (const stage of approvedStages) {
      for (const e of allEntries) {
        const arr = map.get(e.id)!;
        const prev = arr.length ? arr[arr.length - 1] : 0;
        arr.push(prev + (ptsByKey.get(`${stage.id}:${e.id}`) ?? 0));
      }
    }
    return map;
  }, [approvedStages, allEntries, stagePoints]);

  const maxCumulative = useMemo(() => {
    let max = 1;
    for (const arr of cumulativeByEntry.values()) {
      const last = arr[arr.length - 1] ?? 0;
      if (last > max) max = last;
    }
    return max;
  }, [cumulativeByEntry]);

  const myRankProgression = useMemo(() => {
    if (!myEntry || !approvedStages.length) return [];
    return approvedStages.map((_, i) => {
      const sorted = [...allEntries].sort(
        (a, b) => (cumulativeByEntry.get(b.id)?.[i] ?? 0) - (cumulativeByEntry.get(a.id)?.[i] ?? 0)
      );
      return sorted.findIndex((e) => e.id === myEntry.id) + 1;
    });
  }, [myEntry, approvedStages, allEntries, cumulativeByEntry]);

  const hasStageData = approvedStages.length > 0 && allEntries.length > 0;
  const showRealData = Boolean(user) && hasStageData;
  const showRealSparkline = Boolean(user) && myEntry !== undefined && myRankProgression.length >= 2;

  const JERSEY_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--jersey-giallo))",
    "hsl(var(--jersey-verde))",
    null,
    null,
  ];

  const realTopFive: TopFiveRow[] = useMemo(() => {
    if (!showRealData) return [];
    return sortedEntries.slice(0, 5).map((entry, i) => {
      const cumulArr = cumulativeByEntry.get(entry.id) ?? [];
      const n = cumulArr.length;
      const spark =
        n === 0
          ? "0,14 70,14"
          : cumulArr
              .map((v, j) => {
                const x = n === 1 ? 35 : (j / (n - 1)) * 70;
                const y = 14 - (v / maxCumulative) * 12;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
      return {
        p: i + 1,
        name: entry.display_name ?? entry.team_name ?? "Deelnemer",
        team: entry.team_name ?? "",
        pts: entry.total_points,
        jersey: JERSEY_COLORS[i] ?? null,
        you: entry.user_id === user?.id,
        spark,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRealData, sortedEntries, cumulativeByEntry, maxCumulative, user?.id]);

  const myRowOutsideTop5: TopFiveRow | null = useMemo(() => {
    if (!showRealData || !myEntry || !myRank || myRank <= 5) return null;
    const cumulArr = cumulativeByEntry.get(myEntry.id) ?? [];
    const n = cumulArr.length;
    const spark =
      n === 0
        ? "0,14 70,14"
        : cumulArr
            .map((v, j) => {
              const x = n === 1 ? 35 : (j / (n - 1)) * 70;
              const y = 14 - (v / maxCumulative) * 12;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");
    return {
      p: myRank,
      name: myEntry.display_name ?? myEntry.team_name ?? "Jij",
      team: myEntry.team_name ?? "",
      pts: myEntry.total_points,
      jersey: null,
      you: true,
      spark,
    };
  }, [showRealData, myEntry, myRank, cumulativeByEntry, maxCumulative]);

  const myProgress = useMemo(() => {
    if (!showRealSparkline) return MOCK_MY_PROGRESS;
    const n = myRankProgression.length;
    const total = allEntries.length || 1;
    const W = 280, H = 120;
    const pts = myRankProgression.map((rank, i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
      const t = total > 1 ? (rank - 1) / (total - 1) : 0;
      const y = 20 + t * 80;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = pts.join(" ");
    const lastX = n === 1 ? W / 2 : W;
    return {
      from: myRankProgression[0],
      to: myRankProgression[n - 1],
      pointsPolygon: `${line} ${lastX.toFixed(1)},${H} 0,${H}`,
      pointsLine: line,
    };
  }, [showRealSparkline, myRankProgression, allEntries.length]);

  const myProgressEndY = useMemo(() => {
    if (!showRealSparkline) return 32;
    const n = myRankProgression.length;
    const total = allEntries.length || 1;
    const rank = myRankProgression[n - 1];
    const t = total > 1 ? (rank - 1) / (total - 1) : 0;
    return 20 + t * 80;
  }, [showRealSparkline, myRankProgression, allEntries.length]);

  const rankChangeText = useMemo(() => {
    if (!showRealSparkline || myRankProgression.length < 2) return "+6 in 4 etappes 🔥";
    const change = myRankProgression[0] - myRankProgression[myRankProgression.length - 1];
    const n = myRankProgression.length;
    if (change > 0) return `+${change} in ${n} etappes 🔥`;
    if (change < 0) return `${change} in ${n} etappes 📉`;
    return `stabiel in ${n} etappes`;
  }, [showRealSparkline, myRankProgression]);

  const totalEntries = allEntries.length || 11;
  const midRankLabel = `P${Math.round(1 + (totalEntries - 1) * 0.5)}`;
  const lastRankLabel = `P${showRealData ? totalEntries : 11}`;

  return (
    <div>
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="gradient-border-bottom relative overflow-hidden">
        {/* Subtle grid behind hero */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg, transparent, transparent 40px, hsl(var(--foreground)) 40px, hsl(var(--foreground)) 41px
            ), repeating-linear-gradient(
              90deg, transparent, transparent 40px, hsl(var(--foreground)) 40px, hsl(var(--foreground)) 41px
            )`,
          }}
        />

        <div className="container mx-auto px-5 md:py-20 relative py-[30px] pt-[20px] pb-[20px] border-0">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 md:gap-14 items-center">
            {/* Linker kolom — koers + CTAs + stats */}
            <div className="relative">
              <span className="editor-eyebrow text-lg">{copy.edition}</span>

              <h1
                className="font-display font-black mt-4 leading-[0.88] tracking-[-0.025em] text-6xl md:text-[92px]"
                style={{ letterSpacing: "-0.025em" }}
              >
                <span>{copy.line1}</span>
                <br />
                <span>{copy.line2}</span>{" "}
                <span className="relative inline-block">
                  <span
                    aria-hidden
                    className="absolute left-1 -right-1 bottom-2 md:bottom-2.5 h-3 md:h-3.5 -rotate-1"
                    style={{ background: "hsl(var(--vintage-gold) / 0.6)" }}
                  />
                  <span className="relative italic font-medium text-primary ml-3.5">
                    {copy.yearTag}
                  </span>
                </span>
              </h1>

              <span
                className="margin-note tilt-l hidden lg:inline-block absolute right-6 top-[200px] text-[22px]"
                aria-hidden
              >
                drie weken,
                <br />
                één <em>{copy.jersey}</em>
              </span>

              <p className="font-serif italic text-foreground/80 md:text-xl max-w-[480px] mt-6 leading-relaxed text-lg my-[2px] text-center">
                Iedereen denkt dat ze het beter weten dan de directeur sportif.
                <br />
                Dit is je kans om het te bewijzen.
              </p>

              <div className="flex flex-wrap gap-3 mt-7 items-center text-2xl">
                <Button asChild className="retro-border-primary font-bold">
                  <Link to="/team-samenstellen">🚴 Stel je ploeg samen</Link>
                </Button>
                <Button
                  variant="outline"
                  className="retro-border"
                  onClick={() => {
                    navigate("/uitslagen");
                    smoothScrollToTop();
                  }}
                >
                  Bekijk uitslagen
                </Button>
                <span className="margin-note tilt-l hidden md:inline-block ml-3 text-lg">
                  Gratis &amp; Uit Liefde voor de koers ✿
                </span>
              </div>

            </div>

            {/* Rechter kolom — transparant logo */}
            <div className="relative flex justify-center">
              <div className="relative w-full max-w-[420px]">
                <img
                  src={koerspouleLogo}
                  alt="Koerspoule logo"
                  className="w-full h-auto block drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DE COURANT ───────────────────────────────────────────────────── */}
      <section className="container mx-auto px-5 pt-10">
        <div className="flex justify-between items-baseline border-t-2 border-foreground pt-2 text-lg">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10.5, letterSpacing: "0.22em" }}
          >
            DE COURANT — VANDAAG
          </span>
          <span className="text-xs text-muted-foreground">{"\n"}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-foreground/20">
          {/* Top 5 */}
          <div className="py-5 md:pr-6 md:border-r border-foreground/10">
            <div className="text-xs text-muted-foreground mb-1">Klassement</div>
            <div className="font-display font-bold text-2xl leading-tight">
              De top vijf{lastStage ? ` na etappe ${lastStage.stage_number}` : ""}
            </div>
            <div className="mt-3">
              {(showRealData ? realTopFive : MOCK_TOP_FIVE).map((row) => (
                <TopFiveRow key={row.p} row={row} />
              ))}
              {myRowOutsideTop5 && (
                <>
                  <div className="py-1 text-center text-[10px] text-muted-foreground tracking-widest">
                    · · ·
                  </div>
                  <TopFiveRow row={myRowOutsideTop5} />
                </>
              )}
            </div>
            <Link
              to="/uitslagen"
              className="inline-block mt-3 text-xs text-primary font-semibold"
            >
              Heel klassement →
            </Link>
          </div>

          {/* Sparkline */}
          <div className="py-5 md:px-6 md:border-r border-foreground/10 relative">
            <div className="text-xs text-muted-foreground mb-1">Jouw koers</div>
            <div className="font-display font-bold text-2xl leading-tight">
              Van plek {myProgress.from} naar plek{" "}
              <span className="text-primary">{myProgress.to}</span>
            </div>
            <div className="mt-3 relative h-[130px]">
              <svg viewBox="0 0 280 120" className="w-full h-full">
                <defs>
                  <linearGradient id="kp-progress-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[20, 60, 100].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="280"
                    y2={y}
                    stroke="hsl(var(--foreground) / 0.1)"
                    strokeDasharray="2,4"
                  />
                ))}
                <polygon
                  points={myProgress.pointsPolygon}
                  fill="url(#kp-progress-grad)"
                />
                <polyline
                  points={myProgress.pointsLine}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />
                <circle cx="280" cy={myProgressEndY} r="4" fill="hsl(var(--primary))" />
                <text
                  x="278"
                  y="16"
                  textAnchor="end"
                  fontFamily="JetBrains Mono"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                >
                  P1
                </text>
                <text
                  x="278"
                  y="56"
                  textAnchor="end"
                  fontFamily="JetBrains Mono"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                >
                  {midRankLabel}
                </text>
                <text
                  x="278"
                  y="96"
                  textAnchor="end"
                  fontFamily="JetBrains Mono"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                >
                  {lastRankLabel}
                </text>
              </svg>
              <span className="margin-note tilt-l absolute right-2 -bottom-2 text-lg">
                {rankChangeText}
              </span>
            </div>
          </div>

          {/* Rubriek */}
          <RubriekBlock gameId={gameId} />
        </div>
      </section>

      {/* ─── HOE WERKT HET? ───────────────────────────────────────────────── */}
      <section
        id="stel-je-ploeg-samen"
        className="container mx-auto px-5 py-12 md:py-16 vintage-texture text-center scroll-mt-16"
      >
        <span className="editor-eyebrow text-lg">Spelregels, in vier alinea's</span>
        <h2 className="vintage-heading text-2xl md:text-3xl font-bold mt-3">Hoe werkt het?</h2>
        <div className="vintage-ornament max-w-[200px] mx-auto mt-3.5 mb-7">
          <span className="vintage-ornament-symbol">✦</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="ornate-frame retro-border bg-card p-6 animate-fade-in"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="flex items-baseline gap-3 mb-3">
                <span
                  className="font-display font-bold text-3xl text-primary leading-none"
                  aria-hidden
                >
                  {["I.", "II.", "III.", "IV."][i]}
                </span>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground m-0">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA + COUNTDOWN ──────────────────────────────────────────────── */}
      <section className="container mx-auto px-5 py-10 text-center">
        <div className="vintage-ornament max-w-xs mx-auto mb-5">
          <span className="vintage-ornament-symbol">❧</span>
        </div>
        <h2 className="vintage-heading text-2xl font-bold mb-3">Klaar om te koersen?</h2>
        <CountdownBanner className="max-w-md mx-auto mb-5" />
        <Button asChild className="retro-border-primary font-bold">
          <Link to="/team-samenstellen">Schrijf je in →</Link>
        </Button>
      </section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Stat({ value, label, last }: { value: string; label: string; last?: boolean }) {
  return (
    <div className={`px-4 py-[16px] ${last ? "" : "border-r border-foreground/10"}`}>
      <div className="font-display font-bold text-3xl leading-none tracking-[-0.02em]">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function TopFiveRow({ row }: { row: TopFiveRow }) {
  const lineColor =
    row.p === 1
      ? "hsl(var(--primary))"
      : row.you
        ? "hsl(var(--vintage-gold))"
        : "hsl(var(--muted-foreground))";
  return (
    <div
      className="grid items-center gap-2.5 py-2 border-b border-foreground/5"
      style={{ gridTemplateColumns: "22px 1fr 70px 50px" }}
    >
      <span
        className="font-display font-bold text-base"
        style={{ color: row.p === 1 ? "hsl(var(--primary))" : undefined }}
      >
        {row.p}
      </span>
      <span>
        <div className="text-[13px] font-semibold flex items-center gap-1.5">
          {row.jersey && (
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: row.jersey }}
              aria-hidden
            />
          )}
          {row.name}
          {row.you && (
            <span className="margin-note tilt-l text-base ml-1">← jij!</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">{row.team}</div>
      </span>
      <svg width="70" height="18" aria-hidden>
        <polyline
          points={row.spark}
          stroke={lineColor}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-mono text-xs font-bold text-right">{row.pts}</span>
    </div>
  );
}
