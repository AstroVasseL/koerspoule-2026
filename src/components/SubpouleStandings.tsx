import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Swords } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import TeamComparison from "@/components/TeamComparison";
import SubpouleEvolutionChart, { LINE_COLORS } from "@/components/SubpouleEvolutionChart";
import { cn } from "@/lib/utils";

type Props = {
  subpouleId: string;
  subpouleName: string;
};

export default function SubpouleStandings({ subpouleId, subpouleName }: Props) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data: members = [], isLoading: membersLoading } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);

  // Members → entries
  const memberRows = useMemo(() => {
    return members
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return {
          user_id: m.user_id,
          display_name: m.display_name,
          team_name: entry?.team_name ?? null,
          entry_id: entry?.id ?? null,
          total_points: entry?.total_points ?? 0,
        };
      })
      .sort((a, b) => b.total_points - a.total_points);
  }, [members, entries]);

  // Default highlight = current user, fallback to leader
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    if (highlightId) return;
    const me = memberRows.find((m) => m.user_id === user?.id);
    setHighlightId(me?.user_id ?? memberRows[0]?.user_id ?? null);
  }, [memberRows, user?.id, highlightId]);

  // Compare opponent
  const [compareId, setCompareId] = useState<string | null>(null);
  const compareMember = memberRows.find((m) => m.user_id === compareId);



  if (membersLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Klassement laden…</CardContent>
      </Card>
    );
  }
  if (memberRows.length === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Nog geen leden in deze subpoule.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Standings table */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Subpoule klassement — {subpouleName}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {memberRows.map((m, idx) => {
              const isMe = m.user_id === user?.id;
              const isHighlighted = m.user_id === highlightId;
              const isComparing = m.user_id === compareId;
              const colorIdx = memberRows.findIndex((r) => r.user_id === m.user_id) % LINE_COLORS.length;
              return (
                <div
                  key={m.user_id}
                  className={cn(
                    "p-3 flex items-center justify-between gap-3 transition-colors",
                    isHighlighted && "bg-primary/10",
                    isComparing && "bg-accent/10"
                  )}
                >
                  <button
                    onClick={() => setHighlightId(m.user_id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80"
                  >
                    <span className="font-display text-lg font-bold w-6 text-center text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: LINE_COLORS[colorIdx] }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate text-slate-800">{m.display_name}</span>
                        {idx === 0 && <Crown className="h-3 w-3 text-primary" />}
                        {isMe && (
                          <Badge variant="outline" className="text-xs">jij</Badge>
                        )}
                        {!m.entry_id && (
                          <Badge variant="secondary" className="text-xs">geen team</Badge>
                        )}
                      </div>
                      {m.team_name && (
                        <div className="text-xs text-muted-foreground truncate">{m.team_name}</div>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="font-display font-bold text-lg tabular-nums">
                      {m.total_points}
                      <span className="text-xs font-normal text-muted-foreground ml-1">pt</span>
                    </div>
                    {!isMe && m.entry_id && (

                      <button
                        onClick={() => setCompareId(isComparing ? null : m.user_id)}
                        className={cn(
                          "p-1.5 rounded border border-border hover:bg-accent/20 transition-colors",
                          isComparing && "bg-accent/30 border-accent"
                        )}
                        title={isComparing ? "Vergelijking sluiten" : "Vergelijk met jouw team"}
                      >
                        <Swords className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Head-to-head comparison: alleen zichtbaar zodra de koers live is */}
      {compareMember && ["live", "locked", "finished", "closed"].includes(String(game?.status ?? "")) && (
        <TeamComparison
          opponentUserId={compareMember.user_id}
          opponentName={compareMember.display_name}
          subpouleId={subpouleId}
        />
      )}

      {/* Per-stage cumulative line chart — herbruikbare component */}
      <SubpouleEvolutionChart subpouleId={subpouleId} />
    </div>
  );
}
