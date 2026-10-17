/**
 * Consistency checks over every translated text chunk (after tools/blocks.mjs import):
 *  - names cited in the English text as «Name» / [Name] must appear translated as in the compendiums;
 *  - leftover English game terms in brackets ([Hate], [Two-Handed], [Target: …]) or abbreviations
 *    (SR, CR, HP, Sq) outside formulas;
 *  - chunks still missing.
 *
 *   node tools/lint-texts.mjs [--fix-names]     --fix-names replaces an outdated Portuguese name
 *                                                (from an older refs file) by the current one
 */
import fs from "node:fs";
import path from "node:path";
import { WORK, readJSON, writeJSON } from "./lib.mjs";

const FIX = process.argv.includes("--fix-names");
const ptNames = {};
for (const f of fs.readdirSync(path.join(WORK, "pt-BR", "names")).filter(f => f.endsWith(".json"))) {
  const data = readJSON(path.join(WORK, "pt-BR", "names", f));
  Object.assign(ptNames, f === "fixed.json" ? data.entries : data);
}
// English name → current Portuguese names (several when the same English name has several kinds)
const current = new Map();
for (const f of fs.readdirSync(path.join(WORK, "en", "names"))) {
  const data = readJSON(path.join(WORK, "en", "names", f));
  for (const [id, e] of Object.entries(data.entries)) {
    const add = (en, pt) => {
      if (!en || !pt) return;
      if (!current.has(en)) current.set(en, new Set());
      current.get(en).add(pt);
    };
    add(e.name, ptNames[id]);
    for (const [itemId, item] of Object.entries(e.items ?? {})) add(typeof item === "string" ? item : item.name, ptNames[`${id}.${itemId}`]);
  }
}

const TERM = /\[(?:Hate|Fate|Target|Range|Timing|Cost|Limit|Two-Handed|One-Handed|Weapon Attack|Magic Attack|Melee Attack|Ranged Attack|Hit Check|Dodge Check|Barrier|Cancel|Weakness|Pursuit|Regen|Decay|Dazed|Rigor|Confused|Staggered|Afflicted|Overconfident|Incapacitated|Dead|Hidden|Standby|Mob|Boss|Consumable|Preparation|Harmony|Training|Style|Stance|Inventory Slot|Equipment Slot|Hand Slots?|Speed|Accuracy|Evasion|Resistance|Recovery|Attack Power|Magic Power)\b[^\]]*\]/g;
const ABBR = /(?<![@\w.])(SR|CR|HP|Sq)(?![\w])/g;

let missing = 0;
let issues = 0;
const report = [];
const fixedCites = [];
for (const pack of fs.readdirSync(path.join(WORK, "en", "text"))) {
  for (const f of fs.readdirSync(path.join(WORK, "en", "text", pack)).filter(f => /^\d+\.json$/.test(f))) {
    const en = readJSON(path.join(WORK, "en", "text", pack, f));
    const ptFile = path.join(WORK, "pt-BR", "text", pack, f);
    if (!fs.existsSync(ptFile)) { missing++; report.push(`${pack}/${f}: not translated yet`); continue; }
    const pt = readJSON(ptFile);
    const refsFile = path.join(WORK, "en", "text", pack, f.replace(".json", ".refs.json"));
    const refs = fs.existsSync(refsFile) ? readJSON(refsFile) : {};
    let changed = false;
    for (const [key, { text }] of Object.entries(en)) {
      let value = pt[key];
      if (typeof value !== "string") continue;
      const source = text.replace(/&laquo;/g, "«").replace(/&raquo;/g, "»");
      // «Citations» in the same order in both texts: put the compendium name where the translator paraphrased it
      if (FIX) {
        const QUOTE = /(«|&laquo;)\s*([^«»&]+?)\s*(»|&raquo;)/g;
        const enCites = [...source.matchAll(/«\s*([^«»]+?)\s*»/g)].map(m => m[1]);
        const ptCites = [...value.matchAll(QUOTE)];
        if (enCites.length && (enCites.length === ptCites.length)) {
          let i = 0;
          value = value.replace(QUOTE, (m, open, inner, close) => {
            const names = current.get(enCites[i++]);
            if (!names || (names.size !== 1)) return m;
            const name = [...names][0];
            if (inner === name) return m;
            changed = true;
            fixedCites.push(`${pack}/${f} ${key}: «${inner}» → «${name}»`);
            return `${open}${name}${close}`;
          });
        }
      }
      // Cited names
      for (const m of source.matchAll(/«\s*([^«»]+?)\s*»/g)) {
        const names = current.get(m[1]);
        if (!names) continue;
        const plainValue = value.replace(/&laquo;/g, "«").replace(/&raquo;/g, "»");
        if ([...names].some(n => plainValue.includes(n))) continue;
        // An older translation of the name from the refs file?
        const old = String(refs[m[1]] ?? "").split(" | ").map(s => s.replace(/ \([^)]*\)$/, "")).find(o => o && plainValue.includes(o));
        if (old && FIX && names.size === 1) {
          value = value.split(old).join([...names][0]);
          changed = true;
          continue;
        }
        issues++;
        report.push(`${pack}/${f} ${key}: «${m[1]}» should be «${[...names].join(" | ")}»${old ? ` (has old "${old}")` : ""}`);
      }
      // English terms left
      const outside = value.replace(/⟦[ar]\d+⟧/g, "").replace(/<[^>]+>/g, " ");
      const terms = [...new Set(outside.match(TERM) ?? [])];
      if (terms.length) { issues++; report.push(`${pack}/${f} ${key}: English terms ${terms.join(" ")}`); }
      const abbr = [...new Set((outside.replace(/\{[^}]*\}/g, "").match(ABBR) ?? []))];
      if (abbr.length) { issues++; report.push(`${pack}/${f} ${key}: abbreviations ${abbr.join(" ")}`); }
      pt[key] = value;
    }
    if (changed) writeJSON(ptFile, pt);
  }
}
const out = path.join(WORK, "lint-texts.txt");
fs.writeFileSync(out, `${[...report, "", "# Citations fixed", ...fixedCites].join("\n")}\n`, "utf8");
if (FIX) console.log(`${fixedCites.length} citation(s) set to the compendium name`);
console.log(`${missing} chunk(s) missing, ${issues} issue(s) — see work/lint-texts.txt`);
for (const line of report.slice(0, 25)) console.log(`  ${line}`);
