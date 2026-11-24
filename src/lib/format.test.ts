import { describe, expect, it } from "vitest";
import { excerpt, fmtRelative, initials, normalizeTag, parseTags, plainText, readingMinutes, sanitizeSearch, slugify, SLUG_RE } from "./format";

describe("slugify", () => {
  it("Türkçe karakterleri sadeleştirir", () => {
    expect(slugify("Yağmurdan Sonra Şehir, İstanbul!")).toBe("yagmurdan-sonra-sehir-istanbul");
    expect(slugify("  Çöp   üşüdü ")).toBe("cop-usudu");
  });
  it("her zaman veritabanı kuralına uyan bir değer üretir", () => {
    for (const s of ["Ğ!!", "a--b", "-x-", "Iğdır'da 3 gün", "x".repeat(200) + " y"]) {
      const out = slugify(s);
      expect(out === "" || SLUG_RE.test(out)).toBe(true);
    }
  });
});

describe("etiketler", () => {
  it("normalleştirir ve Türkçe harfleri korur", () => {
    expect(normalizeTag("  #Şehir Notları ")).toBe("şehir-notları");
    expect(normalizeTag("###")).toBe("");
  });
  it("virgülle ayrılmış girişi tekrarsız ve en fazla 8 etikete çevirir", () => {
    expect(parseTags("müzik, Müzik, gece,, ")).toEqual(["müzik", "gece"]);
    expect(parseTags("a,b,c,d,e,f,g,h,i,j")).toHaveLength(8);
  });
});

describe("arama", () => {
  it("PostgREST filtresini bozacak karakterleri atar", () => {
    expect(sanitizeSearch("kahve, (sıcak)*%")).toBe("kahve sıcak");
    expect(sanitizeSearch("   ")).toBe("");
  });
});

describe("metin yardımcıları", () => {
  it("resim ve bağlantı sözdizimini düz metinden atar", () => {
    expect(plainText("Merhaba ![k](https://x/y.png) [site](https://a.b) **kalın**")).toBe("Merhaba site kalın");
  });
  it("özeti kelime sınırında keser", () => {
    expect(excerpt("bir iki üç dört beş", 9)).toBe("bir iki…");
    expect(excerpt("kısa", 9)).toBe("kısa");
  });
  it("okuma süresi en az bir dakikadır", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("k ".repeat(401))).toBe(3);
  });
  it("baş harfler", () => {
    expect(initials("ilknur özmen")).toBe("İÖ");
    expect(initials("  ")).toBe("?");
  });
  it("göreli zaman", () => {
    const now = Date.parse("2026-11-24T12:00:00Z");
    expect(fmtRelative("2026-11-24T11:59:30Z", now)).toBe("şimdi");
    expect(fmtRelative("2026-11-24T11:15:00Z", now)).toBe("45 dk önce");
    expect(fmtRelative("2026-11-24T09:00:00Z", now)).toBe("3 sa önce");
    expect(fmtRelative("2026-11-22T12:00:00Z", now)).toBe("2 gün önce");
    expect(fmtRelative("2026-11-03T12:00:00Z", now)).toBe("3 hf önce");
    expect(fmtRelative("2026-07-24T12:00:00Z", now)).toBe("4 ay önce");
    expect(fmtRelative("2024-11-01T12:00:00Z", now)).toBe("2 yıl önce");
    expect(fmtRelative("bozuk", now)).toBe("");
  });
});
