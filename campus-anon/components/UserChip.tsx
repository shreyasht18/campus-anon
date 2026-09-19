"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import Avatar from "./Avatar";

interface Props {
  userId: string | null;
  name: string;
  meId: string | null;
  avatar?: boolean;
}

// Click a username to open a small card with a "Send message" button.
export default function UserChip({ userId, name, meId, avatar = true }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const isMe = !!userId && userId === meId;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full text-xs font-semibold text-gray-200 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {avatar && <Avatar name={name} size={24} />}
        <span>{name}</span>
        {isMe && (
          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
            you
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-white/10 bg-gray-900 p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <Avatar name={name} size={44} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{name}</p>
              <p className="text-xs text-gray-500">Anonymous student</p>
            </div>
          </div>

          {isMe ? (
            <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-center text-xs text-gray-400">
              This is you
            </p>
          ) : userId ? (
            <Link
              href={`/messages/${userId}`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
            >
              <MessageCircle className="h-4 w-4" />
              Send message
            </Link>
          ) : (
            <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-center text-xs text-gray-400">
              Messaging is not available for this older post
            </p>
          )}
        </div>
      )}
    </div>
  );
}
