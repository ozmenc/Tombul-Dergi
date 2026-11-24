// src/brand/logo.ts'ten public/logo.svg ve public/favicon.svg üretir. Çalıştır: npm run logo
import { writeFileSync } from "node:fs";
import { logoSvg } from "../src/brand/logo.ts";

writeFileSync(new URL("../public/logo.svg", import.meta.url), logoSvg() + "\n");
writeFileSync(new URL("../public/favicon.svg", import.meta.url), logoSvg({ ring: false, label: false }, "-99 16 518 518") + "\n");
console.log("public/logo.svg ve public/favicon.svg yazıldı");
