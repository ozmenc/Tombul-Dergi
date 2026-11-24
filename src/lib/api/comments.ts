import { currentUserId, must, supabase } from "./client";
import type { Comment, PersonRef, Vote } from "../types";

const FIELDS = "id,post_id,parent_id,body,hidden,created_at,author:profiles!comments_author_id_fkey(id,name,avatar_url)";
type Row = Omit<Comment, "likes" | "dislikes" | "myVote">;

async function withVotes(rows: Row[]): Promise<Comment[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const uid = await currentUserId();
  const [stats, mine] = await Promise.all([
    supabase.from("comment_stats").select("comment_id,likes,dislikes").in("comment_id", ids),
    uid ? supabase.from("comment_votes").select("comment_id,value").eq("user_id", uid).in("comment_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  const s = new Map(must<{ comment_id: string; likes: number; dislikes: number }[]>(stats).map((x) => [x.comment_id, x]));
  const v = new Map(must<{ comment_id: string; value: Vote }[]>(mine).map((x) => [x.comment_id, x.value]));
  return rows.map((r) => ({ ...r, likes: s.get(r.id)?.likes ?? 0, dislikes: s.get(r.id)?.dislikes ?? 0, myVote: v.get(r.id) ?? 0 }));
}

/** Bir yazının yorumları, eskiden yeniye (RLS gizlenenleri okurlardan saklar). */
export const listComments = async (postId: string) =>
  withVotes(must<Row[]>(await supabase.from("comments").select(FIELDS).eq("post_id", postId).order("created_at")));

export async function addComment(postId: string, author: PersonRef, body: string, parentId: string | null): Promise<Comment> {
  const row = must<Row>(
    await supabase.from("comments").insert({ post_id: postId, author_id: author.id, body: body.trim(), parent_id: parentId }).select(FIELDS).single()
  );
  return { ...row, likes: 0, dislikes: 0, myVote: 0 };
}

export async function deleteComment(id: string) {
  must(await supabase.from("comments").delete().eq("id", id));
}

export async function setCommentHidden(id: string, hidden: boolean) {
  must(await supabase.from("comments").update({ hidden }).eq("id", id));
}

export type ModerationComment = Comment & { post: { slug: string; title: string } | null };

/** Admin için son yorumlar (gizlenenler dahil). */
export async function listRecentComments(onlyHidden = false, limit = 50): Promise<ModerationComment[]> {
  let q = supabase.from("comments").select(FIELDS + ",post:posts(slug,title)").order("created_at", { ascending: false }).limit(limit);
  if (onlyHidden) q = q.eq("hidden", true);
  const rows = must<(Row & { post: ModerationComment["post"] })[]>(await q);
  const voted = await withVotes(rows);
  return voted.map((c, i) => ({ ...c, post: rows[i].post }));
}
