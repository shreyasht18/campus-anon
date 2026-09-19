"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ghost, LogOut, MessageCircle, Flame } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";

interface Me {
  id: string;
  username: string;
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const apply = (user: User | null) => {
      setMe(
        user
          ? {
              id: user.id,
              username: (user.user_metadata?.display_name as string) || "Anonymous",
            }
          : null
      );
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const meId = me?.id;

  useEffect(() => {
    if (!meId) {
      setUnread(0);
      return;
    }
    let cancelled = false;

    const check = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", meId)
        .is("read_at", null);
      if (!cancelled) setUnread(count || 0);
    };

    check();
    const timer = setInterval(check, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [meId, pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // The login page has its own full-screen design.
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-gray-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={me ? "/feed" : "/"} className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
          >
            <Ghost className="h-4 w-4 text-white" />
          </span>
          <span className="text-base font-bold tracking-tight text-white">
            Campus<span className="text-indigo-400">Anon</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          {me ? (
            <>
              <Link
                href="/feed"
                aria-label="Feed"
                className={
                  "rounded-full p-2.5 transition-colors hover:bg-white/10 " +
                  (pathname === "/feed" ? "text-white" : "text-gray-400")
                }
              >
                <Flame className="h-5 w-5" />
              </Link>

              <Link
                href="/messages"
                aria-label="Messages"
                className={
                  "relative rounded-full p-2.5 transition-colors hover:bg-white/10 " +
                  (pathname.startsWith("/messages") ? "text-white" : "text-gray-400")
                }
              >
                <MessageCircle className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              <div className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                  className="rounded-full ring-2 ring-transparent transition hover:ring-white/20"
                >
                  <Avatar name={me.username} size={34} />
                </button>

                {menuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close menu"
                      onClick={() => setMenuOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-gray-900 p-2 shadow-2xl">
                      <div className="flex items-center gap-3 px-3 py-3">
                        <Avatar name={me.username} size={36} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {me.username}
                          </p>
                          <p className="text-xs text-gray-500">Signed in anonymously</p>
                        </div>
                      </div>
                      <div className="my-1 h-px bg-white/5" />
                      <Link
                        href="/messages"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Messages
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
