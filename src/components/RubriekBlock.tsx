import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useActiveRubriek,
  useRubriekVoteCounts,
  useMyRubriekVote,
  useRubriekVoteMutation,
} from "@/hooks/useRubriek";

type Props = { gameId?: string };

export default function RubriekBlock({ gameId }: Props) {
  const { user } = useAuth();
  const { data: item } = useActiveRubriek(gameId);
  const { data: voteCounts = new Map() } = useRubriekVoteCounts(item?.type === "poll" ? item.id : undefined);
  const { data: myVoteOptionId } = useMyRubriekVote(
    item?.type === "poll" ? item.id : undefined,
    user?.id
  );
  const castVote = useRubriekVoteMutation();
  const [voting, setVoting] = useState(false);
  const [localVote, setLocalVote] = useState<string | null>(null);

  const totalVotes = [...voteCounts.values()].reduce((s, n) => s + n, 0);
  const hasVoted = Boolean(myVoteOptionId ?? localVote);
  const myVote = myVoteOptionId ?? localVote;

  async function handleVote(optionId: string) {
    if (!user || voting || hasVoted) return;
    setVoting(true);
    const result = await castVote(item!.id, optionId);
    if (result === "ok") setLocalVote(optionId);
    setVoting(false);
  }

  // Fallback when no item is set
  if (!item) {
    return (
      <div className="py-5 md:pl-6 relative">
        <span className="sticker sticker--hand absolute -top-1 right-2 rotate-[4deg]" aria-hidden>
          De Rubriek ★
        </span>
        <div className="text-xs text-muted-foreground mb-1">{"\n"}</div>
        <div className="mop-card p-4 -rotate-[0.4deg]">
          <p className="font-display font-bold text-lg leading-snug m-0">
            "Waarom neemt een classicus nóóit een paraplu mee?"
          </p>
          <p className="font-serif italic text-sm text-muted-foreground mt-2 mb-0">
            …omdat hij toch in de regen rijdt.
          </p>
          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-dashed border-foreground/20">
            <span className="text-xs text-muted-foreground">142 stemden</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5 md:pl-6 relative">
      <span className="sticker sticker--hand absolute -top-1 right-2 rotate-[4deg]" aria-hidden>
        De Rubriek ★
      </span>
      <div className="text-xs text-muted-foreground mb-1">{"\n"}</div>

      {item.type === "text" ? (
        <TextPost content={item.content ?? ""} />
      ) : (
        <PollPost
          question={item.question ?? ""}
          options={item.options}
          voteCounts={voteCounts}
          totalVotes={totalVotes}
          myVote={myVote}
          hasVoted={hasVoted}
          isLoggedIn={Boolean(user)}
          voting={voting}
          onVote={handleVote}
        />
      )}
    </div>
  );
}

// ── Text post ─────────────────────────────────────────────────────────────────

function TextPost({ content }: { content: string }) {
  const lines = content.split("\n").filter(Boolean);
  const [headline, ...rest] = lines;
  return (
    <div className="mop-card p-4 -rotate-[0.4deg]">
      <p className="font-display font-bold text-lg leading-snug m-0">{headline}</p>
      {rest.map((line, i) => (
        <p key={i} className="font-serif italic text-sm text-muted-foreground mt-2 mb-0">
          {line}
        </p>
      ))}
    </div>
  );
}

// ── Poll ──────────────────────────────────────────────────────────────────────

type PollProps = {
  question: string;
  options: { id: string; text: string; sort_order: number }[];
  voteCounts: Map<string, number>;
  totalVotes: number;
  myVote: string | null;
  hasVoted: boolean;
  isLoggedIn: boolean;
  voting: boolean;
  onVote: (optionId: string) => void;
};

function PollPost({
  question,
  options,
  voteCounts,
  totalVotes,
  myVote,
  hasVoted,
  isLoggedIn,
  voting,
  onVote,
}: PollProps) {
  return (
    <div className="mop-card p-4 -rotate-[0.4deg]">
      <p className="font-display font-bold text-base leading-snug m-0">{question}</p>

      <div className="mt-3 space-y-1.5">
        {options.map((opt) => {
          const count = voteCounts.get(opt.id) ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote === opt.id;

          if (hasVoted) {
            return (
              <div key={opt.id} className="relative">
                <div
                  className="absolute inset-0 rounded"
                  style={{
                    width: `${pct}%`,
                    background: isMyVote
                      ? "hsl(var(--primary) / 0.18)"
                      : "hsl(var(--foreground) / 0.06)",
                  }}
                />
                <div className="relative flex items-center justify-between px-2 py-1.5 text-xs rounded border border-foreground/10">
                  <span className={isMyVote ? "font-semibold text-primary" : ""}>{opt.text}</span>
                  <span className="font-mono text-muted-foreground ml-2 shrink-0">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          }

          // Not yet voted
          if (!isLoggedIn) {
            return (
              <div
                key={opt.id}
                className="px-2 py-1.5 text-xs rounded border border-foreground/10 text-muted-foreground"
              >
                {opt.text}
              </div>
            );
          }

          return (
            <button
              key={opt.id}
              onClick={() => onVote(opt.id)}
              disabled={voting}
              className="w-full text-left px-2 py-1.5 text-xs rounded border border-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-dashed border-foreground/20">
        <span className="text-xs text-muted-foreground">{totalVotes} stemden</span>
        {!isLoggedIn && (
          <Link to="/login" className="text-xs text-primary font-semibold">
            Log in om te stemmen →
          </Link>
        )}
      </div>
    </div>
  );
}
