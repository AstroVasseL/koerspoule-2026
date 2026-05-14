import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type CategoryWithRiders = {
  id: string;
  name: string;
  short_name: string | null;
  sort_order: number;
  max_picks: number;
  game_id: string;
  category_riders: Array<{
    rider_id: string;
    riders: {
      id: string;
      name: string;
      start_number: number | null;
      team_id: string | null;
      firstcycling_id: number | null;
    } | null;
  }>;
};

export function useCategories(gameId?: string) {
  return useQuery({
    queryKey: ["categories", gameId],
    enabled: Boolean(gameId),
    queryFn: async (): Promise<CategoryWithRiders[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("categories")
        .select(
          "id, name, short_name, sort_order, max_picks, game_id, category_riders(rider_id, riders(id, name, start_number, team_id, firstcycling_id))"
        )
        .eq("game_id", gameId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as CategoryWithRiders[]) ?? [];
    },
  });
}
