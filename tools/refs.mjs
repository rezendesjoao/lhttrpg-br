/**
 * For each English text chunk, lists the names of other documents it mentions (skills, items,
 * classes, subclasses, races, monsters) with their Portuguese translation, so the translator of a
 * description uses the same names as the compendiums: work/en/text/<pack>/NN.refs.json
 *
 *   node tools/refs.mjs        (after the names are translated: work/pt-BR/names/*.json)
 */
import fs from "node:fs";
import path from "node:path";
import { WORK, readJSON, writeJSON } from "./lib.mjs";

const KIND = { skill: "habilidade", race: "raça", class: "classe", subclass: "subclasse", monster: "monstro" };
const ptNames = {};
for (const f of fs.readdirSync(path.join(WORK, "pt-BR", "names")).filter(f => f.endsWith(".json"))) {
  const data = readJSON(path.join(WORK, "pt-BR", "names", f));
  Object.assign(ptNames, f === "fixed.json" ? data.entries : data);
}

/** English name → Set of "Portuguese (kind)" */
const names = new Map();
const add = (en, pt, kind) => {
  if (!en || !pt) return;
  if (!names.has(en)) names.set(en, new Set());
  names.get(en).add(`${pt} (${kind})`);
};
for (const f of fs.readdirSync(path.join(WORK, "en", "names"))) {
  const pack = f.replace(/\.json$/, "");
  if (pack === "rules") continue;
  const data = readJSON(path.join(WORK, "en", "names", f));
  for (const [id, e] of Object.entries(data.entries)) {
    if (data.entries[id].items) {
      add(e.name, ptNames[id], KIND.monster);
      for (const [itemId, item] of Object.entries(e.items)) {
        add(typeof item === "string" ? item : item.name, ptNames[`${id}.${itemId}`], "habilidade de monstro");
      }
    }
    else add(e.name, ptNames[id], KIND[e.type] ?? "item");
  }
}

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const candidates = [...names.keys()].map(en => ({
  en,
  bracketed: new RegExp(`[«\\[]\\s*${escape(en)}\\s*[»\\]]`),
  plain: (en.length >= 7 || en.includes(" ")) ? new RegExp(`(^|[^\\p{L}])${escape(en)}(?![\\p{L}])`, "u") : null
}));

let files = 0;
for (const pack of fs.readdirSync(path.join(WORK, "en", "text"))) {
  const dir = path.join(WORK, "en", "text", pack);
  for (const f of fs.readdirSync(dir).filter(f => /^\d+\.json$/.test(f))) {
    const chunk = readJSON(path.join(dir, f));
    const text = Object.values(chunk).map(v => v.text.replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")).join("\n");
    const refs = {};
    for (const c of candidates) {
      if (c.bracketed.test(text) || (c.plain && c.plain.test(text))) refs[c.en] = [...names.get(c.en)].join(" | ");
    }
    writeJSON(path.join(dir, f.replace(".json", ".refs.json")), refs);
    files++;
  }
}
console.log(`${names.size} names, refs written for ${files} chunks`);
