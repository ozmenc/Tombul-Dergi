import { must, supabase } from "./client";
import type { Vote } from "../types";

/** Yazıya oy: 1 beğen, -1 beğenme, 0 geri al. */
export async function votePost(postId: string, userId: string, value: Vote) {
  if (value === 0) must(await supabase.from("post_votes").delete().eq("post_id", postId).eq("user_id", userId));
  else must(await supabase.from("post_votes").upsert({ post_id: postId, user_id: userId, value }));
}

export async function voteComment(commentId: string, userId: string, value: Vote) {
  if (value === 0) must(await supabase.from("comment_votes").delete().eq("comment_id", commentId).eq("user_id", userId));
  else must(await supabase.from("comment_votes").upsert({ comment_id: commentId, user_id: userId, value }));
}

export const listSavedIds = async (userId: string) =>
  must<{ post_id: string }[]>(await supabase.from("saves").select("post_id").eq("user_id", userId).order("created_at", { ascending: false })).map((r) => r.post_id);

export async function setSaved(postId: string, userId: string, saved: boolean) {
  if (saved) must(await supabase.from("saves").upsert({ post_id: postId, user_id: userId }));
  else must(await supabase.from("saves").delete().eq("post_id", postId).eq("user_id", userId));
}

export const listFollowingIds = async (userId: string) =>
  must<{ followee_id: string }[]>(await supabase.from("follows").select("followee_id").eq("follower_id", userId)).map((r) => r.followee_id);

export async function setFollowing(followeeId: string, userId: string, following: boolean) {
  if (following) must(await supabase.from("follows").upsert({ follower_id: userId, followee_id: followeeId }));
  else must(await supabase.from("follows").delete().eq("follower_id", userId).eq("followee_id", followeeId));
}

export async function followerCount(userId: string) {
  const r = await supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", userId);
  must(r);
  return r.count ?? 0;
}
