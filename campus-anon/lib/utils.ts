export interface Post {
  id: string;
  created_at: string;
  title?: string;
  content: string;
  flair?: string;
  author_name: string;
  user_id: string;
  upvotes?: number;
  comment_count?: number;
  image_url?: string | null; 
  views?: number; 
}

export interface CommentRow {
  id: string;
  created_at: string;
  content: string;
  author_name: string;
  user_id: string;
  post_id: string;
  parent_id?: string | null;
  score?: number;
}

export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  recipient_id: string; 
  content: string;
  read_at?: string | null;
}

export const FLAIRS = [
  { name: "1st Year", style: "bg-blue-500/10 text-blue-400 ring-blue-500/20" },
  { name: "2nd Year", style: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20" },
  { name: "3rd Year", style: "bg-purple-500/10 text-purple-400 ring-purple-500/20" },
  { name: "4th Year", style: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  { name: "CSE Dept", style: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20" },
  { name: "ECE Dept", style: "bg-orange-500/10 text-orange-400 ring-orange-500/20" },
  { name: "AIML Dept", style: "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20" },
  { name: "Exam Rant", style: "bg-red-500/10 text-red-400 ring-red-500/30 font-bold" },
  { name: "Placements", style: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  { name: "Confession", style: "bg-pink-500/10 text-pink-400 ring-pink-500/20" },
  { name: "Question", style: "bg-gray-500/10 text-gray-300 ring-gray-500/20" },
];

export function flairStyle(flairName?: string) {
  const found = FLAIRS.find((f) => f.name === flairName);
  return found ? found.style : "bg-gray-500/10 text-gray-400 ring-gray-500/20";
}

export function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function hotScore(upvotes: number, dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const hoursAgo = Math.max(0, (now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  const gravity = 1.8;
  return (upvotes) / Math.pow(hoursAgo + 2, gravity);
}

export function initials(name: string) {
  if (!name) return "?";
  return name.substring(0, 2).toUpperCase();
}

export function hashHue(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
}

export function formatCount(num: number) {
  if (num === undefined || num === null) return "0";
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

export function isUuid(str: string) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(str);
}