import { must, postJson, supabase } from "./client";
import type { Profile, Role } from "../types";
import { UUID_RE } from "../format";

const PROFILE_FIELDS = "id,name,bio,avatar_url,role,created_at,name_changed_at";

export const getProfile = async (id: string) =>
  must<Profile | null>(await supabase.from("profiles").select(PROFILE_FIELDS).eq("id", id).maybeSingle());

export type AuthorCard = Pick<Profile, "id" | "name" | "bio" | "avatar_url" | "role"> & { posts: number; followers: number };

type AuthorRow = Pick<Profile, "id" | "name" | "bio" | "avatar_url" | "role"> & { posts: { count: number }[]; followers: { count: number }[] };
const AUTHOR_FIELDS = "id,name,bio,avatar_url,role,posts!posts_author_id_fkey(count),followers:follows!follows_followee_id_fkey(count)";
const toCard = (r: AuthorRow): AuthorCard => ({
  id: r.id, name: r.name, bio: r.bio, avatar_url: r.avatar_url, role: r.role,
  posts: r.posts[0]?.count ?? 0, followers: r.followers[0]?.count ?? 0,
});

/** Yazarlar ve adminler, yayındaki yazı ve takipçi sayılarıyla. */
export async function listAuthors(): Promise<AuthorCard[]> {
  const rows = must<AuthorRow[]>(
    await supabase.from("profiles").select(AUTHOR_FIELDS).in("role", ["author", "admin"]).eq("posts.status", "published").order("created_at")
  );
  return rows.map(toCard).sort((a, b) => b.posts - a.posts);
}

export async function getAuthor(id: string): Promise<AuthorCard | null> {
  if (!UUID_RE.test(id)) return null;
  const row = must<AuthorRow | null>(
    await supabase.from("profiles").select(AUTHOR_FIELDS).eq("id", id).in("role", ["author", "admin"]).eq("posts.status", "published").maybeSingle()
  );
  return row ? toCard(row) : null;
}

export async function searchAuthors(q: string) {
  const term = q.replace(/[%_*,()]/g, " ").trim();
  if (!term) return [];
  return must<AuthorRow[]>(
    await supabase.from("profiles").select(AUTHOR_FIELDS).in("role", ["author", "admin"]).ilike("name", `%${term}%`).eq("posts.status", "published").limit(6)
  ).map(toCard);
}

export async function updateProfile(id: string, patch: Pick<Profile, "name" | "bio" | "avatar_url">) {
  must(await supabase.from("profiles").update(patch).eq("id", id));
}

/** Okur yazarlık için başvurur (rol: reader → pending). */
export async function applyForAuthor(id: string) {
  must(await supabase.from("profiles").update({ role: "pending" }).eq("id", id));
}

/* ---------- Admin ---------- */

export const listMembers = async () =>
  must<Profile[]>(await supabase.from("profiles").select(PROFILE_FIELDS).order("created_at", { ascending: false }));

/** Admin: üye kimliği → e-posta (supabase/005_members.sql). */
export async function listMemberEmails() {
  const rows = must<{ id: string; email: string }[]>(await supabase.rpc("member_emails"));
  return new Map(rows.map((r) => [r.id, r.email]));
}

export async function setRole(id: string, role: Role) {
  must(await supabase.from("profiles").update({ role }).eq("id", id));
}

/** Servis anahtarı gerektiği için Vercel fonksiyonu üzerinden (api/authors.js). */
export const createAuthor = (body: { name: string; email: string; password: string }) => postJson("/api/authors", body, true);

/** Admin bir üyeye yeni geçici şifre üretir (api/password.js). */
export const resetPassword = async (userId: string) => (await postJson("/api/password", { userId }, true)).password as string;

/** Herkese açık kayıt (api/signup.js), ardından oturum açar. */
export async function signUp(body: { name: string; email: string; password: string; wantsAuthor: boolean; website: string }) {
  await postJson("/api/signup", body);
  const { error } = await supabase.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
  if (error) throw new Error("Hesabın açıldı ama giriş yapılamadı. Giriş sayfasından dene.");
}

/** Admin paneli özeti: üye, başvuru ve yorum sayıları. */
export async function adminCounts() {
  const count = (r: { data: unknown; count: number | null; error: { message: string } | null }) => (must(r), r.count ?? 0);
  const [members, pending, comments, hidden] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "pending"),
    supabase.from("comments").select("id", { count: "exact", head: true }),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("hidden", true),
  ]);
  return { members: count(members), pending: count(pending), comments: count(comments), hidden: count(hidden) };
}
