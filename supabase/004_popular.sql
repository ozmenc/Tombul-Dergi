-- Popüler sıralama sunucuda: beğeni ×2 + yorum ×3 − beğenmeme, eşitlikte yeni olan önce.
-- Dizi döner (sıra garanti); security invoker: okuyanın RLS kuralları geçerli.
create function public.popular_post_ids(p_limit int default 20, p_category uuid default null)
returns uuid[] language sql stable security invoker set search_path = '' as $$
  select coalesce(array_agg(id order by score desc, published_at desc), '{}')
  from (
    select p.id, p.published_at, coalesce(s.likes, 0) * 2 + coalesce(s.comments, 0) * 3 - coalesce(s.dislikes, 0) as score
    from public.posts p
    left join public.post_stats s on s.post_id = p.id
    where p.status = 'published' and (p_category is null or p.category_id = p_category)
    order by score desc, p.published_at desc
    limit least(greatest(p_limit, 1), 1000) -- kötüye kullanıma karşı üst sınır
  ) ranked
$$;
grant execute on function public.popular_post_ids(int, uuid) to anon, authenticated;
