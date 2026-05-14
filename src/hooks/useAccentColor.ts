import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

type AccentPalette = {
  primary: string;
  primaryForeground: string;
};

// HSL strings in the same format used by CSS vars (no hsl() wrapper)
export const RACE_PALETTES: Record<string, AccentPalette> = {
  giro:   { primary: "330 60% 65%", primaryForeground: "0 0% 100%" },
  tdf:    { primary: "48 90% 50%",  primaryForeground: "240 12% 11%" },
  vuelta: { primary: "0 78% 45%",   primaryForeground: "0 0% 100%" },
};

const DEFAULT_PALETTE = RACE_PALETTES.giro;

function applyPalette(p: AccentPalette) {
  const root = document.documentElement;
  root.style.setProperty("--primary", p.primary);
  root.style.setProperty("--primary-foreground", p.primaryForeground);
  root.style.setProperty("--ring", p.primary);
  root.style.setProperty("--jersey-pink", p.primary);
  root.style.setProperty("--sidebar-primary", p.primary);
  root.style.setProperty("--sidebar-ring", p.primary);
  root.style.setProperty("--sidebar-primary-foreground", p.primaryForeground);
}

export function useAccentColor() {
  const { data: activeGame } = useQuery({
    queryKey: ["active-game-accent"],
    queryFn: async () => {
      if (!supabase) return null;
      // Try with accent_color first; fall back if column doesn't exist yet
      const { data, error } = await (supabase as any)
        .from("games")
        .select("id, game_type, accent_color")
        .in("status", ["live", "open"])
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        // accent_color column may not exist — retry without it
        const { data: fallback } = await (supabase as any)
          .from("games")
          .select("id, game_type")
          .in("status", ["live", "open"])
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        return fallback ? { ...fallback, accent_color: null } : null;
      }
      return data as { id: string; game_type: string | null; accent_color: string | null } | null;
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!activeGame) return;

    if (activeGame.accent_color) {
      const gameType = activeGame.game_type ?? "giro";
      const basePalette = RACE_PALETTES[gameType] ?? DEFAULT_PALETTE;
      applyPalette({ primary: activeGame.accent_color, primaryForeground: basePalette.primaryForeground });
      return;
    }

    const palette = RACE_PALETTES[activeGame.game_type ?? "giro"] ?? DEFAULT_PALETTE;
    applyPalette(palette);
  }, [activeGame]);
}
