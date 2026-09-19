"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, User, MessageCircle } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface Message { id: string; sender_name: string; receiver_name: string; content: string; created_at: string; }

export default function DMsPage() {
  const [currentUser, setCurrentUser] = useState("Anonymous_Student");
  const [targetUser, setTargetUser] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Read URL params and setup user
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.display_name) setCurrentUser(user.user_metadata.display_name);

      // Auto-fill target user if clicked from feed
      const params = new URLSearchParams(window.location.search);
      const to = params.get("to");
      if (to) setTargetUser(to);
    };
    init();
  }, []);

  const fetchMessages = async () => {
    if (!targetUser.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_name.eq.${currentUser},receiver_name.eq.${targetUser}),and(sender_name.eq.${targetUser},receiver_name.eq.${currentUser})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => { if (targetUser) fetchMessages(); }, [targetUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !targetUser.trim()) return;
    await supabase.from("direct_messages").insert([{ sender_name: currentUser, receiver_name: targetUser, content: newMessage }]);
    setNewMessage("");
    fetchMessages();
  };

  return (
    <div className="flex flex-col h-screen md:h-full bg-[#0c0c0f]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0c0c0f]/80 backdrop-blur-xl border-b border-white/5 p-4 md:px-6 md:py-5 flex items-center gap-4 shadow-sm">
        <MessageCircle className="w-5 h-5 text-indigo-500" />
        <input
          type="text"
          value={targetUser}
          onChange={(e) => setTargetUser(e.target.value)}
          placeholder="Search exact username..."
          className="bg-black/40 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 w-full max-w-xs"
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 pb-24 md:pb-6">
        {!targetUser ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3">
            <User className="w-12 h-12 stroke-[1.5]" />
            <p className="text-sm font-medium">Click a username in the feed to start chatting.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-zinc-500 mt-10 bg-white/5 py-4 rounded-xl">
            This is the start of your anonymous chat with {targetUser}.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_name === currentUser;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-indigo-600 text-white rounded-br-sm shadow-[0_0_15px_-5px_rgba(79,70,229,0.4)]" : "bg-zinc-800 text-zinc-200 rounded-bl-sm"}`}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-zinc-600 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input Form */}
      {targetUser && (
        <form onSubmit={handleSendMessage} className="sticky bottom-0 bg-[#0c0c0f] border-t border-white/5 p-4 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${targetUser}...`}
            className="flex-1 bg-zinc-900 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button type="submit" className="bg-white text-black hover:bg-zinc-200 p-2.5 rounded-full transition-colors flex items-center justify-center">
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}