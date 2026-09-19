"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { timeAgo } from "../../lib/utils";
import type { Message } from "../../lib/utils";
import Avatar from "../../components/Avatar";

interface Conversation {
  partnerId: string;
  name: string;
  last: Message;
  unread: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const load = async (me: string) => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (cancelled) return;
      if (error) {
        setErrorMessage("Could not load messages: " + error.message);
        setLoading(false);
        return;
      }
      setErrorMessage("");

      const rows = (data || []) as Message[];
      const byPartner = new Map<string, { last: Message; unread: number }>();

      rows.forEach((m) => {
        const partnerId = m.sender_id === me ? m.recipient_id : m.sender_id;
        const unread = m.recipient_id === me && !m.read_at ? 1 : 0;
        const entry = byPartner.get(partnerId);
        if (!entry) byPartner.set(partnerId, { last: m, unread });
        else entry.unread += unread;
      });

      const ids = Array.from(byPartner.keys());
      const names: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ids);
        (profiles || []).forEach((p: { id: string; username: string }) => {
          names[p.id] = p.username;
        });
      }

      if (cancelled) return;
      setConversations(
        Array.from(byPartner.entries()).map(([partnerId, v]) => ({
          partnerId,
          name: names[partnerId] || "Anonymous",
          last: v.last,
          unread: v.unread,
        }))
      );
      setLoading(false);
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      setMeId(user.id);
      await load(user.id);
      timer = setInterval(() => load(user.id), 8000);
    };
    init();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold text-white">Messages</h1>
      <p className="mt-1 text-sm text-gray-500">Private chats. Only you and them can see these.</p>

      {errorMessage && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {errorMessage}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/5 bg-gray-900/70">
        {loading ? (
          <div className="space-y-px">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 p-4">
                <div className="h-11 w-11 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded bg-white/10" />
                  <div className="h-3 w-48 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <Inbox className="h-6 w-6 text-gray-500" />
            </span>
            <p className="mt-4 font-semibold text-gray-200">No messages yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Click any username on a post or comment, then press Send message.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {conversations.map((c) => {
              const mine = c.last.sender_id === meId;
              return (
                <li key={c.partnerId}>
                  <Link
                    href={`/messages/${c.partnerId}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-white/5"
                  >
                    <Avatar name={c.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={
                            "truncate " +
                            (c.unread > 0 ? "font-bold text-white" : "font-semibold text-gray-200")
                          }
                        >
                          {c.name}
                        </p>
                        <span className="shrink-0 text-xs text-gray-500">
                          {timeAgo(c.last.created_at)}
                        </span>
                      </div>
                      <p
                        className={
                          "truncate text-sm " + (c.unread > 0 ? "text-gray-200" : "text-gray-500")
                        }
                      >
                        {mine ? "You: " : ""}
                        {c.last.content}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
