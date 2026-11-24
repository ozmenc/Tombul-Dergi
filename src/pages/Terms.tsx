import { useTitle } from "../lib/useTitle";

/** Kullanım koşulları ve sorumluluk reddi. Kayıtta kabul edilir (api/signup.js tarihi saklar). */
export default function Terms() {
  useTitle("Kullanım koşulları");
  return (
    <article className="article card terms">
      <h1 className="article-title">Kullanım koşulları ve sorumluluk reddi</h1>
      <p className="muted">Son güncelleme: 24 Kasım 2026</p>
      <div className="prose">
        <h2>1. Tombul Dergi nedir?</h2>
        <p>
          Tombul Dergi, üyelerin kendi yazılarını ve yorumlarını paylaştığı bir platformdur. Tombul Dergi, 5651 sayılı Kanun
          kapsamında <strong>yer sağlayıcıdır</strong>. Üyelerin paylaştığı içerikleri önceden kontrol etmekle ya da hukuka
          aykırı bir faaliyet olup olmadığını araştırmakla yükümlü değildir.
        </p>

        <h2>2. İçerikten kim sorumlu?</h2>
        <p>
          Sitedeki yazılar, yorumlar, görseller ve diğer bütün içerikler <strong>onları paylaşan üyelere aittir</strong>.
          Bu içeriklerden doğan her türlü hukuki ve cezai sorumluluk <strong>yalnızca içeriği paylaşan üyeye</strong> aittir.
        </p>
        <p>
          Tombul Dergi, yöneticileri ve geliştiricileri, üyelerin paylaştığı içeriklerin doğruluğu, güncelliği, hukuka
          uygunluğu ya da üçüncü kişilerin haklarını ihlal edip etmediği konusunda <strong>hiçbir sorumluluk kabul etmez</strong>.
          Yazılar ve yorumlar yazarlarının görüşüdür. Tombul Dergi'nin görüşünü yansıtmaz.
        </p>

        <p>
          Yazı, yorum, beğeni ve diğer etkileşimler yalnızca <strong>yönetimin onayladığı hesaplardan</strong> yapılabilir; diğer ziyaretçiler yalnızca okuyabilir. Onay, içeriğin
          yönetimce incelendiği ya da benimsendiği anlamına gelmez; sorumluluk yine paylaşan üyededir.
        </p>

        <h2>3. Üye olarak neyi kabul ediyorsun?</h2>
        <p>Kayıt olarak, yazı yayınlayarak ya da yorum göndererek şunları kabul edersin:</p>
        <ul>
          <li>Paylaştığın her içerikten hukuken yalnızca sen sorumlusun.</li>
          <li>
            Hakaret, tehdit, nefret söylemi, taciz, başkalarının kişisel bilgileri, izinsiz kullanılan eserler (yazı,
            fotoğraf, görsel), suça teşvik, yanıltıcı kimlik ve reklam/spam paylaşmazsın.
          </li>
          <li>
            Paylaştığın bir içerik yüzünden Tombul Dergi'ye ya da yöneticilerine bir talep, şikâyet ya da dava yöneltilirse
            bunun bütün sonuçlarını ve masraflarını üstlenirsin. Tombul Dergi'yi bunlardan sorumlu tutamazsın.
          </li>
          <li>Hesabının güvenliğinden ve hesabınla yapılan her şeyden sen sorumlusun.</li>
        </ul>

        <h2>4. Bildirim ve içerik kaldırma</h2>
        <p>
          Hukuka aykırı ya da bu kurallara uymayan bir içerik görürsen, yazının ya da yorumun altındaki{" "}
          <strong>Bildir</strong> düğmesiyle yönetime bildir. Bildirimler incelenir. Hukuka aykırı bulunan içerik
          yayından kaldırılır.
        </p>
        <p>
          Yönetim, bildirim olmasa da kurallara uymayan içeriği önceden haber vermeden gizleyebilir ya da silebilir.
          Üyelikleri kısıtlayabilir ya da kapatabilir. Yetkili makamlardan gelen talepler yasal çerçevede yerine getirilir.
        </p>

        <h2>5. Kişisel veriler</h2>
        <p>
          Kayıtta adını, e-posta adresini ve kayıt tarihini saklarız. Paylaştığın içerikler ve adın sitede herkese
          görünür. E-posta adresini yalnızca dergi yönetimi görebilir. Verilerin satılmaz. Kanunen zorunlu olduğunda
          yetkili makamlarla paylaşılabilir.
        </p>

        <h2>6. Hizmet olduğu gibi sunulur</h2>
        <p>
          Tombul Dergi ücretsizdir ve olduğu gibi sunulur. Kesintisiz ya da hatasız çalışacağı garanti edilmez.
          Kesinti, veri kaybı ya da siteyi kullanmaktan doğan zararlardan sorumluluk kabul edilmez.
        </p>

        <h2>7. Değişiklikler</h2>
        <p>
          Bu koşullar güncellenebilir. Güncel metin her zaman bu sayfadadır. Güncellemeden sonra siteyi kullanmaya devam
          etmen yeni koşulları kabul ettiğin anlamına gelir.
        </p>
      </div>
    </article>
  );
}
