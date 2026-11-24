import { supabase } from "./supabase";
import type { Post, PostStatus, Profile, Role } from "./types";
import { SLUG_RE, UUID_RE } from "./format";

const POST_FIELDS = "id,slug,title,content,cover,author_id,status,published_at,created_at,updated_at,author:profiles(id,name)";

/** Supabase hata nesnesini Error'a çevirir. Üretilmiş DB tipleri olmadığı için sonucu burada tipliyoruz
 *  (ör. author:profiles(...) çoğa-bir ilişki olduğundan dizi değil nesne döner). */
function must<T = unknown>(r: { data: unknown; error: { message: string; code?: string } | null }): T {
  if (r.error) throw Object.assign(new Error(r.error.message), { code: r.error.code });
  return r.data as T;
}

/* ---------- Herkese açık ---------- */

// shortcut: liste tek seferde geliyor; yüzlerce yazıya ulaşınca sayfalama ekle.
export const listPublished = async () =>
  must<Post[]>(await supabase.from("posts").select(POST_FIELDS).eq("status", "published").order("published_at", { ascending: false }));

export const getPublished = async (slug: string) => {
  if (!SLUG_RE.test(slug)) return null;
  return must<Post | null>(await supabase.from("posts").select(POST_FIELDS).eq("slug", slug).eq("status", "published").maybeSingle());
};

export type AuthorSummary = Pick<Profile, "id" | "name" | "bio"> & { posts: number };

export const listAuthors = async (): Promise<AuthorSummary[]> => {
  const rows = must<(Pick<Profile, "id" | "name" | "bio"> & { posts: { count: number }[] })[]>(
    await supabase.from("profiles").select("id,name,bio,posts(count)").neq("role", "pending").eq("posts.status", "published").order("created_at")
  );
  return rows.map((r) => ({ id: r.id, name: r.name, bio: r.bio, posts: r.posts[0]?.count ?? 0 }));
};

export const getAuthor = async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  const profile = must<Pick<Profile, "id" | "name" | "bio"> | null>(
    await supabase.from("profiles").select("id,name,bio").eq("id", id).neq("role", "pending").maybeSingle()
  );
  if (!profile) return null;
  const posts = must<Post[]>(
    await supabase.from("posts").select(POST_FIELDS).eq("author_id", id).eq("status", "published").order("published_at", { ascending: false })
  );
  return { profile, posts };
};

/* ---------- Panel ---------- */

export const getProfile = async (id: string) =>
  must<Profile | null>(await supabase.from("profiles").select("id,name,bio,role,created_at").eq("id", id).maybeSingle());

export const listPanelPosts = async (me: Profile) => {
  let q = supabase.from("posts").select(POST_FIELDS).order("updated_at", { ascending: false });
  if (me.role !== "admin") q = q.eq("author_id", me.id);
  return must<Post[]>(await q);
};

export const getPost = async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  return must<Post | null>(await supabase.from("posts").select(POST_FIELDS).eq("id", id).maybeSingle());
};

export type PostInput = { title: string; slug: string; content: string; cover: string; status: PostStatus };

export const createPost = async (input: PostInput, authorId: string) =>
  must<Post>(await supabase.from("posts").insert({ ...input, author_id: authorId }).select(POST_FIELDS).single());

export const updatePost = async (id: string, input: PostInput) =>
  must<Post>(await supabase.from("posts").update(input).eq("id", id).select(POST_FIELDS).single());

export const deletePost = async (id: string) => {
  must(await supabase.from("posts").delete().eq("id", id));
};

export const listProfiles = async () =>
  must<Profile[]>(await supabase.from("profiles").select("id,name,bio,role,created_at").order("created_at"));

export const setRole = async (id: string, role: Role) => {
  must(await supabase.from("profiles").update({ role }).eq("id", id));
};

export const updateProfile = async (id: string, patch: Pick<Profile, "name" | "bio">) => {
  must(await supabase.from("profiles").update(patch).eq("id", id));
};

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadImage(file: File, userId: string) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Sadece JPG, PNG, WEBP ya da GIF yükleyebilirsin.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Resim en fazla 5 MB olabilir.");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(path, file, { contentType: file.type });
  if (error) throw new Error("Resim yüklenemedi: " + error.message);
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

/** Yeni yazar hesabı: servis anahtarı gerektiği için Vercel fonksiyonu (api/authors.js) üzerinden. */
export async function createAuthor(body: { name: string; email: string; password: string }) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Oturumun kapanmış. Tekrar giriş yap.");
  const res = await fetch("/api/authors", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) throw new Error("Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.");
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Yazar eklenemedi.");
}
