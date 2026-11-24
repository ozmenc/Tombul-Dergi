import { must, supabase } from "./client";
import type { ListedPost, Post, PostStatus, Profile } from "../types";
import { SLUG_RE, UUID_RE, sanitizeSearch } from "../format";

const POST_FIELDS =
  "id,slug,title,excerpt,content,cover,tags,featured,author_id,category_id,status,published_at,created_at,updated_at," +
  "author:profiles!posts_author_id_fkey(id,name,avatar_url),category:categories(id,slug,name)";

/** Yazılara tokuşturma sayılarını ekler (tek istek). */
async function withCheers(posts: Post[]): Promise<ListedPost[]> {
  if (!posts.length) return [];
  const rows = must<{ post_id: string; n: number }[]>(await supabase.rpc("cheer_counts", { ids: posts.map((p) => p.id) }));
  const count = new Map(rows.map((r) => [r.post_id, Number(r.n)]));
  return posts.map((p) => ({ ...p, cheers: count.get(p.id) ?? 0 }));
}

export type FeedFilter = { categoryId?: string; tag?: string; authorId?: string; q?: string; limit?: number };

/** Yayındaki yazılar, yeniden eskiye; en fazla `limit` tane (sayfalama usePaged ile). */
export async function listPublished(f: FeedFilter = {}): Promise<ListedPost[]> {
  let q = supabase.from("posts").select(POST_FIELDS).eq("status", "published").order("published_at", { ascending: false }).limit(f.limit ?? 20);
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.tag) q = q.contains("tags", [f.tag]);
  if (f.authorId) q = q.eq("author_id", f.authorId);
  const term = f.q ? sanitizeSearch(f.q) : "";
  if (term) q = q.or(`title.ilike.*${term}*,excerpt.ilike.*${term}*,content.ilike.*${term}*`);
  return withCheers(must<Post[]>(await q));
}

/** En çok tokuşturulan yazılar, sırasıyla. */
export async function listMostCheered(limit = 5): Promise<ListedPost[]> {
  const rows = must<{ post_id: string; n: number }[]>(await supabase.rpc("most_cheered", { p_limit: limit }));
  if (!rows.length) return [];
  const posts = must<Post[]>(await supabase.from("posts").select(POST_FIELDS).in("id", rows.map((r) => r.post_id)));
  const byId = new Map(posts.map((p) => [p.id, p]));
  return rows.flatMap((r) => { const p = byId.get(r.post_id); return p ? [{ ...p, cheers: Number(r.n) }] : []; });
}

export async function getPublished(slug: string) {
  if (!SLUG_RE.test(slug)) return null;
  const post = must<Post | null>(await supabase.from("posts").select(POST_FIELDS).eq("slug", slug).eq("status", "published").maybeSingle());
  return post ? (await withCheers([post]))[0] : null;
}

/** Aynı kategoriden (yoksa en yeni) birkaç yazı. */
export async function listRelated(post: Post, limit = 3): Promise<ListedPost[]> {
  let q = supabase.from("posts").select(POST_FIELDS).eq("status", "published").neq("id", post.id).order("published_at", { ascending: false }).limit(limit);
  if (post.category_id) q = q.eq("category_id", post.category_id);
  const same = must<Post[]>(await q);
  if (same.length || !post.category_id) return withCheers(same);
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
  return must<Post[]>(await q);
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
