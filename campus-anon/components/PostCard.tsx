import Link from "next/link";
import { MessageSquare, Share2, Trash2, Eye } from "lucide-react";
import Avatar from "./Avatar";
import UserChip from "./UserChip";
import VoteButtons from "./VoteButtons";
import { timeAgo, flairStyle, formatCount } from "../lib/utils";
import type { Post } from "../lib/utils";

interface Props {
  post: Post;
  myVote: number;
  meId: string | null;
  isAdmin: boolean;
  onVote: (post: Post, value: 1 | -1) => void;
  onDelete: (post: Post) => void;
}

export default function PostCard({ post, myVote, meId, isAdmin, onVote, onDelete }: Props) {
  const isMine = meId === post.user_id;

  return (
    <div className="rounded-2xl border border-white/5 bg-gray-900/70 p-4 transition-colors hover:border-white/10 sm:p-5">
      <div className="flex items-center gap-3">
        <Avatar name={post.author_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <UserChip name={post.author_name} userId={post.user_id} meId={meId} />
            {post.flair && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${flairStyle(post.flair)}`}>
                {post.flair}
              </span>
            )}
            <span className="truncate text-xs text-gray-500">{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      <Link href={`/post/${post.id}`} className="group mt-3 block">
        {post.title && (
          <h2 className="text-base font-semibold text-gray-200 group-hover:text-white sm:text-lg">
            {post.title}
          </h2>
        )}
        {post.content && (
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-400 group-hover:text-gray-300">
            {post.content}
          </p>
        )}

        {/* THIS IS THE BLOCK THAT RENDERS YOUR IMAGE */}
        {post.image_url && (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-gray-950/50">
            <img
              src={post.image_url}
              alt="Post attachment"
              className="max-h-[500px] w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-4">
        <VoteButtons
          score={post.upvotes || 0}
          myVote={myVote}
          onVote={(val) => onVote(post, val)}
        />

        <Link
          href={`/post/${post.id}`}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200"
        >
          <MessageSquare className="h-4 w-4" />
          <span>{formatCount(post.comment_count || 0)} comments</span>
        </Link>

        {/* EYE ICON FOR VIEWS */}
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-500">
          <Eye className="h-4 w-4" />
          <span>{formatCount(post.views || 0)} views</span>
        </div>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: post.title || 'Campus Anon',
                url: `${window.location.origin}/post/${post.id}`
              });
            } else {
              navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
              alert('Link copied!');
            }
          }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="ml-auto">
          {(isMine || isAdmin) && (
            <button
              onClick={() => onDelete(post)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{isAdmin && !isMine ? 'Admin Delete' : 'Delete'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}