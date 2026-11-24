export type Role = "reader" | "pending" | "author" | "admin";

export type Profile = { id: string; name: string; bio: string; avatar_url: string; role: Role; created_at: string; name_changed_at: string | null };

/** Yazı ve yorumlarda gösterilen kısa profil. */
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

export type Vote = -1 | 0 | 1;

export type PostStats = { likes: number; dislikes: number; comments: number };

/** Akışta gösterilen yazı: sayaçlar ve okuyanın kendi oyu ile. */
export type FeedPost = Post & { stats: PostStats; myVote: Vote };

export type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  hidden: boolean;
  created_at: string;
  author: PersonRef | null;
  likes: number;
  dislikes: number;
  myVote: Vote;
};

export const canWrite = (role: Role | undefined) => role === "author" || role === "admin";

export const ROLE_LABEL: Record<Role, string> = { reader: "Okur", pending: "Yazarlık başvurusu", author: "Yazar", admin: "Admin" };
