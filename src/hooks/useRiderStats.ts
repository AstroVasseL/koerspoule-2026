import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type RiderSeasonResult = {
  date: string;
  race: string;
  race_url: string;
  category: string;
  result: string;
  stage: string | null;
};

export type RiderStats = {
  firstcycling_id: number;
  rider_name: string;
  rider_team: string;
  rider_nationality: string;
  results: RiderSeasonResult[];
};

export type FcRiderMatch = {
  fc_id: number;
  name: string;
  nationality: string;
  team: string;
};

async function invokeRiderStats(body: Record<string, unknown>) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await (supabase as any).functions.invoke("rider-stats", { body });
  if (error) throw error;
  return data;
}

export function useRiderStats(fcId: number | null | undefined) {
  return useQuery<RiderStats | null>({
    queryKey: ["rider-stats", fcId],
    enabled: Boolean(fcId),
    staleTime: 60 * 60 * 1000, // 1h (edge fn does 24h hard cache)
    queryFn: () => invokeRiderStats({ fc_id: fcId }),
  });
}

export function useRiderSearch(query: string) {
  return useQuery<FcRiderMatch[]>({
    queryKey: ["rider-search", query],
    enabled: query.trim().length >= 3,
    staleTime: 5 * 60 * 1000,
    queryFn: () => invokeRiderStats({ name: query.trim() }),
  });
}
