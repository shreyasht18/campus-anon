"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Share2, Trash2, Check } from "lucide-react";
import { flairStyle, timeAgo } from "../lib/utils";
import type { Post } from "../lib/utils";
import VoteButtons from "./VoteButtons";
import UserChip from "./UserChip";

interface Props {
  post: Post;
  myVote: number;
  meId: string | null;
  onVote: (post: Post, value: 1 | -1) => void;
  onDelete: (post: Post) => void;
}

export default function PostCard({ post, myVote, meId, onVote, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const isMine = !!meId && post.user_id === meId;
  const comments = post.comment_count || 0;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard not available, ignore
    }
  };

  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10";

  return (
    <article className="rounded-2xl border border-white/5 bg-gray-900/70 p-4 transition-colors hover:border-white/15 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <UserChip userId={post.user_id} name={post.author_name} meId={meId} />
        <span
          className={
            "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset " +
            flairStyle(post.flair)
          }
        >
          {post.flair || "Confession"}
        </span>
        <span className="text-xs text-gray-500">{timeAgo(post.created_at)}</span>
      </div>

      <Link href={`/post/${post.id}`} className="group mt-3 block">
        {post.title ? (
          <>
            <h2 className="text-lg font-semibold leading-snug text-white transition-colors group-hover:text-indigo-300">
              {post.title}
            </h2>
            {post.content && (
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-400">
                {post.content}
              </p>
            )}
          </>
        ) : (
          <p className="line-clamp-6 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-200 transition-colors group-hover:text-white">
            {post.content}
          </p>
        )}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <VoteButtons
          score={post.upvotes || 0}
          myVote={myVote}
          onVote={(value) => onVote(post, value)}
        />

        <Link href={`/post/${post.id}`} className={pill}>
          <MessageSquare className="h-4 w-4" />
          {comments} {comments === 1 ? "comment" : "comments"}
        </Link>

        <button type="button" onClick={share} className={pill}>
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
          {copied ? "Copied" : "Share"}
        </button>

        {isMine && (
          <button
            type="button"
            onClick={() => onDelete(post)}
            aria-label="Delete post"
            className="ml-auto rounded-full p-2 text-gray-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}
