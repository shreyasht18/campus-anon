export interface Post {
  id: string;
  title: string | null;
  content: string;
  flair: string | null;
  author_name: string;
  user_id: string | null;
  created_at: string;
  upvotes: number;
  comment_count: number;
}

export interface CommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  score: number;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export const FLAIRS = [
  { name: "Confession", style: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30" },
  { name: "Question", style: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
  { name: "Rant", style: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
  { name: "Advice", style: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  { name: "Story", style: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
];

export function flairStyle(name: string | null): string {
  const found = FLAIRS.find((f) => f.name === name);
  return found ? found.style : "bg-gray-500/15 text-gray-300 ring-gray-500/30";
}

export function formatCount(n: number): string {
  if (Math.abs(n) >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return String(n);
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Reddit-style "hot" ranking: votes matter, but newer posts get a boost.
export function hotScore(score: number, iso: string): number {
  const ageHours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
  return (score + 1) / Math.pow(ageHours + 2, 1.5);
}

export function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return h;
}

export function initials(name: string): string {
  const letters = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
  return letters || "??";
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
