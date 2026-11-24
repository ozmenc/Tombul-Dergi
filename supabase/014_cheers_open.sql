-- Tokuşturma sınırsız ve kişi kaydı olmadan: IP özetli sınır tablosu ve "en çok tokuşturulanlar" kalkar.
drop function if exists public.most_cheered(int);
drop table if exists public.cheer_hits;
