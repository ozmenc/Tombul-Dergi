# Tombul Dergi

Düz HTML/CSS/JS, derleme gerektirmez.

## Dosyalar
- `index.html`  → site (tasarım ve görünüm)
- `posts.js`    → TÜM YAZILAR burada
- `images/`     → resimler (yüklediklerin buraya)

## Yazı eklemek
`posts.js` dosyasını aç, listenin en üstüne yeni bir `{ ... }` bloğu ekle.

## Resim eklemek
- Dosyayı `images/` klasörüne koy.
- Kapak: `cover: "images/dosya.jpg"`
- Yazı içi: boş satıra `![açıklama](images/dosya.jpg)`

## Arka plan fotoğrafı
Flu sokak fotoğrafını `images/arka-plan.jpg` adıyla koy, otomatik kullanılır.
Yoksa yerine çizilmiş flu bir sokak sahnesi görünür.

## Vercel'e yayınlamak
1. Klasörü GitHub'a yükle.
2. vercel.com → Add New → Project → repoyu seç → Deploy.
   (Framework: "Other", build komutu boş.)
Sonraki her güncellemede GitHub'a gönder, Vercel kendiliğinden yeniler.
