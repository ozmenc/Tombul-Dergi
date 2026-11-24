import { currentUserId, must, supabase } from "./client";
import type { FeedPost, Post, PostStats, PostStatus, Profile, Vote } from "../types";
import { SLUG_RE, UUID_RE, sanitizeSearch } from "../format";

const POST_FIELDS =
  "id,slug,title,excerpt,content,cover,tags,featured,author_id,category_id,status,published_at,created_at,updated_at," +
  "author:profiles!posts_author_id_fkey(id,name,avatar_url),category:categories(id,slug,name)";

const NO_STATS: PostStats = { likes: 0, dislikes: 0, comments: 0 };

/** Yazılara sayaçları ve okuyanın kendi oyunu ekler. */
export async function withSocial(posts: Post[]): Promise<FeedPost[]> {
  if (!posts.length) return [];
  const ids = posts.map((p) => p.id);
  const uid = await currentUserId();
  const [stats, votes] = await Promise.all([
    supabase.from("post_stats").select("post_id,likes,dislikes,comments").in("post_id", ids),
    uid ? supabase.from("post_votes").select("post_id,value").eq("user_id", uid).in("post_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  const statMap = new Map(must<(PostStats & { post_id: string })[]>(stats).map((s) => [s.post_id, s]));
  const voteMap = new Map(must<{ post_id: string; value: Vote }[]>(votes).map((v) => [v.post_id, v.value]));
  return posts.map((p) => {
    const s = statMap.get(p.id);
    return { ...p, stats: s ? { likes: s.likes, dislikes: s.dislikes, comments: s.comments } : NO_STATS, myVote: voteMap.get(p.id) ?? 0 };
  });
}

export type FeedFilter = { categoryId?: string; tag?: string; authorId?: string; authorIds?: string[]; ids?: string[]; q?: string; limit?: number };

/** Yayındaki yazılar, yeniden eskiye; en fazla `limit` tane (sayfalama usePaged ile). */
export async function listPublished(f: FeedFilter = {}): Promise<FeedPost[]> {
  if (f.authorIds?.length === 0 || f.ids?.length === 0) return [];
  let q = supabase.from("posts").select(POST_FIELDS).eq("status", "published").order("published_at", { ascending: false }).limit(f.limit ?? 20);
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.tag) q = q.contains("tags", [f.tag]);
  if (f.authorId) q = q.eq("author_id", f.authorId);
  if (f.authorIds) q = q.in("author_id", f.authorIds);
  if (f.ids) q = q.in("id", f.ids);
  const term = f.q ? sanitizeSearch(f.q) : "";
  if (term) q = q.or(`title.ilike.*${term}*,excerpt.ilike.*${term}*,content.ilike.*${term}*`);
  return withSocial(must<Post[]>(await q));
}

/** Popüler yazılar: sıralama sunucuda (supabase/004_popular.sql). */
export async function listPopular(f: { categoryId?: string; limit?: number } = {}): Promise<FeedPost[]> {
  const ids = must<string[]>(await supabase.rpc("popular_post_ids", { p_limit: f.limit ?? 20, p_category: f.categoryId ?? null }));
  if (ids.length === 0) return [];
  const posts = await listPublished({ ids, limit: ids.length });
  const rank = new Map(ids.map((id, i) => [id, i]));
  return posts.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
}

export async function getPublished(slug: string): Promise<FeedPost | null> {
  if (!SLUG_RE.test(slug)) return null;
  const post = must<Post | null>(await supabase.from("posts").select(POST_FIELDS).eq("slug", slug).eq("status", "published").maybeSingle());
  return post ? (await withSocial([post]))[0] : null;
}

/** Aynı kategoriden (yoksa en yeni) birkaç yazı. */
export async function listRelated(post: Post, limit = 3): Promise<FeedPost[]> {
  let q = supabase.from("posts").select(POST_FIELDS).eq("status", "published").neq("id", post.id).order("published_at", { ascending: false }).limit(limit);
  if (post.category_id) q = q.eq("category_id", post.category_id);
  const same = must<Post[]>(await q);
  if (same.length || !post.category_id) return withSocial(same);
  return listPublished({ limit: limit + 1 }).then((all) => all.filter((p) => p.id !== post.id).slice(0, limit));
}

/** Yayındaki yazılardaki etiketler, kullanım sayısına göre. */
export async function listPopularTags(limit = 12) {
  const rows = must<{ tags: string[] }[]>(await supabase.from("posts").select("tags").eq("status", "published"));
  const count = new Map<string, number>();
  for (const r of rows) for (const t of r.tags) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr")).slice(0, limit).map(([tag, n]) => ({ tag, n }));
}

/* ---------- Panel ---------- */

export async function listPanelPosts(me: Profile) {
  let q = supabase.from("posts").select(POST_FIELDS).order("updated_at", { ascending: false });
  if (me.role !== "admin") q = q.eq("author_id", me.id);
  return withSocial(must<Post[]>(await q));
}

export async function getPost(id: string) {
  if (!UUID_RE.test(id)) return null;
  return must<Post | null>(await supabase.from("posts").select(POST_FIELDS).eq("id", id).maybeSingle());
}

export type PostInput = {
  title: string; slug: string; content: string; excerpt: string; cover: string;
  status: PostStatus; category_id: string | null; tags: string[]; featured: boolean;
};

export const createPost = async (input: PostInput, authorId: string) =>
  must<Post>(await supabase.from("posts").insert({ ...input, author_id: authorId }).select(POST_FIELDS).single());

export const updatePost = async (id: string, input: PostInput) =>
  must<Post>(await supabase.from("posts").update(input).eq("id", id).select(POST_FIELDS).single());

export async function deletePost(id: string) {
  must(await supabase.from("posts").delete().eq("id", id));
}
