import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type GameRow = {
  id: string;
  name: string;
  year: number;
  status: "concept" | "draft" | "open" | "locked" | "live" | "finished" | string;
  game_type: "giro" | "tour" | "vuelta" | string | null;
};

export function useAllGames() {
  return useQuery({
    queryKey: ["all-games"],
    queryFn: async (): Promise<GameRow[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("games")
        .select("id, name, year, status, game_type")
        .order("year", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as GameRow[];
      const typeOrder = (t: string | null | undefined) => {
        const k = (t ?? "").toLowerCase();
        if (k === "giro") return 0;
        if (k === "tour" || k === "tdf") return 1;
        if (k === "vuelta" || k === "vta") return 2;
        return 3;
      };
      return [...rows].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return typeOrder(a.game_type) - typeOrder(b.game_type);
      });
    },
  });
}

export function gameTheme(type: string | null | undefined): {
  country: "IT" | "FR" | "ES";
  colors: string[];
} {
  switch ((type ?? "").toLowerCase()) {
    case "tour":
    case "tdf":
      return { country: "FR", colors: ["#002395", "#ffffff", "#ED2939"] };
    case "vuelta":
    case "vta":
      return { country: "ES", colors: ["#AA151B", "#F1BF00", "#AA151B"] };
    case "giro":
    default:
      return { country: "IT", colors: ["#009246", "#ffffff", "#CE2B37"] };
  }
}
