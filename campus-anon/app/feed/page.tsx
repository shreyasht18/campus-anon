"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Sparkles,
  Trophy,
  Search,
  Pencil,
  Send,
  TrendingUp,
  ShieldCheck,
  ImagePlus,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { castVote } from "../../lib/votes";
import { FLAIRS, hotScore } from "../../lib/utils";
import type { Post } from "../../lib/utils";
import Avatar from "../../components/Avatar";
import PostCard from "../../components/PostCard";

type SortKey = "hot" | "new" | "top";

const SORTS: { key: SortKey; label: string; Icon: LucideIcon }[] = [
  { key: "hot", label: "Hot", Icon: Flame },
  { key: "new", label: "New", Icon: Sparkles },
  { key: "top", label: "Top", Icon: Trophy },
];

interface Me {
  id: string;
  username: string;
}

export default function FeedPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [sort, setSort] = useState<SortKey>("hot");
  const [flairFilter, setFlairFilter] = useState("All");
  const [query, setQuery] = useState("");

  const [composerOpen, setComposerOpen] = useState(false);
  const [flair, setFlair] = useState("Confession");
  const [dept, setDept] = useState(""); // NEW: Stores secondary department flair
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = me?.username?.toLowerCase() === "ghostadmin";

  // Helper to check if the selected flair is a Year
  const isYearFlair = ["1st Year", "2nd Year", "3rd Year", "4th Year"].includes(flair);

  const loadFeed = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setErrorMessage("Could not load posts: " + error.message);
      setLoading(false);
      return;
    }

    setErrorMessage("");
    setPosts((data || []) as Post[]);

    const { data: votes } = await supabase.from("post_votes").select("post_id, value");
    const map: Record<string, number> = {};
    (votes || []).forEach((v: { post_id: string; value: number }) => {
      map[v.post_id] = v.value;
    });
    setMyVotes(map);
    setLoading(false);
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
      await loadFeed();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVote = async (post: Post, value: 1 | -1) => {
    const current = myVotes[post.id] || 0;
    const next = current === value ? 0 : value;
    const delta = next - current;

    setMyVotes((v) => ({ ...v, [post.id]: next }));
    setPosts((ps) =>
      ps.map((p) => (p.id === post.id ? { ...p, upvotes: (p.upvotes || 0) + delta } : p))
    );

    const err = await castVote("post_votes", "post_id", post.id, current, value);
    if (err) {
      setMyVotes((v) => ({ ...v, [post.id]: current }));
      setPosts((ps) =>
        ps.map((p) => (p.id === post.id ? { ...p, upvotes: (p.upvotes || 0) - delta } : p))
      );
      setErrorMessage("Could not save your vote: " + err);
    }
  };

  const handleDelete = async (post: Post) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      setErrorMessage("Could not delete: " + error.message);
      return;
    }
    setPosts((ps) => ps.filter((p) => p.id !== post.id));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Image is too large. Please select an image under 5MB.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrorMessage("");
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !me) return;
    if (isYearFlair && !dept) return; // Hard block if dept isn't picked

    setSubmitting(true);
    setErrorMessage("");
    let finalImageUrl = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${me.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("post_images")
        .upload(filePath, imageFile);

      if (uploadError) {
        setErrorMessage("Failed to upload image. (Check Supabase storage policies!)");
        setSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("post_images")
        .getPublicUrl(filePath);
        
      finalImageUrl = publicUrlData.publicUrl;
    }

    // Combine year and dept flairs if needed
    const finalFlair = isYearFlair ? `${flair} • ${dept}` : flair;

    const { error } = await supabase.from("posts").insert([
      {
        title: title.trim(),
        content: body.trim(),
        flair: finalFlair,
        author_name: me.username,
        image_url: finalImageUrl,
      },
    ]);

    if (error) {
      setErrorMessage("Could not post: " + error.message);
    } else {
      setTitle("");
      setBody("");
      setFlair("Confession");
      setDept("");
      removeImage();
      setComposerOpen(false);
      setSort("new");
      await loadFeed();
    }
    setSubmitting(false);
  };

  const visiblePosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = posts.filter((p) => {
      // Changed to .includes() so combined flairs like "1st Year • CSE Dept" show up for both filters
      if (flairFilter !== "All" && !(p.flair || "Confession").includes(flairFilter)) return false;
      if (!q) return true;
      return (
        (p.title || "").toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.author_name.toLowerCase().includes(q)
      );
    });

    const time = (p: Post) => new Date(p.created_at).getTime();
    if (sort === "new") {
      list.sort((a, b) => time(b) - time(a));
    } else if (sort === "top") {
      list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0) || time(b) - time(a));
    } else {
      list.sort(
        (a, b) =>
          hotScore(b.upvotes || 0, b.created_at) - hotScore(a.upvotes || 0, a.created_at)
      );
    }
    return list;
  }, [posts, sort, flairFilter, query]);

  const trending = useMemo(() => {
    return [...posts]
      .sort(
        (a, b) =>
          hotScore(b.upvotes || 0, b.created_at) - hotScore(a.upvotes || 0, a.created_at)
      )
      .slice(0, 4);
  }, [posts]);

  const chipBase =
    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors";

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        {/* Composer */}
        <section className="rounded-2xl border border-white/5 bg-gray-900/70 p-4 sm:p-5">
          {!composerOpen ? (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-gray-950/60 px-3 py-3 text-left text-sm text-gray-500 transition-colors hover:border-white/20"
            >
              <Avatar name={me?.username || "?"} size={32} />
              <span className="flex-1">Share a confession, question or picture...</span>
              <Pencil className="h-4 w-4" />
            </button>
          ) : (
            <form onSubmit={handleCreatePost} className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {FLAIRS.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => {
                      setFlair(f.name);
                      setDept(""); // Reset dept selection if main flair changes
                    }}
                    className={
                      chipBase +
                      " " +
                      (flair === f.name
                        ? f.style
                        : "text-gray-400 ring-white/10 hover:bg-white/5")
                    }
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              {/* NEW: Conditional Department Selection Box */}
              {isYearFlair && (
                <div className="mt-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-indigo-300">Select your department to post:</p>
                  <div className="flex flex-wrap gap-2">
                    {["CSE Dept", "ECE Dept", "AIML Dept"].map((dName) => {
                      const dFlair = FLAIRS.find((f) => f.name === dName);
                      return (
                        <button
                          key={dName}
                          type="button"
                          onClick={() => setDept(dName)}
                          className={
                            chipBase +
                            " " +
                            (dept === dName
                              ? dFlair?.style
                              : "text-gray-400 ring-white/10 hover:bg-white/5")
                          }
                        >
                          {dName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                maxLength={120}
                required
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-gray-950/80 px-4 py-3 text-base font-semibold text-white placeholder-gray-600 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tell everyone what is going on (optional)"
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-white/10 bg-gray-950/80 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />

              {imagePreview && (
                <div className="relative inline-block mt-1">
                  <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded-lg object-cover border border-white/10" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 rounded-full bg-gray-800 p-1 text-gray-300 hover:text-white hover:bg-red-500 transition-colors border border-white/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-xs text-gray-500">
                    Posting as <span className="font-semibold text-gray-300">{me?.username}</span>
                  </span>
                  
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-colors border border-indigo-500/30"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Add Image
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerOpen(false);
                      setDept("");
                      removeImage();
                    }}
                    className="rounded-full px-4 py-2 text-sm font-medium text-gray-400 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    // NEW: Disable button if title is missing, or if Year is selected but Dept is not
                    disabled={submitting || !title.trim() || (isYearFlair && !dept)}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>

        {/* Sort + search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-white/10 bg-gray-900/70 p-1">
            {SORTS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors " +
                  (sort === key ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200")
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[10rem] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts"
              className="w-full rounded-full border border-white/10 bg-gray-900/70 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {["All", ...FLAIRS.map((f) => f.name)].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFlairFilter(name)}
              className={
                chipBase +
                " " +
                (flairFilter === name
                  ? "bg-white/10 text-white ring-white/20"
                  : "text-gray-400 ring-white/10 hover:bg-white/5")
              }
            >
              {name}
            </button>
          ))}
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {errorMessage}
          </p>
        )}

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-white/5 bg-gray-900/70 p-5"
              >
                <div className="h-3 w-32 rounded bg-white/10" />
                <div className="mt-4 h-5 w-3/4 rounded bg-white/10" />
                <div className="mt-3 h-3 w-full rounded bg-white/5" />
                <div className="mt-2 h-3 w-2/3 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-gray-900/40 px-6 py-14 text-center">
            <p className="text-lg font-semibold text-gray-200">Nothing here yet</p>
            <p className="mt-1 text-sm text-gray-500">
              {posts.length === 0
                ? "Be the first student to drop a secret."
                : "No posts match your search or filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                myVote={myVotes[post.id] || 0}
                meId={me?.id || null}
                isAdmin={isAdmin} 
                onVote={handleVote}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/70">
            <div
              className="h-16"
              style={{ background: "linear-gradient(135deg,#6366f1,#d946ef)" }}
            />
            <div className="p-5">
              <h3 className="text-lg font-bold text-white">About Campus Anon</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Anonymous confessions, questions and chats for your campus. No real names. Click
                any username to send a private message.
              </p>
              <div className="mt-4 flex gap-6 border-t border-white/5 pt-4">
                <div>
                  <p className="text-lg font-bold text-white">{posts.length}</p>
                  <p className="text-xs text-gray-500">Recent posts</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {posts.reduce((sum, p) => sum + (p.comment_count || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-500">Comments</p>
                </div>
              </div>
            </div>
          </div>

          {trending.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-gray-900/70 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-300">
                <TrendingUp className="h-4 w-4 text-orange-400" />
                Trending
              </h3>
              <ul className="mt-3 space-y-3">
                {trending.map((p, i) => (
                  <li key={p.id}>
                    <Link href={`/post/${p.id}`} className="group flex gap-3">
                      <span className="text-sm font-bold text-gray-600">{i + 1}</span>
                      <span className="line-clamp-2 text-sm text-gray-300 group-hover:text-white">
                        {p.title || p.content}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-white/5 bg-gray-900/70 p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Community rules
            </h3>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-gray-400">
              <li>Be kind. Disagree without attacking.</li>
              <li>Never name or expose real people.</li>
              <li>No harassment, threats or hate.</li>
              <li>Respect private messages.</li>
            </ol>
          </div>
        </div>
      </aside>
    </div>
  );
}