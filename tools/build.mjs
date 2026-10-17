/**
 * Builds the compendium language files (lang/compendium/<pack>.json) from the work files and
 * checks them against the system sources.
 *
 *   node tools/build.mjs [--system ../LHTTRPG] [--strict]
 *
 * Inputs (work/):
 *   en/names/<pack>.json, en/tokens/<pack>.json   from tools/extract.mjs
 *   pt-BR/names/*.json                             translated names (by id)
 *   pt-BR/text/<pack>/NN.json                      translated descriptions / pages (same keys as en/text)
 *   effect-names.json                              suffixes and names of active effects
 * --strict exits with an error when something is missing or the markup of a translation differs.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, WORK, systemRoot, readJSON, readPack, writeJSON, restore, compareMarkup } from "./lib.mjs";

const SYSTEM = systemRoot();
const STRICT = process.argv.includes("--strict");
const NAMESPACE = "LHTRPG-PTBR-COMPENDIUM";
const manifest = readJSON(path.join(SYSTEM, "system.json"));
const problems = [];
const warn = msg => problems.push(msg);

const PACK_LABELS = {
  "races-classes": "Raças e Classes", "skills-basic": "Habilidades Básicas",
  "skills-common": "Habilidades Comuns e de Subclasse", "skills-racial": "Habilidades Raciais",
  "skills-archetype": "Habilidades de Arquétipo", "skills-class": "Habilidades de Classe",
  "skills-mounts": "Habilidades de Montaria", "gm-ex-powers": "Poderes EX do Mestre", "items": "Itens",
  "bestiary": "Bestiário", "rules": "Regras"
};
const PACK_FOLDERS = { "Skills": "Habilidades", "Items": "Itens", "Game Master": "Mestre" };
const SKILL_NOTES = {
  "Ignores [Cancel: Cold]": "Ignora [Anulação: Frio]",
  "Ignores [Cancel: Spirit]": "Ignora [Anulação: Espírito]",
  "Ignores [Cancel: Shock]": "Ignora [Anulação: Choque]",
  "Ignores [Cancel: Flame]": "Ignora [Anulação: Chama]",
  "Can be used with [Range: 4 Sq]": "Pode ser usada com [Alcance: 4 Qd]"
};

/* -------------------------------------------- */
/*  Names                                       */
/* -------------------------------------------- */

const ptNames = {};       // id (or "actor.item" / "actor.token") → Portuguese name
const ptFolders = {};     // folder id → Portuguese name
const ptPages = {};       // page id → Portuguese name
const namesDir = path.join(WORK, "pt-BR", "names");
for (const f of fs.existsSync(namesDir) ? fs.readdirSync(namesDir).filter(f => f.endsWith(".json")) : []) {
  const data = readJSON(path.join(namesDir, f));
  if (f === "fixed.json") {
    Object.assign(ptNames, data.entries);
    Object.assign(ptFolders, data.folders);
    Object.assign(ptPages, data.pages);
  }
  else Object.assign(ptNames, data);
}

// English → Portuguese name of every document, to resolve references ({Skill Name}) and roll filters
const byEnglish = new Map();
const enNames = {};
for (const { name: pack } of manifest.packs) {
  enNames[pack] = readJSON(path.join(WORK, "en", "names", `${pack}.json`));
  for (const [id, e] of Object.entries(enNames[pack].entries)) {
    if (ptNames[id] && !byEnglish.has(e.name)) byEnglish.set(e.name, ptNames[id]);
  }
}
const resolveRefs = (text, where) => text.replace(/\{([^{}]+)\}/g, (m, en) => {
  const pt = byEnglish.get(en);
  if (!pt) warn(`${where}: no translated name for {${en}}`);
  return pt ?? en;
});

const effectNames = readJSON(path.join(WORK, "effect-names.json"));
function effectName(parentEn, parentPt, en, where) {
  if (!parentPt) return null;
  if (en === parentEn) return parentPt;
  if (en.startsWith(`${parentEn} `)) {
    const suffix = en.slice(parentEn.length + 1);
    const pt = effectNames.suffixes[suffix];
    if (pt) return `${parentPt} ${resolveRefs(pt, where)}`;
  }
  const pt = effectNames.names[en];
  if (pt) return resolveRefs(pt, where);
  warn(`${where}: effect "${en}" has no translation`);
  return null;
}

/* -------------------------------------------- */
/*  Texts                                       */
/* -------------------------------------------- */

function loadTexts(pack) {
  const enDir = path.join(WORK, "en", "text", pack);
  const ptDir = path.join(WORK, "pt-BR", "text", pack);
  const tokens = readJSON(path.join(WORK, "en", "tokens", `${pack}.json`));
  const out = {};
  if (!fs.existsSync(enDir)) return out;
  for (const f of fs.readdirSync(enDir).filter(f => /^\d+\.json$/.test(f))) {
    const en = readJSON(path.join(enDir, f));
    const ptFile = path.join(ptDir, f);
    const pt = fs.existsSync(ptFile) ? readJSON(ptFile) : {};
    for (const [key, { text }] of Object.entries(en)) {
      const raw = pt[key];
      const value = (raw && typeof raw === "object") ? raw.text : raw;
      if (typeof value !== "string" || !value.trim()) {
        warn(`${pack}/${f}: missing text ${key}`);
        continue;
      }
      const diff = compareMarkup(text, value);
      if (diff.length) {
        warn(`${pack}/${f}: markup differs in ${key}: ${diff.join("; ")}`);
        continue;
      }
      try {
        out[key] = restore(value, tokens[key] ?? {});
      }
      catch (err) {
        warn(`${pack}/${f}: ${key}: ${err.message}`);
      }
    }
  }
  return out;
}

