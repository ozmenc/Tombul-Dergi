-- Tombul Dergi veritabanı. Tekrar çalıştırılabilir değil; boş bir Supabase projesine bir kez uygulanır.

-- ---------- Tablolar ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  bio text not null default '' check (char_length(bio) <= 600),
  -- pending: giriş yapabilir ama yazamaz. author: kendi yazıları. admin: her şey.
  role text not null default 'pending' check (role in ('pending', 'author', 'admin')),
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  content text not null default '',
  cover text not null default '' check (cover = '' or cover ~ '^https://'),
  author_id uuid not null references public.profiles on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_author_idx on public.posts (author_id);
create index posts_feed_idx on public.posts (status, published_at desc);

-- ---------- Yardımcılar ----------
create function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Her yeni hesap 'pending' başlar; yazar yapma işini admin paneli (api/authors.js) yapar.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Yazar kendi profilini düzenleyebilir ama rolünü yükseltemez.
create function public.guard_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role
     and current_user = 'authenticated'
     and coalesce(public.my_role(), '') <> 'admin' then
    raise exception 'Rolü sadece admin değiştirebilir';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

create function public.touch_post() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if new.status = 'published' and new.published_at is null then new.published_at = now(); end if;
  return new;
end $$;
create trigger posts_touch before insert or update on public.posts
  for each row execute function public.touch_post();

-- ---------- Erişim kuralları (RLS) ----------
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

create policy "profiles: yazarlar herkese açık" on public.profiles for select
  using (role <> 'pending' or id = (select auth.uid()) or (select public.my_role()) = 'admin');
create policy "profiles: kendi profili ya da admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.my_role()) = 'admin')
  with check (id = (select auth.uid()) or (select public.my_role()) = 'admin');

create policy "posts: yayındakiler herkese açık" on public.posts for select
  using (status = 'published' or author_id = (select auth.uid()) or (select public.my_role()) = 'admin');
create policy "posts: yazar kendi adına ekler" on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.my_role()) in ('author', 'admin'));
create policy "posts: kendi yazısı ya da admin günceller" on public.posts for update to authenticated
  using ((author_id = (select auth.uid()) and (select public.my_role()) = 'author') or (select public.my_role()) = 'admin')
  with check ((author_id = (select auth.uid()) and (select public.my_role()) = 'author') or (select public.my_role()) = 'admin');
create policy "posts: kendi yazısı ya da admin siler" on public.posts for delete to authenticated
  using ((author_id = (select auth.uid()) and (select public.my_role()) = 'author') or (select public.my_role()) = 'admin');

-- ---------- Resimler ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Herkes kendi klasörüne (kullanıcı id'si) yükler; okuma public bucket üzerinden açık.
create policy "images: yazarlar yükler" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.my_role()) in ('author', 'admin')
  );
