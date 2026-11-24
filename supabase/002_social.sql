-- Tombul Dergi 2: okurlar, kategoriler, etiketler, yorumlar, beğeni/beğenmeme, kaydetme, takip.
-- schema.sql'den sonra bir kez uygulanır.

-- ---------- Roller: okur eklendi ----------
-- reader: yorum yapar, tepki verir, kaydeder, takip eder. pending: yazar olmak için başvurmuş okur.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('reader', 'pending', 'author', 'admin'));
alter table public.profiles alter column role set default 'reader';
alter table public.profiles add column avatar_url text not null default '' check (avatar_url = '' or avatar_url ~ '^https://');

-- Yeni hesap: kayıtta "yazar olmak istiyorum" dediyse pending, yoksa reader.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''),
          case when new.raw_user_meta_data ->> 'wants_author' = 'true' then 'pending' else 'reader' end);
  return new;
end $$;

-- Admin olmayan biri rolünü yalnızca okur → başvuran yapabilir (yazarlığa başvuru).
create or replace function public.guard_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and current_user = 'authenticated'
     and coalesce(public.my_role(), '') <> 'admin'
     and not (old.role = 'reader' and new.role = 'pending' and old.id = auth.uid()) then
    raise exception 'Rolü sadece admin değiştirebilir';
  end if;
  return new;
end $$;

-- Yorumcuların adı görünür olmalı: profiller herkese açık (ad, kısa tanıtım, avatar).
drop policy "profiles: yazarlar herkese açık" on public.profiles;
create policy "profiles: herkese açık" on public.profiles for select using (true);

-- ---------- Kategoriler ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "categories: herkese açık" on public.categories for select using (true);
create policy "categories: admin yönetir" on public.categories for all to authenticated
  using ((select public.my_role()) = 'admin') with check ((select public.my_role()) = 'admin');

insert into public.categories (slug, name) values
  ('deneme', 'Deneme'), ('hikaye', 'Hikâye'), ('sehir', 'Şehir'), ('muzik', 'Müzik'), ('bilim', 'Bilim'), ('gundem', 'Gündem');

-- ---------- Yazılara: kategori, etiket, özet, öne çıkarma ----------
alter table public.posts add column category_id uuid references public.categories on delete set null;
alter table public.posts add column tags text[] not null default '{}' check (cardinality(tags) <= 8);
alter table public.posts add column excerpt text not null default '' check (char_length(excerpt) <= 300);
alter table public.posts add column featured boolean not null default false;
create index posts_category_idx on public.posts (category_id);
create index posts_tags_idx on public.posts using gin (tags);

-- Öne çıkarmayı sadece admin değiştirir.
create function public.guard_post() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.featured is distinct from (case when tg_op = 'UPDATE' then old.featured else false end)
     and current_user = 'authenticated' and coalesce(public.my_role(), '') <> 'admin' then
    raise exception 'Öne çıkarmayı sadece admin değiştirebilir';
  end if;
  return new;
end $$;
create trigger posts_guard before insert or update on public.posts
  for each row execute function public.guard_post();

update public.posts set category_id = (select id from public.categories where slug = 'deneme');

-- ---------- Yorumlar ----------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  parent_id uuid references public.comments on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
alter table public.comments enable row level security;

-- Yanıt tek seviye: bir yanıta yanıt verilmez, yanıt aynı yazıda olmalı.
create function public.guard_comment() returns trigger
language plpgsql set search_path = '' as $$
declare p record;
begin
  if new.parent_id is not null then
    select post_id, parent_id into p from public.comments where id = new.parent_id;
    if p.post_id is distinct from new.post_id or p.parent_id is not null then
      raise exception 'Geçersiz yanıt';
    end if;
  end if;
  if tg_op = 'UPDATE' and (new.body <> old.body or new.post_id <> old.post_id or new.author_id <> old.author_id) then
    raise exception 'Yorum düzenlenemez';
  end if;
  return new;
end $$;
create trigger comments_guard before insert or update on public.comments
  for each row execute function public.guard_comment();

create policy "comments: yayındaki yazının görünen yorumları" on public.comments for select
  using ((not hidden and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'))
         or (select public.my_role()) = 'admin');
create policy "comments: üye kendi adına yazar" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and not hidden
              and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'));
create policy "comments: admin gizler" on public.comments for update to authenticated
  using ((select public.my_role()) = 'admin') with check ((select public.my_role()) = 'admin');
create policy "comments: kendi yorumu ya da admin siler" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.my_role()) = 'admin');

-- ---------- Beğeni (+1) / beğenmeme (-1), kaydetme, takip ----------
create table public.post_votes (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table public.comment_votes (
  comment_id uuid not null references public.comments on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create table public.saves (
  user_id uuid not null references public.profiles on delete cascade,
  post_id uuid not null references public.posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create table public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  followee_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
alter table public.post_votes enable row level security;
alter table public.comment_votes enable row level security;
alter table public.saves enable row level security;
alter table public.follows enable row level security;

create policy "post_votes: herkese açık" on public.post_votes for select using (true);
create policy "post_votes: kendi adına verir" on public.post_votes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "post_votes: kendi oyunu değiştirir" on public.post_votes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "post_votes: kendi geri alır" on public.post_votes for delete to authenticated using (user_id = (select auth.uid()));
create policy "comment_votes: herkese açık" on public.comment_votes for select using (true);
create policy "comment_votes: kendi adına verir" on public.comment_votes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "comment_votes: kendi oyunu değiştirir" on public.comment_votes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "comment_votes: kendi geri alır" on public.comment_votes for delete to authenticated using (user_id = (select auth.uid()));
create policy "saves: sadece kendisi görür" on public.saves for select to authenticated using (user_id = (select auth.uid()));
create policy "saves: kendi adına" on public.saves for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saves: kendi siler" on public.saves for delete to authenticated using (user_id = (select auth.uid()));
create policy "follows: herkese açık" on public.follows for select using (true);
create policy "follows: kendi adına" on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "follows: kendi bırakır" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

-- ---------- Resimler: her üye kendi klasörüne (avatar için) ----------
drop policy "images: yazarlar yükler" on storage.objects;
create policy "images: üyeler kendi klasörüne yükler" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
