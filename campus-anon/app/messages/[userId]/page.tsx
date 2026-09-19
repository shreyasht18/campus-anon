"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { isUuid } from "../../../lib/utils";
import type { Message } from "../../../lib/utils";
import Avatar from "../../../components/Avatar";

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function ChatPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const partnerId = String(params?.userId || "");

  const [meId, setMeId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the session and the other person's name once.
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!isUuid(partnerId) || partnerId === user.id) {
        router.replace("/messages");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", partnerId)
        .maybeSingle();
      setPartnerName(profile?.username || "Anonymous");
      setMeId(user.id);
    };
    init();
  }, [partnerId, router]);

  // Load messages now, then check for new ones every 3 seconds.
  useEffect(() => {
    if (!meId) return;
    let cancelled = false;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${meId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${meId})`
        )
        .order("created_at", { ascending: true })
        .limit(300);

      if (cancelled) return;
      if (error) {
        setErrorMessage("Could not load messages: " + error.message);
        setLoading(false);
        return;
      }

      const rows = (data || []) as Message[];
      setMessages(rows);
      setLoading(false);

      if (rows.some((m) => m.recipient_id === meId && !m.read_at)) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("recipient_id", meId)
          .eq("sender_id", partnerId)
          .is("read_at", null);
      }
    };

    fetchMessages();
    const timer = setInterval(fetchMessages, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [meId, partnerId]);

  const lastId = messages.length > 0 ? messages[messages.length - 1].id : "";
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastId]);

  const send = async () => {
    const content = text.trim();
    if (!content || !meId || sending) return;

    setSending(true);
    setErrorMessage("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ recipient_id: partnerId, content })
      .select()
      .single();

    if (error) {
      setErrorMessage("Could not send: " + error.message);
    } else {
      setText("");
      setMessages((prev) => [...prev, data as Message]);
    }
    setSending(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-2xl flex-col px-3 sm:px-4">
      <div className="flex items-center gap-3 border-b border-white/5 py-3">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {partnerName && <Avatar name={partnerName} size={38} />}
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{partnerName || "..."}</p>
          <p className="text-xs text-gray-500">Anonymous student</p>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto py-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading chat...</p>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center">
            {partnerName && (
              <span className="mx-auto block w-fit">
                <Avatar name={partnerName} size={64} />
              </span>
            )}
            <p className="mt-4 font-semibold text-gray-200">Say hi to {partnerName}</p>
            <p className="mt-1 text-sm text-gray-500">
              Only the two of you can see this chat.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === meId;
            const showDay = i === 0 || dayOf(messages[i - 1].created_at) !== dayOf(m.created_at);
            return (
              <div key={m.id}>
                {showDay && (
                  <p className="my-3 text-center text-[11px] font-medium uppercase tracking-wide text-gray-600">
                    {dayOf(m.created_at)}
                  </p>
                )}
                <div className={"flex " + (mine ? "justify-end" : "justify-start")}>
                  <div
                    className={
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
                      (mine
                        ? "rounded-br-md text-white"
                        : "rounded-bl-md bg-gray-800 text-gray-100")
                    }
                    style={
                      mine ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : undefined
                    }
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p
                      className={
                        "mt-1 text-right text-[10px] " + (mine ? "text-white/60" : "text-gray-500")
                      }
                    >
                      {timeOf(m.created_at)}
                      {mine && m.read_at ? " · Seen" : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {errorMessage}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-white/5 py-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          placeholder={partnerName ? `Message ${partnerName}...` : "Message..."}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
