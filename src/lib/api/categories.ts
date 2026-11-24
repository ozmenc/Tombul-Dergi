import { must, supabase } from "./client";
import type { Category } from "../types";
import { slugify } from "../format";

export type CategoryWithCount = Category & { posts: number };

export async function listCategories(): Promise<CategoryWithCount[]> {
  const rows = must<(Category & { posts: { count: number }[] })[]>(
    await supabase.from("categories").select("id,slug,name,posts(count)").eq("posts.status", "published").order("name")
  );
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, posts: r.posts[0]?.count ?? 0 }));
}

export const createCategory = async (name: string) =>
  must<Category>(await supabase.from("categories").insert({ name: name.trim(), slug: slugify(name) }).select("id,slug,name").single());

export async function renameCategory(id: string, name: string) {
  must(await supabase.from("categories").update({ name: name.trim() }).eq("id", id));
}

/** Kategoriyi siler; yazıları kategorisiz kalır. */
export async function deleteCategory(id: string) {
  must(await supabase.from("categories").delete().eq("id", id));
}
