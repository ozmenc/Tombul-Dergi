import { supabase } from "../supabase";
import { must } from "./client";

export type ReportTarget = { postId: string } | { commentId: string };

export type Report = {
  id: string; reason: string; contact: string; resolved: boolean; created_at: string;
  reporter: { name: string } | null;
  post: { slug: string; title: string } | null;
  comment: { body: string; post: { slug: string; title: string } | null } | null;
};

/** Herkes bildirebilir; sonucu yalnızca admin görebildiği için geri okunmaz. */
export async function sendReport(target: ReportTarget, reason: string, contact: string) {
  const ids = "postId" in target ? { post_id: target.postId } : { comment_id: target.commentId };
  must(await supabase.from("reports").insert({ ...ids, reason: reason.trim(), contact: contact.trim() }));
}

export const listReports = async (resolved: boolean) =>
  must<Report[]>(await supabase.from("reports")
    .select("id,reason,contact,resolved,created_at,reporter:profiles(name),post:posts(slug,title),comment:comments(body,post:posts(slug,title))")
    .eq("resolved", resolved).order("created_at", { ascending: false }).limit(100));

export async function setReportResolved(id: string, resolved: boolean) {
  must(await supabase.from("reports").update({ resolved }).eq("id", id));
}
