import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PoolParticipant } from "@/data/poolStandings";

interface PoolStandingsData {
  top: PoolParticipant[];
  myEntry: PoolParticipant | null;
  showGap: boolean;
  totalParticipants: number;
}

function RankBadge({ rank, size = "md" }: { rank: number; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "w-5 h-5 text-xs" : "w-6 h-6 text-xs";
  return (
    <span className={cn(
      sizeClasses, "rounded-full flex items-center justify-center font-bold",
      rank === 1 && "bg-primary text-primary-foreground",
      rank === 2 && "bg-muted text-foreground",
      rank === 3 && "bg-vintage-gold text-primary-foreground",
      rank > 3 && "text-muted-foreground"
    )}>
      {rank}
    </span>
  );
}

function PoolRow({
  participant,
  valueKey,
  unit,
  isMe,
  highlight,
}: {
  participant: PoolParticipant;
  valueKey: "stagePoints" | "totalPoints";
  unit: string;
  isMe: boolean;
  highlight?: boolean;
}) {
  const value = valueKey === "stagePoints" ? participant.stagePoints : participant.totalPoints;
  return (
    <div className={cn(
      "flex items-center justify-between px-2.5 py-1.5 text-sm transition-colors",
      isMe && "bg-primary/10 border-l-4 border-l-primary",
      highlight && "bg-primary/10",
      participant.rank <= 3 && !isMe && "bg-primary/5",
    )}>
      <div className="flex items-center gap-2">
        <RankBadge rank={participant.rank} size="sm" />
        <span className={cn("font-sans font-medium", isMe && "text-primary font-bold")}>
          {participant.userName}
          {isMe && <span className="ml-1.5 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">JIJ</span>}
        </span>
      </div>
      <span className={cn("font-bold text-xs", isMe ? "text-primary" : "text-accent")}>
        {value ?? 0} {unit}
      </span>
    </div>
  );
}

export default function PoolStandingsList({
  data,
  allParticipants,
  valueKey,
  unit,
  myName,
}: {
  data: PoolStandingsData;
  allParticipants: PoolParticipant[];
  valueKey: "stagePoints" | "totalPoints";
  unit: string;
  myName: string;
}) {
  const [search, setSearch] = useState("");

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allParticipants
      .filter(p => p.userName.toLowerCase().includes(q))
      .slice(0, 20);
  }, [search, allParticipants]);

  return (
    <div>
      {/* Search input */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Zoek deelnemer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Results */}
      <div className="divide-y divide-border">
        {searchResults ? (
          searchResults.length > 0 ? (
            searchResults.map((p) => (
              <PoolRow key={`${p.rank}-${p.userName}`} participant={p} valueKey={valueKey} unit={unit} isMe={p.userName === myName} />
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Geen deelnemers gevonden voor "{search}"
            </div>
          )
        ) : (
          <>
            {data.top.map((p) => (
              <PoolRow key={p.rank} participant={p} valueKey={valueKey} unit={unit} isMe={p.userName === myName} />
            ))}
            {data.showGap && (
              <>
                <div className="flex items-center justify-center py-1.5 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </div>
                {data.myEntry && (
                  <PoolRow participant={data.myEntry} valueKey={valueKey} unit={unit} isMe highlight />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { RankBadge };
