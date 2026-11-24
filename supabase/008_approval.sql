-- Yorum ve yazı yalnızca admin onaylı hesaplardan: yeni hesap onaysız açılır, admin onaylar.
-- Yazar ve admin her zaman onaylıdır (yazar rolünü zaten yalnızca admin verir).
alter table public.profiles add column approved boolean not null default false;
update public.profiles set approved = true; -- mevcut hesaplar

create or replace function public.guard_profile() returns trigger
language plpgsql set search_path = '' as $$
declare
  is_admin boolean := coalesce(public.my_role(), '') = 'admin';
begin
  if current_user = 'authenticated' and not is_admin then
    if new.role is distinct from old.role
       and not (old.role = 'reader' and new.role = 'pending' and old.id = auth.uid()) then
      raise exception 'Rolü sadece admin değiştirebilir';
    end if;
    new.approved := old.approved; -- onayı yalnızca admin verir
    new.name_changed_at := old.name_changed_at; -- elle ayarlanamaz
    if new.name is distinct from old.name then
      if old.name_changed_at > now() - interval '30 days' then
        raise exception 'Adını 30 günde bir değiştirebilirsin' using errcode = 'P0001', hint = 'name_cooldown';
      end if;
      new.name_changed_at := now();
    end if;
  end if;
  if new.role in ('author', 'admin') then new.approved := true; end if;
  return new;
end $$;

-- Oturumdaki üye onaylı mı? (RLS içinde kullanılır)
create function public.is_approved() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false)
$$;
grant execute on function public.is_approved() to authenticated;

drop policy "comments: üye kendi adına yazar" on public.comments;
create policy "comments: onaylı üye kendi adına yazar" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and not hidden and (select public.is_approved())
              and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'));
