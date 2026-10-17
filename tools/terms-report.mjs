/**
 * Terminology consistency across all translated chunks: the bracketed terms of each English text
 * ([Hinder], [Concealed], [Target: Single]…) are paired, in order, with those of its translation
 * when both have the same number of brackets. English terms rendered in more than one way are listed
 * with their counts, so they can be harmonized.
 *
 *   node tools/terms-report.mjs [--all]       (--all also lists the consistent ones)
 */
import fs from "node:fs";
import path from "node:path";
import { WORK, readJSON } from "./lib.mjs";

const ALL = process.argv.includes("--all");
const brackets = html => [...html.replace(/<[^>]+>/g, " ").replace(/⟦[ar]\d+⟧/g, " ")
  .matchAll(/\[([^\[\]]{2,60})\]/g)].map(m => m[1].trim());
// Only the term itself: "[Barrier: 15]" → "Barrier", "[Target: Single]" stays whole
const term = t => (/^(Target|Range|Timing|Cost|Limit|Alvo|Alcance|Momento|Custo|Limite)\s*:/i.test(t) ? t : t.replace(/\s*[:(].*$/, "")).trim();

const pairs = new Map();   // en term → Map(pt term → count)
let aligned = 0;
let skipped = 0;
for (const pack of fs.readdirSync(path.join(WORK, "pt-BR", "text"))) {
  for (const f of fs.readdirSync(path.join(WORK, "pt-BR", "text", pack)).filter(f => /^\d+\.json$/.test(f))) {
    const en = readJSON(path.join(WORK, "en", "text", pack, f));
    const pt = readJSON(path.join(WORK, "pt-BR", "text", pack, f));
    for (const [key, { text }] of Object.entries(en)) {
      if (typeof pt[key] !== "string") continue;
      const a = brackets(text);
      const b = brackets(pt[key]);
      if (!a.length) continue;
      if (a.length !== b.length) { skipped++; continue; }
      aligned++;
      a.forEach((t, i) => {
        const e = term(t);
        const p = term(b[i]);
        if (!/[A-Za-z]/.test(e) || /^\d/.test(e)) return;
        if (!pairs.has(e)) pairs.set(e, new Map());
        pairs.get(e).set(p, (pairs.get(e).get(p) ?? 0) + 1);
      });
    }
  }
}
const rows = [...pairs.entries()].map(([en, m]) => ({ en, total: [...m.values()].reduce((a, b) => a + b, 0), m }))
  .sort((x, y) => y.total - x.total);
const inconsistent = rows.filter(r => r.m.size > 1);
const lines = [];
for (const r of (ALL ? rows : inconsistent)) {
  lines.push(`[${r.en}] ×${r.total} → ${[...r.m.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => `[${p}] ×${n}`).join(" | ")}`);
}
const out = path.join(WORK, "terms-report.txt");
fs.writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
console.log(`${aligned} texts aligned (${skipped} with a different number of brackets), ${rows.length} terms, ${inconsistent.length} with several renderings — work/terms-report.txt`);
for (const l of lines.slice(0, 40)) console.log(`  ${l}`);
