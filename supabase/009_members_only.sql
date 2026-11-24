-- Tek kapı admin onayı. Roller: pending (onay bekliyor, yalnızca okur), author (onaylı üye: yazı, yorum,
-- beğeni, kaydetme, takip, resim), admin. Yazarlık başvurusu ve ayrı "approved" alanı kalkar (008'in yerine).
update public.profiles set role = 'pending' where role = 'reader';
update public.profiles set role = 'author' where role = 'pending' and approved; -- 008 ile onaylananlar
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('pending', 'author', 'admin'));
alter table public.profiles alter column role set default 'pending';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, role) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), 'pending');
  return new;
end $$;

create or replace function public.guard_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and coalesce(public.my_role(), '') <> 'admin' then
    if new.role is distinct from old.role then raise exception 'Rolü sadece admin değiştirebilir'; end if;
    new.name_changed_at := old.name_changed_at; -- elle ayarlanamaz
    if new.name is distinct from old.name then
      if old.name_changed_at > now() - interval '30 days' then
        raise exception 'Adını 30 günde bir değiştirebilirsin' using errcode = 'P0001', hint = 'name_cooldown';
      end if;
      new.name_changed_at := now();
    end if;
  end if;
  return new;
end $$;

-- Oturumdaki üye onaylı mı (üye ya da admin)?
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('author', 'admin') from public.profiles where id = auth.uid()), false)
$$;
alter table public.profiles drop column approved;

-- Yazı: onaylı üye kendi adına yazar, düzenler, siler; admin hepsini.
drop policy "posts: yazar kendi adına ekler" on public.posts;
drop policy "posts: kendi yazısı ya da admin günceller" on public.posts;
drop policy "posts: kendi yazısı ya da admin siler" on public.posts;
create policy "posts: onaylı üye kendi adına ekler" on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_approved()));
create policy "posts: kendi yazısı ya da admin günceller" on public.posts for update to authenticated
  using ((author_id = (select auth.uid()) and (select public.is_approved())) or (select public.my_role()) = 'admin')
  with check ((author_id = (select auth.uid()) and (select public.is_approved())) or (select public.my_role()) = 'admin');
create policy "posts: kendi yazısı ya da admin siler" on public.posts for delete to authenticated
  using ((author_id = (select auth.uid()) and (select public.is_approved())) or (select public.my_role()) = 'admin');

-- Beğeni, kaydetme, takip, resim: yalnızca onaylı üyeler.
drop policy "post_votes: kendi adına verir" on public.post_votes;
drop policy "post_votes: kendi oyunu değiştirir" on public.post_votes;
create policy "post_votes: onaylı üye kendi adına verir" on public.post_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_approved()));
create policy "post_votes: onaylı üye kendi oyunu değiştirir" on public.post_votes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (select public.is_approved()));
drop policy "comment_votes: kendi adına verir" on public.comment_votes;
drop policy "comment_votes: kendi oyunu değiştirir" on public.comment_votes;
create policy "comment_votes: onaylı üye kendi adına verir" on public.comment_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_approved()));
create policy "comment_votes: onaylı üye kendi oyunu değiştirir" on public.comment_votes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (select public.is_approved()));
drop policy "saves: kendi adına" on public.saves;
create policy "saves: onaylı üye kendi adına" on public.saves for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_approved()));
drop policy "follows: kendi adına" on public.follows;
create policy "follows: onaylı üye kendi adına" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and (select public.is_approved()));
drop policy "images: üyeler kendi klasörüne yükler" on storage.objects;
create policy "images: onaylı üyeler kendi klasörüne yükler" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_approved()));
-- Yorum kuralı (008) is_approved() kullanır; yeni tanımla aynen geçerli.
