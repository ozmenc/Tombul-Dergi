-- Tombul Dergi 15: kullanılmayan resimler.
-- Hiçbir yazının metninde ya da kapağında, hiçbir profil fotoğrafında geçmeyen ve en az `p_min_age` önce
-- yüklenmiş resimlerin adlarını döner. Silme işini api/clean-images.js Storage API ile yapar
-- (storage.objects satırını SQL ile silmek dosyanın kendisini silmez).
-- Bekleme süresi, editörde henüz kaydedilmemiş bir yazıya eklenen resmin silinmemesi içindir.
-- Yalnızca uygulamanın ürettiği ad biçimindeki (<kullanıcı-id>/<sayı>-<ek>.<uzantı>) dosyalar aday olur;
-- başka biçimde bir ad, adres içinde farklı yazılmış olabileceği için hiçbir zaman silinmez.

create or replace function public.orphan_images(p_min_age interval default '1 day', p_limit int default 1000)
returns setof text
language sql stable security definer set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'images'
    and o.created_at < now() - p_min_age
    and o.name ~ '^[0-9a-f-]{36}/[0-9]+-[a-z0-9]+\.(webp|jpg|png|gif)$'
    and not exists (select 1 from public.posts p where strpos(p.content, o.name) > 0 or strpos(p.cover, o.name) > 0)
    and not exists (select 1 from public.profiles f where strpos(f.avatar_url, o.name) > 0)
  order by o.created_at
  limit p_limit;
$$;

revoke all on function public.orphan_images(interval, int) from public, anon, authenticated;
grant execute on function public.orphan_images(interval, int) to service_role;
