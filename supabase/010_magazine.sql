-- Dergi düzeni: yorum, beğeni/beğenmeme, kaydetme ve takip kalkar. Okumak için hesap gerekmez;
-- hesaplar yazarlar içindir (009: admin onayı). Bildirimler yalnızca yazılar için kalır.
delete from public.reports where post_id is null; -- yorum bildirimleri
alter table public.reports drop column comment_id;
alter table public.reports alter column post_id set not null;

drop function if exists public.popular_post_ids(int, uuid);
drop view if exists public.post_stats;
drop view if exists public.comment_stats;
drop table if exists public.comment_votes;
drop table if exists public.post_votes;
drop table if exists public.comments;
drop function if exists public.guard_comment();
drop table if exists public.saves;
drop table if exists public.follows;
