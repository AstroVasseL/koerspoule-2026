import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useActiveRubriek,
  useRubriekVotes,
  useRubriekVoteMutation,
  toPollRow,
} from "@/hooks/useRubriek";
import PollCard from "@/components/koerscafe/PollCard";
import { toast } from "sonner";

type Props = { gameId?: string };

export default function RubriekBlock({ gameId }: Props) {
  const { user } = useAuth();
  const { data: item } = useActiveRubriek(gameId);
  const { data: votes = [] } = useRubriekVotes(item?.type === "poll" ? item.id : undefined);
  const castVote = useRubriekVoteMutation();

  async function handleVote(optionIndex: number) {
    if (!user) return;
    if (!item) return;
    try {
      await castVote(item.id, optionIndex);
    } catch (e) {
      toast.error(`Stemmen mislukt: ${(e as Error).message}`);
    }
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
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
        <div>
          {user ? (
            <PollCard
              poll={toPollRow(item)}
              votes={votes}
              myUserId={user.id}
              onVote={handleVote}
            />
          ) : (
            <>
              <PollCard
                poll={toPollRow(item)}
                votes={votes}
                myUserId={undefined}
                onVote={() => {}}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                <Link to="/login" className="text-primary font-semibold underline">
                  Log in om te stemmen →
                </Link>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Text post ─────────────────────────────────────────────────────────────────
// First line = bold headline; remaining lines = italic body (same mop-card style).

function TextPost({ content }: { content: string }) {
  const lines = content.split("\n").filter(Boolean);
  const [headline, ...rest] = lines;
  return (
    <div className="mop-card p-4 -rotate-[0.4deg]">
      <p className="font-display font-bold text-lg leading-snug m-0 break-words whitespace-pre-wrap">{headline}</p>
      {rest.map((line, i) => (
        <p key={i} className="font-serif italic text-sm text-muted-foreground mt-2 mb-0 break-words whitespace-pre-wrap">
          {line}
        </p>
      ))}
    </div>
  );
}
