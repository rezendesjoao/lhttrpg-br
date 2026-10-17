/**
 * Extracts the translatable text of the system compendiums into work files.
 *
 *   node tools/extract.mjs [--system ../LHTTRPG] [--chunk 22000]
 *
 * Output (work/, not shipped):
 *   en/names/<pack>.json      document, embedded item, page, effect and folder names, by id
 *   en/text/<pack>/NN.json    descriptions and journal pages (HTML with protected tokens), in chunks
 *   en/tokens/<pack>.json     the original fragments behind each protected token
 *   en/values.json            distinct values of the short fields (tags, timing, range…)
 */
import path from "node:path";
import fs from "node:fs";
import { WORK, systemRoot, readJSON, readPack, writeJSON, protect, textLength } from "./lib.mjs";

const SYSTEM = systemRoot();
const chunkArg = process.argv.indexOf("--chunk");
const CHUNK = chunkArg > -1 ? Number(process.argv[chunkArg + 1]) : 22000;
const manifest = readJSON(path.join(SYSTEM, "system.json"));
const OUT = path.join(WORK, "en");
fs.rmSync(OUT, { recursive: true, force: true });

const SHORT_FIELDS = ["timing", "range", "target", "checkType", "cost", "limit"];
const values = { tags: {}, actorTags: {}, ...Object.fromEntries(SHORT_FIELDS.map(f => [f, {}])),
  rollFilterSkillTags: {}, rollFilterWeaponTags: {}, rollFilterTargetTags: {}, rollFilterExclusive: {},
  rollFilterSkillNames: {}, conditionValues: {}, statusTags: {} };
const bump = (bucket, v) => {
  if (typeof v !== "string" || !v.trim()) return;
  bucket[v] = (bucket[v] ?? 0) + 1;
};

function collectItemValues(item) {
  const s = item.system ?? {};
  for (const t of s.tags ?? []) bump(values.tags, t);
  for (const f of SHORT_FIELDS) bump(values[f], s[f]);
  for (const c of s.conditions ?? []) bump(values.conditionValues, c.value);
  for (const e of item.effects ?? []) collectEffectValues(e);
}

function collectEffectValues(effect) {
  const f = effect.flags?.lhtrpg ?? {};
  const rf = f.rollFilter ?? {};
  for (const t of rf.skillTags ?? []) bump(values.rollFilterSkillTags, t);
  for (const t of rf.weaponTags ?? []) bump(values.rollFilterWeaponTags, t);
  for (const t of rf.targetTags ?? []) bump(values.rollFilterTargetTags, t);
  for (const sk of rf.skills ?? []) bump(values.rollFilterSkillNames, sk.name);
  bump(values.rollFilterExclusive, rf.exclusive);
  for (const c of f.conditions ?? []) bump(values.conditionValues, c.value);
  bump(values.statusTags, f.statusData?.tag);
}

const summary = [];
for (const { name: pack, type } of manifest.packs) {
  const { docs, folders } = readPack(SYSTEM, pack);
  const names = { folders: {}, entries: {} };
  const tokens = {};
  const texts = [];   // [{ id, key, text, folder }]
  const folderName = Object.fromEntries(folders.map(f => [f._id, f.name]));
  for (const f of folders) names.folders[f._id] = f.name;

  const addText = (docId, key, html, folder, label) => {
    if (typeof html !== "string" || !html.trim()) return;
    const { text, map } = protect(html);
    if (Object.keys(map).length) tokens[`${docId}/${key}`] = map;
    texts.push({ id: docId, key, text, folder, label, size: textLength(text) });
  };

  for (const doc of docs) {
    const folder = folderName[doc.folder] ?? "";
    const entry = { name: doc.name };
    if (type === "Item") {
      entry.type = doc.type;
      if (doc.effects?.length) entry.effects = Object.fromEntries(doc.effects.map(e => [e._id, e.name]));
      addText(doc._id, "description", doc.system?.description, folder, doc.name);
      collectItemValues(doc);
    }
    else if (type === "Actor") {
      if (doc.prototypeToken?.name && doc.prototypeToken.name !== doc.name) entry.tokenName = doc.prototypeToken.name;
      if (doc.effects?.length) entry.effects = Object.fromEntries(doc.effects.map(e => [e._id, e.name]));
      if (doc.items?.length) {
        entry.items = {};
        for (const item of doc.items) {
          entry.items[item._id] = item.effects?.length
            ? { name: item.name, effects: Object.fromEntries(item.effects.map(e => [e._id, e.name])) }
            : item.name;
          addText(doc._id, `items.${item._id}.description`, item.system?.description, folder, `${doc.name} › ${item.name}`);
          collectItemValues(item);
        }
      }
      for (const t of doc.system?.tags ?? []) bump(values.actorTags, t);
      for (const e of doc.effects ?? []) collectEffectValues(e);
      addText(doc._id, "description", doc.system?.description, folder, doc.name);
    }
    else if (type === "JournalEntry") {
      entry.pages = Object.fromEntries((doc.pages ?? []).map(p => [p._id, p.name]));
      for (const p of doc.pages ?? []) {
        addText(doc._id, `pages.${p._id}.text`, p.text?.content, folder, `${doc.name} › ${p.name}`);
        if (p.image?.caption) entry.captions = { ...entry.captions, [p._id]: p.image.caption };
      }
    }
    names.entries[doc._id] = entry;
  }

  // Chunks of whole fields, grouped by folder so a translator sees related documents together.
  texts.sort((a, b) => a.folder.localeCompare(b.folder) || a.label.localeCompare(b.label));
  const chunks = [];
  let current = null;
  for (const t of texts) {
    if (!current || (current.size + t.size > CHUNK && current.items.length)) chunks.push(current = { size: 0, items: [] });
    current.items.push(t);
    current.size += t.size;
  }
  chunks.forEach((c, i) => {
    const file = path.join(OUT, "text", pack, `${String(i + 1).padStart(2, "0")}.json`);
    writeJSON(file, Object.fromEntries(c.items.map(t => [`${t.id}/${t.key}`, { label: t.label, text: t.text }])));
  });
  writeJSON(path.join(OUT, "names", `${pack}.json`), names);
  writeJSON(path.join(OUT, "tokens", `${pack}.json`), tokens);
  summary.push({ pack, docs: docs.length, folders: folders.length, texts: texts.length,
    chars: texts.reduce((n, t) => n + t.size, 0), chunks: chunks.length });
}

const sorted = Object.fromEntries(Object.entries(values).map(([k, v]) =>
  [k, Object.fromEntries(Object.entries(v).sort((a, b) => b[1] - a[1]))]));
writeJSON(path.join(OUT, "values.json"), sorted);
console.table(summary);
console.log(`Total text chars: ${summary.reduce((n, s) => n + s.chars, 0)}, chunks: ${summary.reduce((n, s) => n + s.chunks, 0)}`);
