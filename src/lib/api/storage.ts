import { supabase } from "./client";

/** Depoya (images kovası) girebilen türler. Diğer resimler (HEIC vb.) tarayıcı açabiliyorsa bunlara çevrilir. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_INPUT = 25 * 1024 * 1024;
const MAX_STORED = 5 * 1024 * 1024; // kova sınırı (supabase/schema.sql)

/**
 * Resmi tarayıcıda küçültür: uzun kenar en fazla `maxSide` px, WebP (WebP üretemeyen Safari'de JPEG).
 * Yeniden kodlamak konum gibi EXIF bilgilerini de siler. GIF hareketli olabileceği için olduğu gibi kalır.
 */
export async function compressImage(file: File, maxSide: number): Promise<Blob> {
  if (file.type === "image/gif") return file;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error("Bu resim açılamadı. JPG, PNG ya da WEBP dene.");
  }
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const encode = (type: string, quality: number) => new Promise<Blob | null>((done) => canvas.toBlob(done, type, quality));
  let out = await encode("image/webp", 0.82);
  if (out?.type !== "image/webp") {
    // JPEG saydamlık taşımaz: saydam yerler siyah çıkmasın diye arkaya beyaz.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    out = await encode("image/jpeg", 0.85);
  }
  if (!out) throw new Error("Resim sıkıştırılamadı.");
  // Küçük PNG'ler (ekran görüntüsü, çizim) kayıpsız hâliyle daha küçükse öyle kalsın.
  return file.type === "image/png" && file.size <= out.size ? file : out;
}

/** Resmi sıkıştırıp kullanıcının kendi klasörüne yükler, herkese açık adresini döner. */
export async function uploadImage(file: File, userId: string, maxSide = 2000) {
  if (!file.type.startsWith("image/")) throw new Error("Sadece resim yükleyebilirsin.");
  if (file.size > MAX_INPUT) throw new Error("Resim en fazla 25 MB olabilir.");
  const blob = await compressImage(file, maxSide);
  if (blob.size > MAX_STORED) throw new Error(file.type === "image/gif" ? "GIF'ler sıkıştırılamıyor; en fazla 5 MB olabilir." : "Resim sıkıştırıldıktan sonra bile çok büyük.");
  const ext = blob.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  // Dosya adları benzersiz, içerik hiç değişmez: uzun süre önbellekte kalabilir.
  const { error } = await supabase.storage.from("images").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
  if (error) throw new Error("Resim yüklenemedi: " + error.message);
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}
