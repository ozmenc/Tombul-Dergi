-- Kayıt deneme sınırı (api/signup.js): IP adresi düz değil, tuzlu SHA-256 özetiyle tutulur; bir günden eski kayıtlar silinir.
-- RLS açık ve kural yok: yalnızca sunucu (servis anahtarı) erişir.
create table public.signup_attempts (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index signup_attempts_idx on public.signup_attempts (ip_hash, created_at);
alter table public.signup_attempts enable row level security;
revoke all on public.signup_attempts from anon, authenticated;
