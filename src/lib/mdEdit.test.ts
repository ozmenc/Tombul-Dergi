import { describe, expect, it } from "vitest";
import { applyEdit, continueList, insertBlock, link, pasteLink, toggleBlock, wrap } from "./mdEdit";

const run = (v: string, ed: { from: number; to: number; text: string; sel: [number, number] } | null) => {
  if (!ed) return null;
  const out = applyEdit(v, ed);
  return { out, sel: out.slice(...ed.sel) };
};

describe("wrap", () => {
  it("seçimi sarar ve tekrar basınca kaldırır", () => {
    const v = "bir kelime";
    const r = run(v, wrap(v, 4, 10, "**", "x"))!;
    expect(r).toEqual({ out: "bir **kelime**", sel: "kelime" });
    expect(run(r.out, wrap(r.out, 6, 12, "**", "x"))).toEqual({ out: v, sel: "kelime" });
  });
  it("kalın metne eğik ekler, kalını eğik sanmaz", () => {
    const v = "**söz**";
    const r = run(v, wrap(v, 2, 5, "*", "x"))!;
    expect(r.out).toBe("***söz***");
    expect(applyEdit(r.out, wrap(r.out, 3, 6, "**", "x"))).toBe("*söz*");
  });
  it("seçim yoksa yer tutucuyu seçili ekler", () => {
    expect(run("a ", wrap("a ", 2, 2, "*", "eğik"))).toEqual({ out: "a *eğik*", sel: "eğik" });
  });
});

describe("toggleBlock", () => {
  it("satırları numaralı listeye çevirir, boş satırı atlar, eski işareti söker", () => {
    const v = "x\n- bir\n\nüç\ny";
    expect(run(v, toggleBlock(v, 3, 11, "ol"))!.out).toBe("x\n1. bir\n\n2. üç\ny");
  });
  it("hepsinde varsa kaldırır; imleç satır sonunda kalır", () => {
    const v = "## Başlık";
    const ed = toggleBlock(v, 4, 4, "h");
    expect(applyEdit(v, ed)).toBe("Başlık");
    expect(ed.sel).toEqual([6, 6]);
  });
  it("metnin başındaki boş satırda doğru satırı bulur", () => {
    expect(applyEdit("\nab", toggleBlock("\nab", 1, 1, "quote"))).toBe("\n> ab");
  });
});

describe("link", () => {
  it("metni bağlantı yapar, adres kısmını seçer", () => {
    expect(run("git", link("git", 0, 3))).toEqual({ out: "[git](https://)", sel: "https://" });
  });
  it("seçim adresse metin kısmına geçer", () => {
    expect(run("https://a.co", link("https://a.co", 0, 12))).toEqual({ out: "[](https://a.co)", sel: "" });
  });
  it("seçimin üstüne adres yapıştırma", () => {
    expect(run("bak buraya", pasteLink("bak buraya", 4, 10, " https://a.co "))!.out).toBe("bak [buraya](https://a.co)");
    expect(pasteLink("bak", 0, 0, "https://a.co")).toBeNull();
    expect(pasteLink("bak", 0, 3, "düz metin")).toBeNull();
  });
});

describe("insertBlock", () => {
  it("paragraf arasına boş satırlarla ekler", () => {
    expect(applyEdit("a\nb", insertBlock("a\nb", 1, 1, "![](x)"))).toBe("a\n\n![](x)\n\nb");
    expect(applyEdit("", insertBlock("", 0, 0, "![](x)"))).toBe("![](x)\n\n");
  });
});

describe("continueList", () => {
  it("maddeyi sürdürür, numarayı artırır", () => {
    expect(run("- a", continueList("- a", 3, 3))!.out).toBe("- a\n- ");
    expect(run("  9. a", continueList("  9. a", 6, 6))!.out).toBe("  9. a\n  10. ");
    expect(run("> söz", continueList("> söz", 5, 5))!.out).toBe("> söz\n> ");
  });
  it("boş maddede listeden çıkar, liste dışında karışmaz", () => {
    expect(applyEdit("- a\n- ", continueList("- a\n- ", 6, 6)!)).toBe("- a\n");
    expect(continueList("düz", 3, 3)).toBeNull();
    expect(continueList("---", 3, 3)).toBeNull();
  });
});
