// Her gece çalışır (vercel.json → schedules): hiçbir yazıda ya da profilde kullanılmayan, bir günden eski resimleri siler.
// Özel fonksiyon: herkese açık adresi yoktur, yalnızca Vercel'in zamanlayıcısı çağırabilir.
import { handleSchedule } from "@vercel/schedules";
import { sb } from "./_supabase.js";

/** Kullanılmayan resimleri siler, silinen dosya adlarını döner (supabase/015_orphan_images.sql). */
export async function cleanImages() {
  const res = await sb("/rest/v1/rpc/orphan_images", { method: "POST", body: "{}" });
  const names = await res.json();
  if (!res.ok || !Array.isArray(names)) throw new Error("Kullanılmayan resimler bulunamadı: " + JSON.stringify(names));
  if (!names.length) return [];
  const del = await sb("/storage/v1/object/images", { method: "DELETE", body: JSON.stringify({ prefixes: names }) });
  if (!del.ok) throw new Error(`Resimler silinemedi (${del.status}): ${await del.text()}`);
  return names;
}

export const POST = handleSchedule(async (run) => {
  const removed = await cleanImages();
  console.log(`${run.name}: ${removed.length} kullanılmayan resim silindi`);
});
