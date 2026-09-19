"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dices,
  Eye,
  EyeOff,
  Ghost,
  Flame,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const HAS_KEYS =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const generateRandomUsername = () => {
  const prefixes = ["Anonymous", "Student", "CampusUser", "Ghost", "Ninja", "Scholar"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}_${number}`;
};

// Only letters, numbers and underscores are safe inside an email address.
const cleanUsername = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]/g, "");

// Do not change this domain, or existing accounts will stop working.
const toEmail = (value: string) => `${cleanUsername(value)}@campusanon.com`;

const friendlyError = (message: string) => {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Invalid username or password";
  if (m.includes("already registered")) return "That username is taken. Roll a new one.";
  if (m.includes("rate limit")) return "Too many attempts. Wait a few minutes and try again.";
  if (m.includes("not confirmed"))
    return "Email confirmation is still on in Supabase. Turn off Confirm email in Authentication settings.";
  if (m.includes("invalid") && m.includes("email"))
    return "Username has characters that are not allowed. Use letters, numbers and underscores.";
  return message;
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Already logged in? Go straight to the feed.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/feed");
    });
  }, [router]);

  useEffect(() => {
    setUsername(isSignUp ? generateRandomUsername() : "");
    setErrorMessage("");
    setStatus("idle");
  }, [isSignUp]);

  const fail = (message: string) => {
    setStatus("error");
    setErrorMessage(message);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!HAS_KEYS) {
      fail("Supabase keys are missing. Check .env.local, then restart npm run dev.");
      return;
    }

    if (cleanUsername(username).length < 3) {
      fail("Username needs at least 3 letters, numbers or underscores.");
      return;
    }

    setStatus("loading");
    const email = toEmail(username);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: username } },
      });

      if (error) {
        fail(friendlyError(error.message));
        return;
      }

      if (!data.session) {
        fail(
          "Account created but not logged in. Turn off Confirm email in Supabase (Authentication > Sign In / Providers > Email)."
        );
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        fail(friendlyError(error.message));
        return;
      }
    }

    setStatus("success");
    router.push("/feed");
    router.refresh();
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-gray-950/80 px-4 py-3 text-white placeholder-gray-600 transition focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl"
        style={{ background: "#6366f1" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full opacity-25 blur-3xl"
        style={{ background: "#d946ef" }}
      />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-2">
        {/* Brand side (desktop) */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
            >
              <Ghost className="h-6 w-6 text-white" />
            </span>
            <span className="text-2xl font-bold tracking-tight text-white">
              Campus<span className="text-indigo-400">Anon</span>
            </span>
          </div>

          <h1 className="mt-10 text-5xl font-extrabold leading-tight tracking-tight text-white">
            Say what you cannot
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#818cf8,#e879f9)" }}
            >
              say out loud.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-gray-400">
            Confessions, questions and late-night rants from students on your campus. No email.
            No real name. Ever.
          </p>

          <ul className="mt-10 space-y-5">
            {[
              { Icon: ShieldCheck, text: "Fully anonymous. Your identity is a random name." },
              { Icon: Flame, text: "Upvote the best posts and watch them rise to the top." },
              { Icon: MessageCircle, text: "Reply in threads or slide into private DMs." },
            ].map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-4 text-gray-300">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Icon className="h-5 w-5 text-indigo-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Form side */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
            >
              <Ghost className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              Campus<span className="text-indigo-400">Anon</span>
            </span>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-7 shadow-2xl backdrop-blur">
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-950/80 p-1">
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={
                  "rounded-lg py-2 text-sm font-semibold transition " +
                  (!isSignUp ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300")
                }
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={
                  "rounded-lg py-2 text-sm font-semibold transition " +
                  (isSignUp ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300")
                }
              >
                Sign up
              </button>
            </div>

            <h2 className="text-2xl font-bold text-white">
              {isSignUp ? "Generate your identity" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {isSignUp
                ? "Pick a random name or type your own. Then save your password, because there is no reset."
                : "Enter your anonymous username and password."}
            </p>

            <form onSubmit={handleAuth} className="mt-6 space-y-4">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Anonymous username
                </label>
                <div className="flex gap-2">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Student_7392"
                    required
                    maxLength={24}
                    autoComplete="username"
                    className={inputClass}
                  />
                  {isSignUp && (
                    <button
                      type="button"
                      onClick={() => setUsername(generateRandomUsername())}
                      className="flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-indigo-300 transition hover:bg-white/10"
                      title="Roll new username"
                      aria-label="Roll new username"
                    >
                      <Dices className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Secret password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    className={inputClass + " pr-12"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {status === "error" && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
              >
                {status === "loading" || status === "success" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Just a sec...
                  </>
                ) : isSignUp ? (
                  "Create anonymous account"
                ) : (
                  "Log in"
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-gray-500">
            We never ask for your email, phone or real name.
          </p>
        </div>
      </div>
    </div>
  );
}
