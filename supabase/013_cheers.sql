-- Tokuşturma: herkes (üye olmayan da) bir yazıya istediği kadar tokuşturur, şişe gibi.
-- Yazma yalnızca api/cheer.js üzerinden (servis anahtarı); IP düz saklanmaz, HMAC özetiyle saatlik sınır uygulanır.
create table public.post_cheers (
  post_id uuid primary key references public.posts on delete cascade,
  n bigint not null default 0 check (n >= 0)
);
create table public.cheer_hits (
  ip_hash text not null,
  n int not null check (n between 1 and 50),
  created_at timestamptz not null default now()
);
create index cheer_hits_idx on public.cheer_hits (ip_hash, created_at);
alter table public.post_cheers enable row level security; -- kural yok: yalnızca sunucu yazar
alter table public.cheer_hits enable row level security;
revoke all on public.post_cheers, public.cheer_hits from anon, authenticated;

-- Sunucu (api/cheer.js) sayacı artırır; yeni toplamı döner.
create function public.add_cheers(p_post uuid, p_n int) returns bigint
language sql security definer set search_path = '' as $$
  insert into public.post_cheers (post_id, n) values (p_post, p_n)
  on conflict (post_id) do update set n = public.post_cheers.n + excluded.n
  returning n
$$;
revoke execute on function public.add_cheers(uuid, int) from public, anon, authenticated;

-- Yayındaki yazıların sayaçları (liste ve yazı sayfası için).
create function public.cheer_counts(ids uuid[]) returns table (post_id uuid, n bigint)
language sql stable security definer set search_path = '' as $$
  select c.post_id, c.n from public.post_cheers c
  join public.posts p on p.id = c.post_id and p.status = 'published'
  where c.post_id = any(ids)
$$;

-- En çok tokuşturulan yayındaki yazılar.
create function public.most_cheered(p_limit int default 5) returns table (post_id uuid, n bigint)
language sql stable security definer set search_path = '' as $$
  select c.post_id, c.n from public.post_cheers c
  join public.posts p on p.id = c.post_id and p.status = 'published'
  where c.n > 0 order by c.n desc, p.published_at desc limit least(greatest(p_limit, 1), 20)
$$;
grant execute on function public.cheer_counts(uuid[]), public.most_cheered(int) to anon, authenticated;
