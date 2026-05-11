import { Card, CardContent } from "@/components/ui/card";
import BenchmarkPanel from "@/components/BenchmarkPanel";
import { useGameBenchmark } from "@/hooks/useSubpouleBenchmark";

type Props = { gameId?: string };

export default function BenchmarkTab({ gameId }: Props) {
  const { data, isLoading } = useGameBenchmark(gameId);

  if (!gameId) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          Kies eerst een actieve koers.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl">
      <BenchmarkPanel
        data={data}
        isLoading={isLoading}
        scopeLabel="alle deelnemers"
        emptyOpponentsHint="Nog geen andere deelnemers in deze koers."
      />
    </div>
  );
}
