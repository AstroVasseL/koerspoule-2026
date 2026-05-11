import { useSubpouleBenchmark } from "@/hooks/useSubpouleBenchmark";
import BenchmarkPanel from "@/components/BenchmarkPanel";

type Props = { subpouleId: string; gameId?: string };

export default function SubpouleBenchmark({ subpouleId, gameId }: Props) {
  const { data, isLoading } = useSubpouleBenchmark(subpouleId, gameId);
  return (
    <BenchmarkPanel
      data={data}
      isLoading={isLoading}
      scopeLabel="binnen subpoule"
      emptyOpponentsHint="Geen andere deelnemers in deze subpoule."
    />
  );
}
