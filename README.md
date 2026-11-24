# Tombul Dergi

Oku, beğen, yorum yap, sen de yaz. Vite + React + TypeScript, Supabase (veritabanı, giriş, resimler), Vercel.

## Neler var

- **Ana sayfa** (`/`): manşet (öne çıkan ya da en yeni yazı), son yazılar, kategori filtresi, "Daha fazla göster".
- **Keşfet** (`/kesfet?q=…&kategori=…&etiket=…`): yazı ve yazar araması, kategoriler, etiketler.
- **Yazı** (`/yazi/:slug`): Markdown metin, paylaş, bildir, sıradaki yazılar.
- **Yazarlar** (`/yazarlar`, `/yazar/:id`): yayında yazısı olan üyeler.
- **Giriş / kayıt / şifre** (`/giris`, `/kayit`, `/sifremi-unuttum`, `/sifre-yenile`): kayıt yazarlar içindir, hesap admin onayını bekler.
- **Hesabım** (`/hesap`): profil, fotoğraf, şifre, üyelik durumu. Ad 30 günde bir değişir (admin hariç).
- **Panel** (`/panel`, onaylı üye ve admin): genel bakış, yazılar, editör (kategori, etiket, özet, kapak,
  resim boyutu: `![](url "küçük")` / `"orta"`). Öne çıkarma yalnızca admin.
  Admin ayrıca kategorileri, üyeleri (e-postalar, hesap onayı, roller, onaylı üye ekleme, şifre sıfırlama) ve bildirimleri yönetir.
- **Hukuki koruma**: `/kosullar` (kullanım koşulları ve sorumluluk reddi, 5651 yer sağlayıcı); kayıtta zorunlu onay
  (sürüm ve tarih hesabın `user_metadata`sına yazılır); yazı altında ve editörde sorumluluk notu;
  yazılarda **Bildir** (herkes gönderir, yalnızca admin görür: Panel → Bildirimler).
- Aydınlık ve koyu tema; her sayfada yükleniyor, boş, hata ve 404 durumları.
- Maskot: `src/components/Bottle.tsx` (gözleri imleci izler; sevinç, üzgün, utangaç, dolum, devrik halleri).

## Roller

| Rol | Yapabilir |
|---|---|
| `pending` (onay bekliyor) | yalnızca okur; yeni kayıtlar böyle açılır |
| `author` (onaylı üye) | yazı paylaşır |
| `admin` | her şey; hesapları onaylar (Panel → Üyeler) |

Giriş yapmamış ziyaretçiler yalnızca okur. Yetkiler tarayıcıda değil, Supabase RLS kurallarında (`supabase/*.sql`).

## Sunucu fonksiyonları (`api/`)

- `signup.js`: herkese açık kayıt. E-posta doğrulaması yok (Supabase'in hazır e-posta servisi saatte birkaç e-postayla sınırlı); bot tuzağı alanı var.
- `authors.js`: admin onaylı üye hesabı açar.
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

Boş bir Supabase projesine sırayla bir kez uygulanır: `supabase/schema.sql`, `002_social.sql`, `003_stats.sql`, `004_popular.sql`, `005_members.sql`, `006_comment_dedupe.sql`, `007_reports.sql`, `008_approval.sql`, `009_members_only.sql`, `010_magazine.sql`.
Dosyalar tarih sırasıyla birikmiş değişikliklerdir; son durum: dergi düzeni, yorum ve beğeni yok, yazı için admin onayı.

Şifre sıfırlama e-postası için Supabase → Authentication → URL Configuration:
**Site URL** canlı adres olmalı, **Redirect URLs** listesinde `https://<canlı adres>/sifre-yenile` bulunmalı.
Supabase'in hazır e-posta servisi saatte birkaç e-postayla sınırlıdır; çok üye olursa kendi SMTP hesabını bağla.

## Yayın

`main` dalına her push Vercel'de otomatik yayınlanır.

Logo etiket yazıları Fraunces (SIL Open Font License) ile çizilip path'e çevrildi.
