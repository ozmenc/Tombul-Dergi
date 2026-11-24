/** pending: onay bekliyor (yalnızca okur); author: onaylı üye (yazı paylaşır); admin. */
export type Role = "pending" | "author" | "admin";

export type Profile = { id: string; name: string; bio: string; avatar_url: string; role: Role; created_at: string; name_changed_at: string | null };

/** Yazılarda gösterilen kısa yazar bilgisi. */
export type PersonRef = { id: string; name: string; avatar_url: string };

export type Category = { id: string; slug: string; name: string };

export type PostStatus = "draft" | "published";

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover: string;
  tags: string[];
  featured: boolean;
  author_id: string;
  category_id: string | null;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author: PersonRef | null;
  category: Category | null;
};

/** Okura gösterilen yazı: tokuşturma sayısıyla (supabase/013_cheers.sql). */
export type ListedPost = Post & { cheers: number };

/** Admin onaylı hesap: yazı paylaşır (supabase/009_members_only.sql). */
export const canWrite = (role: Role | undefined) => role === "author" || role === "admin";

export const ROLE_LABEL: Record<Role, string> = { pending: "Onay bekliyor", author: "Üye", admin: "Admin" };
