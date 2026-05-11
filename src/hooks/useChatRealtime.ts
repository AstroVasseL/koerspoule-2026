import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type ChatMessageRow = {
  id: string;
  subpoule_id: string | null;
  game_id: string;
  user_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  mentions: string[] | null;
};

export type ChatReactionRow = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type ChatPollRow = {
  id: string;
  subpoule_id: string;
  message_id: string | null;
  question: string;
  options: string[];
  deadline: string | null;
  created_by: string;
  created_at: string;
};

export type ChatPollVoteRow = {
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
};

export function useChatRealtime(subpouleId: string | undefined, gameId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [reactions, setReactions] = useState<ChatReactionRow[]>([]);
  const [polls, setPolls] = useState<ChatPollRow[]>([]);
  const [votes, setVotes] = useState<ChatPollVoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const subRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  const refetch = useCallback(async () => {
    if (!supabase || !subpouleId || !gameId) return;
    const [m, r, p] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("id, subpoule_id, game_id, user_id, body, created_at, edited_at, deleted_at, mentions")
        .eq("game_id", gameId)
        .eq("subpoule_id", subpouleId)
        .order("created_at", { ascending: true })
        .limit(500),
      supabase
        .from("chat_message_reactions")
        .select("id, message_id, user_id, emoji, created_at"),
      supabase
        .from("chat_polls")
        .select("id, subpoule_id, message_id, question, options, deadline, created_by, created_at")
        .eq("subpoule_id", subpouleId),
    ]);
    const msgs = (m.data ?? []) as ChatMessageRow[];
    setMessages(msgs);
    const msgIds = new Set(msgs.map((x) => x.id));
    setReactions(((r.data ?? []) as ChatReactionRow[]).filter((x) => msgIds.has(x.message_id)));
    const pollRows = (p.data ?? []) as ChatPollRow[];
    setPolls(pollRows);
    if (pollRows.length > 0) {
      const { data: v } = await supabase
        .from("chat_poll_votes")
        .select("poll_id, user_id, option_index, created_at")
        .in("poll_id", pollRows.map((x) => x.id));
      setVotes((v ?? []) as ChatPollVoteRow[]);
    } else {
      setVotes([]);
    }
  }, [subpouleId, gameId]);

  useEffect(() => {
    if (!supabase || !subpouleId || !gameId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    refetch().finally(() => { if (!cancelled) setLoading(false); });

    const channel = supabase
      .channel(`koerscafe:${subpouleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `subpoule_id=eq.${subpouleId}` },
        (payload) => {
          setMessages((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as ChatMessageRow;
              if (prev.some((m) => m.id === row.id)) return prev;
              return [...prev, row];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as ChatMessageRow;
              return prev.map((m) => (m.id === row.id ? row : m));
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as ChatMessageRow;
              return prev.filter((m) => m.id !== row.id);
            }
            return prev;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_message_reactions" },
        (payload) => {
          setReactions((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as ChatReactionRow;
              return prev.some((r) => r.id === row.id) ? prev : [...prev, row];
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as ChatReactionRow;
              return prev.filter((r) => r.id !== row.id);
            }
            return prev;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_polls", filter: `subpoule_id=eq.${subpouleId}` },
        (payload) => {
          setPolls((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as ChatPollRow;
              return prev.some((p) => p.id === row.id) ? prev : [...prev, row];
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as ChatPollRow;
              return prev.filter((p) => p.id !== row.id);
            }
            return prev;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_poll_votes" },
        (payload) => {
          setVotes((prev) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const row = payload.new as ChatPollVoteRow;
              const filtered = prev.filter((v) => !(v.poll_id === row.poll_id && v.user_id === row.user_id));
              return [...filtered, row];
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as ChatPollVoteRow;
              return prev.filter((v) => !(v.poll_id === row.poll_id && v.user_id === row.user_id));
            }
            return prev;
          });
        }
      )
      .subscribe();

    subRef.current = channel;
    return () => {
      cancelled = true;
      if (subRef.current) {
        supabase.removeChannel(subRef.current);
        subRef.current = null;
      }
    };
  }, [subpouleId, gameId, refetch]);

  return { messages, reactions, polls, votes, loading, refetch };
}
