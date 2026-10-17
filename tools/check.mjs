/**
 * Final check of the module: manifest, interface keys and compendium coverage.
 *
 *   node tools/check.mjs [--system ../LHTTRPG]
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, systemRoot, readJSON, readPack } from "./lib.mjs";

const SYSTEM = systemRoot();
const NAMESPACE = "LHTRPG-PTBR-COMPENDIUM";
let errors = 0;
const fail = msg => { errors++; console.log(`  ✗ ${msg}`); };
const flat = (o, p = "", r = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") flat(v, key, r);
    else r[key] = v;
  }
  return r;
};

// Manifest
const module = readJSON(path.join(ROOT, "module.json"));
const system = readJSON(path.join(SYSTEM, "system.json"));
console.log(`Module ${module.id} ${module.version} for ${system.id} ${system.version} (Foundry ${module.compatibility.minimum}+)`);
for (const l of module.languages) {
  if (!fs.existsSync(path.join(ROOT, l.path))) fail(`language file missing: ${l.path}`);
  else {
    try { readJSON(path.join(ROOT, l.path)); }
    catch (err) { fail(`${l.path}: invalid JSON (${err.message})`); }
  }
}
for (const f of module.esmodules) if (!fs.existsSync(path.join(ROOT, f))) fail(`script missing: ${f}`);

// Interface
const en = flat(readJSON(path.join(SYSTEM, "lang", "en.json")));
const pt = flat(readJSON(path.join(ROOT, "lang", "pt-BR.json")));
const missing = Object.keys(en).filter(k => !(k in pt));
const placeholders = s => [...String(s).matchAll(/\{[a-zA-Z]+\}/g)].map(m => m[0]).sort().join();
const badPlaceholders = Object.keys(en).filter(k => (k in pt) && (placeholders(en[k]) !== placeholders(pt[k])));
console.log(`Interface: ${Object.keys(en).length - missing.length}/${Object.keys(en).length} system keys translated`);
for (const k of missing) fail(`missing key ${k}`);
for (const k of badPlaceholders) fail(`placeholders differ in ${k}`);

// Compendiums
for (const { name: pack, type } of system.packs) {
  const file = path.join(ROOT, "lang", "compendium", `${pack}.json`);
  if (!fs.existsSync(file)) { fail(`${pack}: no translation file`); continue; }
  const t = readJSON(file)[NAMESPACE]?.[pack];
  if (!t) { fail(`${pack}: no "${NAMESPACE}.${pack}" data`); continue; }
  const { docs, folders } = readPack(SYSTEM, pack);
  let names = 0, texts = 0, textsTotal = 0, effects = 0, effectsTotal = 0;
  for (const doc of docs) {
    const e = t.entries?.[doc._id];
    if (e?.name) names++;
    else fail(`${pack}: no name for ${doc._id} "${doc.name}"`);
    const check = (has, src, label) => {
      if (typeof src !== "string" || !src.trim()) return;
      textsTotal++;
      if (has) texts++;
      else fail(`${pack}: no text for ${label}`);
    };
    const checkEffects = (list, te, label) => {
      for (const ef of list ?? []) {
        effectsTotal++;
        if (te?.[ef._id]?.name) effects++;
        else fail(`${pack}: no name for effect "${ef.name}" of ${label}`);
      }
    };
    if (type === "Item") {
      check(e?.description, doc.system?.description, doc.name);
      checkEffects(doc.effects, e?.effects, doc.name);
    }
    else if (type === "Actor") {
      check(e?.description, doc.system?.description, doc.name);
      checkEffects(doc.effects, e?.effects, doc.name);
      for (const item of doc.items ?? []) {
        const it = e?.items?.[item._id];
        if (!it?.name) fail(`${pack}: no name for ${doc.name} › ${item.name}`);
        check(it?.description, item.system?.description, `${doc.name} › ${item.name}`);
        checkEffects(item.effects, it?.effects, `${doc.name} › ${item.name}`);
      }
    }
    else if (type === "JournalEntry") {
      for (const page of doc.pages ?? []) {
        const p = e?.pages?.[page._id];
        if (!p?.name) fail(`${pack}: no name for page "${page.name}"`);
        check(p?.text, page.text?.content, `${doc.name} › ${page.name}`);
      }
    }
  }
  const folderCount = Object.keys(t.folders ?? {}).length;
  console.log(`${pack.padEnd(17)} names ${names}/${docs.length}, texts ${texts}/${textsTotal}, effects ${effects}/${effectsTotal}, folders ${folderCount}/${folders.length}, label "${t.label}"`);
}
console.log(errors ? `${errors} problem(s).` : "All good.");
process.exit(errors ? 1 : 0);
