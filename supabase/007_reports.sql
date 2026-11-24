-- İçerik bildirimi (5651 sayılı Kanun: yer sağlayıcı bildirilen hukuka aykırı içeriği inceleyip kaldırır).
-- Herkes bildirebilir (giriş şart değil); bildirimleri yalnızca admin görür, kapatır ve siler.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts on delete cascade,
  comment_id uuid references public.comments on delete cascade,
  reporter_id uuid references public.profiles on delete set null default auth.uid(),
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  contact text not null default '' check (char_length(contact) <= 200),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  check ((post_id is null) <> (comment_id is null))
);
create index reports_open_idx on public.reports (resolved, created_at desc);
alter table public.reports enable row level security;

create policy "reports: herkes bildirir" on public.reports for insert to anon, authenticated
  with check (not resolved and reporter_id is not distinct from auth.uid());
create policy "reports: admin görür" on public.reports for select to authenticated using ((select public.my_role()) = 'admin');
create policy "reports: admin kapatır" on public.reports for update to authenticated
  using ((select public.my_role()) = 'admin') with check ((select public.my_role()) = 'admin');
create policy "reports: admin siler" on public.reports for delete to authenticated using ((select public.my_role()) = 'admin');
grant insert on public.reports to anon, authenticated;
grant select, update, delete on public.reports to authenticated;
