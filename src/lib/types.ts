export type Role = "pending" | "author" | "admin";

export type Profile = { id: string; name: string; bio: string; role: Role; created_at: string };

export type PostStatus = "draft" | "published";

export type Post = {
  id: string;
  slug: string;
  title: string;
  content: string;
  cover: string;
  author_id: string;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: { id: string; name: string } | null;
};
