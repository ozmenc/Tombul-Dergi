import { supabase } from "./client";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Kullanıcının kendi klasörüne resim yükler, herkese açık adresini döner. */
export async function uploadImage(file: File, userId: string) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Sadece JPG, PNG, WEBP ya da GIF yükleyebilirsin.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Resim en fazla 5 MB olabilir.");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(path, file, { contentType: file.type });
  if (error) throw new Error("Resim yüklenemedi: " + error.message);
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}
