-- Aynı üye aynı yere 30 saniye içinde aynı yorumu ikinci kez yazamaz (çift tıklama, ağ tekrarı, iki sekme).
-- Kilit, eşzamanlı iki isteğin ikisinin birden kontrolü geçmesini önler.
create or replace function public.guard_comment() returns trigger
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
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.author_id::text || new.post_id::text, 0));
    if exists (select 1 from public.comments c
               where c.author_id = new.author_id and c.post_id = new.post_id
                 and c.parent_id is not distinct from new.parent_id
                 and btrim(c.body) = btrim(new.body) and c.created_at > now() - interval '30 seconds') then
      raise exception 'Bu yorumu az önce gönderdin' using errcode = '23505';
    end if;
  end if;
  return new;
end $$;
