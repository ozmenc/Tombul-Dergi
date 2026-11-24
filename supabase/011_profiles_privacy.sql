-- Profiller yalnızca gerektiği kadar görünür: onaylı üyeler (yazarlar) ve admin herkese açık;
-- onay bekleyen hesabı yalnızca kendisi ve admin görür. Yayında yazısı olan biri onayı kaldırılsa da
-- yazılarındaki adı görünmeye devam eder. E-postalar zaten auth.users'ta, yalnızca admin RPC ile görür.
drop policy "profiles: herkese açık" on public.profiles;
create policy "profiles: yazarlar herkese, diğerleri kendine ve admine" on public.profiles for select
  using (role in ('author', 'admin')
         or id = (select auth.uid())
         or (select public.my_role()) = 'admin'
         or exists (select 1 from public.posts p where p.author_id = profiles.id and p.status = 'published'));
