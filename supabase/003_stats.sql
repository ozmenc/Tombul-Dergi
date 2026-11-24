-- Sayaçlar. security_invoker: okuyanın RLS kuralları geçerli (gizli yorumlar sayılmaz).
create view public.post_stats with (security_invoker = true) as
select p.id as post_id,
  (select count(*) from public.post_votes v where v.post_id = p.id and v.value = 1)::int as likes,
  (select count(*) from public.post_votes v where v.post_id = p.id and v.value = -1)::int as dislikes,
  (select count(*) from public.comments c where c.post_id = p.id and not c.hidden)::int as comments
from public.posts p;

create view public.comment_stats with (security_invoker = true) as
select c.id as comment_id,
  (select count(*) from public.comment_votes v where v.comment_id = c.id and v.value = 1)::int as likes,
  (select count(*) from public.comment_votes v where v.comment_id = c.id and v.value = -1)::int as dislikes
from public.comments c;

grant select on public.post_stats, public.comment_stats to anon, authenticated;
