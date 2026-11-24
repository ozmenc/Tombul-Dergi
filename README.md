# Tombul Dergi

Oku, beğen, yorum yap, sen de yaz. Vite + React + TypeScript, Supabase (veritabanı, giriş, resimler), Vercel.

## Neler var

- **Akış** (`/`): yazar halkaları, "Senin için / Takip ettiklerin / Popüler", kategori filtresi, "Daha fazla göster". Popüler sıralaması sunucuda (`popular_post_ids`).
- **Keşfet** (`/kesfet?q=…&kategori=…&etiket=…`): yazı ve yazar araması, kategoriler, etiketler.
- **Yazı** (`/yazi/:slug`): Markdown metin, beğen / beğenme, kaydet, paylaş, yorumlar ve yanıtlar, sıradaki yazılar.
- **Yazarlar** (`/yazarlar`, `/yazar/:id`): takip et, takipçi ve yazı sayıları.
- **Kaydettiklerim** (`/kaydedilenler`), **Hesabım** (`/hesap`): profil, fotoğraf, şifre, yazarlık başvurusu.
- **Giriş / kayıt** (`/giris`, `/kayit`): kayıtta "yazar olmak istiyorum" seçilebilir.
- **Şifremi unuttum** (`/sifremi-unuttum` → e-posta → `/sifre-yenile`).
- **Panel** (`/panel`, yazar ve admin): genel bakış, yazılar, editör (kategori, etiket, özet, kapak, öne çıkarma).
  Admin ayrıca kategorileri, üyeleri (başvuru onayı, roller, yazar ekleme, şifre sıfırlama) ve yorumları (gizle / sil) yönetir.
- Aydınlık ve koyu tema; her sayfada yükleniyor, boş, hata ve 404 durumları.
- Maskot: `src/components/Bottle.tsx` (gözleri imleci izler; sevinç, üzgün, utangaç, dolum, devrik halleri).

## Roller

| Rol | Yapabilir |
|---|---|
| `reader` (okur) | yorum, beğen/beğenme, kaydet, takip; yazarlığa başvurur |
| `pending` (başvuran) | okur gibi; admin onayını bekler |
| `author` (yazar) | kendi yazılarını yazar, yayınlar, siler |
| `admin` | her şey |

Yetkiler tarayıcıda değil, Supabase RLS kurallarında (`supabase/*.sql`).

## Sunucu fonksiyonları (`api/`)

- `signup.js`: herkese açık kayıt. E-posta doğrulaması yok (Supabase'in hazır e-posta servisi saatte birkaç e-postayla sınırlı); bot tuzağı alanı var.
- `authors.js`: admin yazar hesabı açar.
- `password.js`: admin bir üyeye yeni geçici şifre üretir (e-posta ulaşmazsa yedek yol).
- `_supabase.js`: fonksiyonların ortak yardımcıları (fonksiyon olarak yayınlanmaz).

## Geliştirme

```bash
npm install
vercel env pull .env.local   # Supabase değişkenleri
npm run dev                  # arayüz
npm test                     # birim testleri
npm run build                # tip kontrolü + derleme
npm run logo                 # public/logo.svg ve favicon'u src/brand/logo.ts'ten üretir
```

`npm run dev` sadece arayüzü çalıştırır; kayıt ve yazar ekleme `api/` fonksiyonlarına ihtiyaç duyar ve Vercel'de çalışır.

## Veritabanı

Boş bir Supabase projesine sırayla bir kez uygulanır: `supabase/schema.sql`, `002_social.sql`, `003_stats.sql`, `004_popular.sql`.

Şifre sıfırlama e-postası için Supabase → Authentication → URL Configuration:
**Site URL** canlı adres olmalı, **Redirect URLs** listesinde `https://<canlı adres>/sifre-yenile` bulunmalı.
Supabase'in hazır e-posta servisi saatte birkaç e-postayla sınırlıdır; çok üye olursa kendi SMTP hesabını bağla.

## Yayın

`main` dalına her push Vercel'de otomatik yayınlanır.

Logo etiket yazıları Fraunces (SIL Open Font License) ile çizilip path'e çevrildi.
