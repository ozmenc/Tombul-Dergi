-- Üyeler adını 30 günde bir değiştirebilir (admin hariç). Kayıttaki ilk ad sayılmaz.
alter table public.profiles add column name_changed_at timestamptz;

create or replace function public.guard_profile() returns trigger
language plpgsql set search_path = '' as $$
declare
  is_admin boolean := coalesce(public.my_role(), '') = 'admin';
begin
  if current_user <> 'authenticated' or is_admin then return new; end if;
  if new.role is distinct from old.role
     and not (old.role = 'reader' and new.role = 'pending' and old.id = auth.uid()) then
    raise exception 'Rolü sadece admin değiştirebilir';
  end if;
  new.name_changed_at := old.name_changed_at; -- elle ayarlanamaz
  if new.name is distinct from old.name then
    if old.name_changed_at > now() - interval '30 days' then
      raise exception 'Adını 30 günde bir değiştirebilirsin' using errcode = 'P0001', hint = 'name_cooldown';
    end if;
    new.name_changed_at := now();
  end if;
  return new;
end $$;

-- Admin üyelerin e-posta adreslerini görür; başka kimse göremez.
create function public.member_emails() returns table (id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email::text from auth.users u where public.my_role() = 'admin'
$$;
revoke execute on function public.member_emails() from public, anon;
grant execute on function public.member_emails() to authenticated;
