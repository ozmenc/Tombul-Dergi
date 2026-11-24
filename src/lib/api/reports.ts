import { supabase } from "../supabase";
import { must } from "./client";

export type Report = {
  id: string; reason: string; contact: string; resolved: boolean; created_at: string;
  reporter: { name: string } | null;
  post: { slug: string; title: string } | null;
};

/** Herkes bildirebilir; sonucu yalnızca admin görebildiği için geri okunmaz. */
export async function sendReport(postId: string, reason: string, contact: string) {
  must(await supabase.from("reports").insert({ post_id: postId, reason: reason.trim(), contact: contact.trim() }));
}

export const listReports = async (resolved: boolean) =>
  must<Report[]>(await supabase.from("reports")
    .select("id,reason,contact,resolved,created_at,reporter:profiles(name),post:posts(slug,title)")
    .eq("resolved", resolved).order("created_at", { ascending: false }).limit(100));

export async function setReportResolved(id: string, resolved: boolean) {
  must(await supabase.from("reports").update({ resolved }).eq("id", id));
}
