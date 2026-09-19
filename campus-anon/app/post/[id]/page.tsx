"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Share2, Trash2, Check } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { castVote } from "../../../lib/votes";
import { flairStyle, timeAgo, isUuid } from "../../../lib/utils";
import type { Post, CommentRow } from "../../../lib/utils";
import Avatar from "../../../components/Avatar";
import UserChip from "../../../components/UserChip";
import VoteButtons from "../../../components/VoteButtons";

interface CommentNode extends CommentRow {
  replies: CommentNode[];
}

interface Me {
  id: string;
  username: string;
}

function buildTree(rows: CommentRow[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  rows.forEach((r) => map.set(r.id, { ...r, replies: [] }));

  const roots: CommentNode[] = [];
  map.forEach((node) => {
    const parent = node.parent_id ? map.get(node.parent_id) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  });

  // Best comments first, then oldest first.
  const sortLevel = (nodes: CommentNode[]) => {
    nodes.sort(
      (a, b) =>
        (b.score || 0) - (a.score || 0) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    nodes.forEach((n) => sortLevel(n.replies));
  };
  sortLevel(roots);
  return roots;
}

function countDescendants(node: CommentNode): number {
  return node.replies.reduce((sum, r) => sum + 1 + countDescendants(r), 0);
}

interface ItemProps {
  node: CommentNode;
  depth: number;
  meId: string | null;
  myVotes: Record<string, number>;
  onVote: (comment: CommentNode, value: 1 | -1) => void;
  onReply: (parentId: string, text: string) => Promise<boolean>;
  onDelete: (comment: CommentNode) => void;
}

function CommentItem({ node, depth, meId, myVotes, onVote, onReply, onDelete }: ItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const replyCount = countDescendants(node);
  const compact = depth >= 3;
  const isMine = !!meId && node.user_id === meId;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await onReply(node.id, text.trim());
    setBusy(false);
    if (ok) {
      setText("");
      setReplying(false);
    }
  };

  return (
    <div className={"flex " + (compact ? "gap-2" : "gap-3")}>
      <div className="flex flex-col items-center">
        {!compact && <Avatar name={node.author_name} size={28} />}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand thread" : "Collapse thread"}
          className="group mt-1.5 flex w-4 flex-1 justify-center"
        >
          <span className="w-px flex-1 bg-white/10 transition-colors group-hover:bg-indigo-400" />
        </button>
      </div>

      <div className="min-w-0 flex-1 pb-3">
        <div className="flex flex-wrap items-center gap-x-2 text-xs">
          <UserChip userId={node.user_id} name={node.author_name} meId={meId} avatar={false} />
          <span className="text-gray-500">{timeAgo(node.created_at)}</span>
        </div>

        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mt-1 text-xs text-indigo-300 hover:underline"
          >
            Show comment
            {replyCount > 0 ? ` and ${replyCount} ${replyCount === 1 ? "reply" : "replies"}` : ""}
          </button>
        ) : (
          <>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">
              {node.content}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VoteButtons
                size="sm"
                score={node.score || 0}
                myVote={myVotes[node.id] || 0}
                onVote={(value) => onVote(node, value)}
              />
              <button
                type="button"
                onClick={() => setReplying((r) => !r)}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Reply
              </button>
              {replyCount > 0 && (
                <span className="text-xs text-gray-500">
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </span>
              )}
              {isMine && (
                <button
                  type="button"
                  onClick={() => onDelete(node)}
                  aria-label="Delete comment"
                  className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {replying && (
              <form onSubmit={submit} className="mt-3">
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder={`Reply to ${node.author_name}...`}
                  className="w-full resize-none rounded-xl border border-white/10 bg-gray-950 p-3 text-sm text-white placeholder-gray-600 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplying(false);
                      setText("");
                    }}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !text.trim()}
                    className="rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
                  >
                    {busy ? "Sending..." : "Reply"}
                  </button>
                </div>
              </form>
            )}

            {node.replies.length > 0 && (
              <div className="mt-3 space-y-1">
                {node.replies.map((child) => (
                  <CommentItem
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    meId={meId}
                    myVotes={myVotes}
                    onVote={onVote}
                    onReply={onReply}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = String(params?.id || "");

  const [me, setMe] = useState<Me | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [myPostVote, setMyPostVote] = useState(0);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [myCommentVotes, setMyCommentVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage("Could not load comments: " + error.message);
      return;
    }

    const rows = (data || []) as CommentRow[];
    setComments(rows);

    if (rows.length === 0) {
      setMyCommentVotes({});
      return;
    }

    const { data: votes } = await supabase
      .from("comment_votes")
      .select("comment_id, value")
      .in(
        "comment_id",
        rows.map((r) => r.id)
      );
    const map: Record<string, number> = {};
    (votes || []).forEach((v: { comment_id: string; value: number }) => {
      map[v.comment_id] = v.value;
    });
    setMyCommentVotes(map);
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      setMe({
        id: user.id,
        username: (user.user_metadata?.display_name as string) || "Anonymous_Student",
      });

      if (!isUuid(postId)) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: p } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(p as Post);

      const { data: pv } = await supabase
        .from("post_votes")
        .select("value")
        .eq("post_id", postId)
        .maybeSingle();
      setMyPostVote(pv?.value ?? 0);

      await loadComments();
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const tree = useMemo(() => buildTree(comments), [comments]);

  const votePost = async (value: 1 | -1) => {
    if (!post) return;
    const current = myPostVote;
    const next = current === value ? 0 : value;
    const delta = next - current;

    setMyPostVote(next);
    setPost({ ...post, upvotes: (post.upvotes || 0) + delta });

    const err = await castVote("post_votes", "post_id", post.id, current, value);
    if (err) {
      setMyPostVote(current);
      setPost((p) => (p ? { ...p, upvotes: (p.upvotes || 0) - delta } : p));
      setErrorMessage("Could not save your vote: " + err);
    }
  };

  const voteComment = async (comment: CommentRow, value: 1 | -1) => {
    const current = myCommentVotes[comment.id] || 0;
    const next = current === value ? 0 : value;
    const delta = next - current;

    setMyCommentVotes((v) => ({ ...v, [comment.id]: next }));
    setComments((cs) =>
      cs.map((c) => (c.id === comment.id ? { ...c, score: (c.score || 0) + delta } : c))
    );

    const err = await castVote("comment_votes", "comment_id", comment.id, current, value);
    if (err) {
      setMyCommentVotes((v) => ({ ...v, [comment.id]: current }));
      setComments((cs) =>
        cs.map((c) => (c.id === comment.id ? { ...c, score: (c.score || 0) - delta } : c))
      );
      setErrorMessage("Could not save your vote: " + err);
    }
  };

  const addComment = async (parentId: string | null, text: string): Promise<boolean> => {
    if (!me) return false;
    setErrorMessage("");
    const { error } = await supabase.from("comments").insert([
      {
        post_id: postId,
        parent_id: parentId,
        author_name: me.username,
        content: text,
      },
    ]);
    if (error) {
      setErrorMessage("Could not comment: " + error.message);
      return false;
    }
    await loadComments();
    return true;
  };

  const submitTopLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || posting) return;
    setPosting(true);
    const ok = await addComment(null, newComment.trim());
    setPosting(false);
    if (ok) setNewComment("");
  };

  const deleteComment = async (comment: CommentRow) => {
    if (!window.confirm("Delete this comment and all replies under it?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", comment.id);
    if (error) {
      setErrorMessage("Could not delete: " + error.message);
      return;
    }
    await loadComments();
  };

  const deletePost = async () => {
    if (!post) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      setErrorMessage("Could not delete: " + error.message);
      return;
    }
    router.push("/feed");
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard not available, ignore
    }
  };

  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10";

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="animate-pulse rounded-2xl border border-white/5 bg-gray-900/70 p-6">
          <div className="h-3 w-40 rounded bg-white/10" />
          <div className="mt-5 h-6 w-3/4 rounded bg-white/10" />
          <div className="mt-4 h-3 w-full rounded bg-white/5" />
          <div className="mt-2 h-3 w-5/6 rounded bg-white/5" />
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-xl font-semibold text-white">Post not found</p>
        <p className="mt-2 text-sm text-gray-500">It may have been deleted.</p>
        <Link
          href="/feed"
          className="mt-6 inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
        >
          Back to feed
        </Link>
      </div>
    );
  }

  const isMine = !!me && post.user_id === me.id;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <article className="rounded-2xl border border-white/5 bg-gray-900/70 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <UserChip userId={post.user_id} name={post.author_name} meId={me?.id || null} />
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

        {post.title && (
          <h1 className="mt-4 text-2xl font-bold leading-snug text-white">{post.title}</h1>
        )}
        {post.content && (
          <p
            className={
              "mt-3 whitespace-pre-wrap break-words leading-relaxed " +
              (post.title ? "text-[15px] text-gray-300" : "text-base text-gray-100")
            }
          >
            {post.content}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <VoteButtons score={post.upvotes || 0} myVote={myPostVote} onVote={votePost} />
          <span className={pill}>
            <MessageSquare className="h-4 w-4" />
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </span>
          <button type="button" onClick={share} className={pill}>
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Share"}
          </button>
          {isMine && (
            <button
              type="button"
              onClick={deletePost}
              aria-label="Delete post"
              className="ml-auto rounded-full p-2 text-gray-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </article>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {errorMessage}
        </p>
      )}

      <form
        onSubmit={submitTopLevel}
        className="rounded-2xl border border-white/5 bg-gray-900/70 p-4"
      >
        <div className="flex gap-3">
          <Avatar name={me?.username || "?"} size={32} />
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Add a comment..."
            className="w-full resize-none rounded-xl border border-white/10 bg-gray-950/80 p-3 text-sm text-white placeholder-gray-600 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Commenting as <span className="font-semibold text-gray-300">{me?.username}</span>
          </span>
          <button
            type="submit"
            disabled={posting || !newComment.trim()}
            className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
          >
            {posting ? "Posting..." : "Comment"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-white/5 bg-gray-900/40 p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-400">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>

        {tree.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No comments yet. Start the conversation.
          </p>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => (
              <CommentItem
                key={node.id}
                node={node}
                depth={0}
                meId={me?.id || null}
                myVotes={myCommentVotes}
                onVote={voteComment}
                onReply={addComment}
                onDelete={deleteComment}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
