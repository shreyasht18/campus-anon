"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { castVote } from "../../../lib/votes";
import { isUuid, timeAgo } from "../../../lib/utils";
import type { Post, CommentRow } from "../../../lib/utils";
import PostCard from "../../../components/PostCard";
import Avatar from "../../../components/Avatar";
import UserChip from "../../../components/UserChip";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

export default function PostPage({ params }: { params: { id: string } }) {
  const postId = params.id;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [myVote, setMyVote] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Safety check to make sure the URL is a real ID
    if (!isUuid(postId)) {
      setLoading(false);
      return;
    }

    async function fetchEverything() {
      // 2. TRIGGER THE VIEW COUNTER INSTANTLY!
      try {
        await supabase.rpc('increment_view', { post_id: postId });
      } catch (error) {
        console.error("View count error:", error);
      }

      // 3. Get Logged In User
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setMeId(session.user.id);
        setIsAdmin(session.user.email === 'admin@ambit.edu'); // Change to your admin email if needed
      }

      // 4. Fetch the Post
      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();
      
      if (postData) {
        setPost(postData);
        
        // 5. Fetch Your Vote Status
        if (session) {
          const { data: voteData } = await supabase
            .from("votes")
            .select("value")
            .eq("post_id", postId)
            .eq("user_id", session.user.id)
            .single();
          if (voteData) setMyVote(voteData.value);
        }
      }

      // 6. Fetch Comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
        
      if (commentsData) setComments(commentsData);
      
      setLoading(false);
    }

    fetchEverything();
  }, [postId]);

  // Handle upvotes/downvotes
  const handleVote = async (postToVote: Post, value: 1 | -1) => {
    if (!meId) return alert("Log in to vote!");
    const newVal = myVote === value ? 0 : value;
    setMyVote(newVal);
    
    // Update UI instantly
    const voteDiff = newVal - myVote;
    setPost(prev => prev ? { ...prev, upvotes: (prev.upvotes || 0) + voteDiff } : null);
    
    await castVote(postToVote.id, meId, newVal);
  };

  // Handle post deletion
  const handleDelete = async (postToDelete: Post) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    await supabase.from("posts").delete().eq("id", postToDelete.id);
    window.location.href = "/";
  };

  // Handle adding a new comment
  const submitComment = async () => {
    if (!newComment.trim() || !meId || !post) return;
    
    const commentData = {
      post_id: post.id,
      user_id: meId,
      author_name: "Anonymous", 
      content: newComment.trim(),
    };

    const { data, error } = await supabase.from("comments").insert([commentData]).select().single();
    if (!error && data) {
      setComments(prev => [...prev, data]);
      setNewComment("");
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Loading post...</div>;
  if (!post) return <div className="p-10 text-center text-white font-bold">Post not found!</div>;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 mb-24">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </Link>

      {/* Main Post Card */}
      <PostCard 
        post={post}
        myVote={myVote}
        meId={meId}
        isAdmin={isAdmin}
        onVote={handleVote}
        onDelete={handleDelete}
      />

      {/* Comments Section */}
      <div className="mt-8 border-t border-white/10 pt-8">
        <h3 className="text-lg font-bold text-gray-200 mb-6">Comments ({comments.length})</h3>
        
        <div className="space-y-4 mb-8">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 bg-gray-900/40 p-4 rounded-xl border border-white/5 transition-all hover:border-white/10">
              <Avatar name={comment.author_name} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <UserChip name={comment.author_name} userId={comment.user_id} meId={meId} />
                  <span className="text-xs text-gray-500 font-medium">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-gray-500 text-sm py-6 italic">No comments yet. Be the first to drop a thought.</p>
          )}
        </div>

        {/* Comment Input Box */}
        {meId ? (
          <div className="flex gap-3 items-end">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment anonymously..."
              className="flex-1 bg-gray-900/60 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              rows={2}
            />
            <button
              onClick={submitComment}
              disabled={!newComment.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-900/50 rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm">Log in to join the conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}