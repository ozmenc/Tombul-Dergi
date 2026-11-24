import { describe, expect, it } from "vitest";
import { excerpt, plainText, readingMinutes, slugify, SLUG_RE, initials } from "./format";

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
});
