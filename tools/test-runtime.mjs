/**
 * Runs scripts/compendium.mjs against the real system packs with a minimal stand-in for Foundry:
 * language data loaded like Foundry does (merge of every pt-BR file of module.json), game.data.packs
 * built from src/packs, and a fake database backend that returns documents built from the sources.
 *
 *   node tools/test-runtime.mjs [--system ../LHTTRPG]
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, systemRoot, readJSON, readPack } from "./lib.mjs";

const SYSTEM = systemRoot();
const manifest = readJSON(path.join(ROOT, "module.json"));
const system = readJSON(path.join(SYSTEM, "system.json"));
let failures = 0;
const assert = (ok, msg) => {
  if (!ok) { failures++; console.log(`  ✗ ${msg}`); }
};

// --- Foundry stand-ins ------------------------------------------------------
const merge = (a, b) => {
  for (const [k, v] of Object.entries(b)) {
    if (v && (typeof v === "object") && !Array.isArray(v) && a[k] && (typeof a[k] === "object")) merge(a[k], v);
    else a[k] = v;
  }
  return a;
};
const translations = {};
for (const l of manifest.languages.filter(l => l.lang === "pt-BR")) merge(translations, readJSON(path.join(ROOT, l.path)));

class Document {
  constructor(source, { pack } = {}) { this._source = structuredClone(source); this.pack = pack; }
  get id() { return this._source._id; }
  get name() { return this._source.name; }
  get invalid() { return false; }
  toObject() { return structuredClone(this._source); }
  static fromSource(source, options) { return new this(source, options); }
}
class Item extends Document { static documentName = "Item"; }
class Actor extends Document { static documentName = "Actor"; }
class JournalEntry extends Document { static documentName = "JournalEntry"; }
const CLASSES = { Item, Actor, JournalEntry };

const sources = {};
const packsData = system.packs.map(p => {
  const { docs, folders } = readPack(SYSTEM, p.name);
  sources[`${system.id}.${p.name}`] = docs;
  return {
    id: `${system.id}.${p.name}`, name: p.name, label: p.label, type: p.type,
    packageType: "system", packageName: system.id,
    index: docs.map(d => ({ _id: d._id, name: d.name, type: d.type, folder: d.folder ?? null })),
    folders: folders.map(f => ({ _id: f._id, name: f.name, type: f.type, sort: f.sort ?? 0 }))
  };
});

globalThis.foundry = { abstract: { Document } };
globalThis.game = {
  system: { id: system.id },
  i18n: { lang: "pt-BR", translations },
  data: { packs: packsData },
  packs: new Map(),
  settings: { get: (scope, key) => (key === "compendiumConfiguration" ? {} : undefined) }
};
globalThis.CONFIG = {
  DatabaseBackend: {
    async _getDocuments(documentClass, operation) {
      const docs = sources[operation.pack] ?? [];
      if (operation.index) return docs.map(d => ({ _id: d._id, name: d.name, type: d.type, system: { subtype: d.system?.subtype } }));
      return docs.map(d => documentClass.fromSource(d, { pack: operation.pack }));
    }
  }
};

// --- Run ----------------------------------------------------------------------
const C = await import(pathToFileURL(path.join(ROOT, "scripts", "compendium.mjs")).href);
assert(C.loadTranslations(), "translations loaded from the language data");
assert(!(C.NAMESPACE in translations), "compendium data removed from game.i18n.translations");
C.translatePackMetadata();
C.wrapDatabaseBackend();

for (const meta of packsData) {
  const type = meta.type;
  const docs = sources[meta.id];
  const untranslatedIndex = meta.index.filter(e => docs.find(d => d._id === e._id)?.name === e.name && /[a-z]{3}/i.test(e.name));
  console.log(`${meta.id.padEnd(24)} label "${meta.label}", ${meta.index.length} index entries (${untranslatedIndex.length} same as English), ${meta.folders.length} folders`);

  const index = await CONFIG.DatabaseBackend._getDocuments(CLASSES[type], { pack: meta.id, index: true });
  assert(index.every(e => (e.system?.subtype === docs.find(d => d._id === e._id).system?.subtype)), `${meta.id}: index keeps system fields`);
  const translated = await CONFIG.DatabaseBackend._getDocuments(CLASSES[type], { pack: meta.id });
  assert(translated.length === docs.length, `${meta.id}: every document returned`);
  for (const doc of translated) {
    const src = docs.find(d => d._id === doc.id);
    const s = doc._source;
    // Never touched: the fields the automation reads
    for (const key of ["type", "img", "folder"]) assert(JSON.stringify(s[key]) === JSON.stringify(src[key]), `${doc.id}: ${key} changed`);
    for (const key of ["tags", "timing", "range", "target", "cost", "limit", "checkType", "subtype", "identifier", "archetype", "check", "damage", "conditions", "grants", "skills"]) {
      if (src.system && (key in src.system)) assert(JSON.stringify(s.system[key]) === JSON.stringify(src.system[key]), `${doc.id}: system.${key} changed`);
    }
    (src.effects ?? []).forEach((e, i) => {
      const t = s.effects[i];
      assert(JSON.stringify(t.flags?.lhtrpg?.rollFilter?.skillTags) === JSON.stringify(e.flags?.lhtrpg?.rollFilter?.skillTags), `${doc.id}: roll filter tags changed`);
      assert(JSON.stringify(t.statuses) === JSON.stringify(e.statuses), `${doc.id}: statuses changed`);
      (e.system?.changes ?? []).forEach((c, j) => {
        assert(t.system.changes[j].key === c.key, `${doc.id}: change key changed`);
        if (c.key !== "lhtrpg.skill.note") assert(t.system.changes[j].value === c.value, `${doc.id}: change value changed (${c.key})`);
      });
    });
    if (type === "Actor") {
      (src.items ?? []).forEach((it, i) => assert(JSON.stringify(s.items[i].system.tags) === JSON.stringify(it.system.tags), `${doc.id}: embedded tags changed`));
    }
  }
  const sample = translated[Math.floor(translated.length / 2)];
  console.log(`    e.g. "${docs.find(d => d._id === sample.id).name}" → "${sample.name}"`);
}

// World documents: found by compendium link or by English name
{
  const skill = sources["lhtrpg.skills-class"][0];
  const byLink = C.findEntry({ documentName: "Item", name: "Renamed by the GM", _stats: { compendiumSource: `Compendium.lhtrpg.skills-class.Item.${skill._id}` } });
  assert(byLink?.id === skill._id && byLink.en === skill.name, "findEntry by compendium link (with English name)");
  const sword = sources["lhtrpg.items"].find(d => d.type === "weapon");
  const byName = C.findEntry({ documentName: "Item", name: sword.name, _stats: {} });
  assert(byName?.id === sword._id && byName.entry.name, "findEntry by English name");
  const monster = sources["lhtrpg.bestiary"][0];
  const actor = C.findEntry({ documentName: "Actor", name: monster.name, _stats: {} });
  assert(actor?.entry.items && Object.values(actor.entry.items).every(i => i.en), "monster entry with English names of its skills");
  assert(!C.findEntry({ documentName: "Item", name: "Homebrew thing", _stats: {} }), "unknown documents not matched");
  console.log(`findEntry: "${skill.name}" → "${byLink?.entry.name}", "${sword.name}" → "${byName?.entry.name}", "${monster.name}" → "${actor?.entry.name}"`);
}

// Unlocked packs stay in English
game.settings.get = () => ({ [packsData[0].id]: { locked: false } });
const unlocked = await CONFIG.DatabaseBackend._getDocuments(Item, { pack: packsData[0].id });
assert(unlocked.every(d => d.name === sources[packsData[0].id].find(s => s._id === d.id).name), "unlocked pack left untouched");
// Other packages untouched
const other = await CONFIG.DatabaseBackend._getDocuments(Item, { pack: "world.homebrew" });
assert(Array.isArray(other) && !other.length, "other packs pass through");

console.log(failures ? `${failures} failure(s).` : "Runtime test passed.");
process.exit(failures ? 1 : 0);
