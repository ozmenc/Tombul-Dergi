# Tombul Dergi

Çok yazarlı küçük bir dergi. Vite + React + TypeScript, three.js karakterler, Supabase (veritabanı, giriş, resimler), Vercel.

## Nasıl çalışır

- **Site** (`/`, `/yazi/:slug`, `/yazarlar`, `/yazar/:id`): yayındaki yazıları herkes okur.
- **Panel** (`/panel`): yazarlar e-posta ve şifreyle girer.
  - **Yazar** kendi yazılarını yazar, düzenler, yayınlar ve siler.
  - **Admin** tüm yazıları yönetir, yeni yazar ekler, rolleri değiştirir.
  - "Durduruldu" (`pending`) hesap giriş yapabilir ama yazamaz.
- Yetkiler tarayıcıda değil, Supabase'in RLS kurallarında: `supabase/schema.sql`.
- Yazar hesabı açmak servis anahtarı gerektirdiği için `api/authors.js` (Vercel fonksiyonu) üzerinden yapılır.
- Yazılar Markdown: `**kalın**`, `*eğik*`, `## başlık`, `> alıntı`, `[bağlantı](https://…)`, resimler panelden yüklenir.

## Geliştirme

```bash
npm install
vercel env pull .env.local   # Supabase değişkenleri
npm run dev                  # arayüz (http://localhost:5173)
npm test                     # birim testleri
npm run build                # tip kontrolü + derleme
```

`npm run dev` sadece arayüzü çalıştırır; panelde "Yazar ekle" `/api/authors` fonksiyonuna ihtiyaç duyar ve Vercel'de çalışır.

## Yayın

`main` dalına her push Vercel'de otomatik yayınlanır.

## Veritabanı

Şema `supabase/schema.sql` dosyasında; boş bir Supabase projesine bir kez uygulanır.