/* -------------------------------------------- */
/*  Build                                       */
/* -------------------------------------------- */

function effectEntries(effects, parentEn, parentPt, sources, where) {
  if (!effects) return undefined;
  const out = {};
  for (const [id, en] of Object.entries(effects)) {
    const entry = {};
    const name = effectName(parentEn, parentPt, en, `${where} › ${en}`);
    if (name) entry.name = name;
    const source = sources?.find(e => e._id === id);
    (source?.system?.changes ?? []).forEach((c, i) => {
      if (c.key !== "lhtrpg.skill.note") return;
      const pt = SKILL_NOTES[c.value];
      if (pt) (entry.notes ??= {})[i] = pt;
      else warn(`${where}: skill note "${c.value}" has no translation`);
    });
    (source?.flags?.lhtrpg?.rollFilter?.skills ?? []).forEach((s, i) => {
      const pt = byEnglish.get(s.name);
      if (pt) (entry.filterSkills ??= {})[i] = pt;
      else if (s.name) warn(`${where}: roll filter skill "${s.name}" has no translated name`);
    });
    if (Object.keys(entry).length) out[id] = entry;
  }
  return Object.keys(out).length ? out : undefined;
}

const stats = [];
fs.mkdirSync(path.join(ROOT, "lang", "compendium"), { recursive: true });
for (const { name: pack, type } of manifest.packs) {
  const en = enNames[pack];
  const texts = loadTexts(pack);
  const { docs } = readPack(SYSTEM, pack);
  const sourceById = Object.fromEntries(docs.map(d => [d._id, d]));
  const entries = {};
  let missingNames = 0;

  for (const [id, e] of Object.entries(en.entries)) {
    const source = sourceById[id];
    const entry = {};
    const name = ptNames[id];
    if (name) entry.name = name;
    else { missingNames++; warn(`${pack}: missing name ${id} "${e.name}"`); }

    if (type === "Item") {
      if (texts[`${id}/description`]) entry.description = texts[`${id}/description`];
      const effects = effectEntries(e.effects, e.name, name, source?.effects, `${pack} ${e.name}`);
      if (effects) entry.effects = effects;
    }
    else if (type === "Actor") {
      const tokenEn = source?.prototypeToken?.name;
      const tokenPt = e.tokenName ? ptNames[`${id}.token`] : name;
      if (tokenEn && tokenPt) entry.tokenName = tokenPt;
      if (texts[`${id}/description`]) entry.description = texts[`${id}/description`];
      const effects = effectEntries(e.effects, e.name, name, source?.effects, `${pack} ${e.name}`);
      if (effects) entry.effects = effects;
      if (e.items) {
        entry.items = {};
        for (const [itemId, item] of Object.entries(e.items)) {
          const itemEn = typeof item === "string" ? item : item.name;
          const itemPt = ptNames[`${id}.${itemId}`];
          const it = { en: itemEn };
          if (itemPt) it.name = itemPt;
          else { missingNames++; warn(`${pack}: missing name ${id}.${itemId} "${itemEn}"`); }
          const desc = texts[`${id}/items.${itemId}.description`];
          if (desc) it.description = desc;
          const itemSource = source?.items?.find(i => i._id === itemId);
          const effects = effectEntries(typeof item === "object" ? item.effects : null, itemEn, itemPt,
            itemSource?.effects, `${pack} ${e.name} › ${itemEn}`);
          if (effects) it.effects = effects;
          if (Object.keys(it).length) entry.items[itemId] = it;
        }
      }
    }
    else if (type === "JournalEntry") {
      entry.pages = {};
      for (const [pageId, pageEn] of Object.entries(e.pages)) {
        const page = {};
        if (ptPages[pageId]) page.name = ptPages[pageId];
        else warn(`${pack}: missing page name ${pageId} "${pageEn}"`);
        const text = texts[`${id}/pages.${pageId}.text`];
        if (text) page.text = text;
        if (Object.keys(page).length) entry.pages[pageId] = page;
      }
    }
    if (Object.keys(entry).length) entries[id] = entry;
  }

  const folders = {};
  for (const [id, enName] of Object.entries(en.folders)) if (ptFolders[id]) folders[id] = ptFolders[id];
  // English name → id, to recognize world documents that lost their link to the compendium
  const byName = {};
  // (Foundry expands dotted keys of language files: names with a dot are left out.)
  for (const [id, e] of Object.entries(en.entries)) {
    if (!e.name.includes(".") && !(e.name in byName)) byName[e.name] = id;
  }
  const data = { [pack]: { label: PACK_LABELS[pack], documentName: type, folders, byName, entries } };
  // The world folders of the system's packFolders, once (any file would do)
  if (pack === "races-classes") data._packFolders = PACK_FOLDERS;
  writeJSON(path.join(ROOT, "lang", "compendium", `${pack}.json`), { [NAMESPACE]: data });
  stats.push({ pack, documents: Object.keys(en.entries).length, translated: Object.keys(entries).length,
    missingNames, texts: Object.keys(texts).length });
}

console.table(stats);
if (problems.length) {
  const file = path.join(WORK, "build-problems.txt");
  fs.writeFileSync(file, `${problems.join("\n")}\n`, "utf8");
  console.log(`${problems.length} problem(s), see ${path.relative(ROOT, file)}`);
  for (const p of problems.slice(0, 15)) console.log(`  - ${p}`);
  if (STRICT) process.exit(1);
}
else console.log("No problems.");
