/**
 * Builds the name lists for translators: work/names-src/<group>.json, one entry per document or
 * embedded item, with a short context (pack, folder, type, tags, start of the description).
 * Effect names are derived later from the item names (work/effect-names.json).
 *
 *   node tools/names-src.mjs [--system ../LHTTRPG]
 */
import path from "node:path";
import { WORK, systemRoot, readJSON, readPack, writeJSON } from "./lib.mjs";

const SYSTEM = systemRoot();
const manifest = readJSON(path.join(SYSTEM, "system.json"));
const GROUPS = {
  "skills-a": ["skills-class"],
  "skills-b": ["skills-archetype", "skills-basic", "skills-mounts", "skills-common", "skills-racial", "gm-ex-powers"],
  "items": ["items"],
  "bestiary": ["bestiary"]
};

const plain = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, "")
  .replace(/\[\[\/[a-z]+ [^\]]*\]\]/gi, "").replace(/\s+/g, " ").trim();
const ctx = (pack, folder, item) => {
  const s = item.system ?? {};
  const bits = [pack, folder, item.type];
  if (s.tags?.length) bits.push(`[${s.tags.join("][")}]`);
  if (s.timing && s.timing !== "-") bits.push(`timing ${s.timing}`);
  const d = plain(s.description);
  if (d) bits.push(d.length > 110 ? `${d.slice(0, 110)}…` : d);
  return bits.filter(Boolean).join(" | ");
};

for (const [group, packs] of Object.entries(GROUPS)) {
  const out = {};
  for (const pack of packs) {
    if (!manifest.packs.some(p => p.name === pack)) continue;
    const { docs, folders } = readPack(SYSTEM, pack);
    const folderName = Object.fromEntries(folders.map(f => [f._id, f.name]));
    for (const doc of docs) {
      const folder = folderName[doc.folder] ?? "";
      if (doc.type === "monster" || doc.prototypeToken) {
        out[doc._id] = { en: doc.name, ctx: `${pack} | ${folder} | monster | [${(doc.system?.tags ?? []).join("][")}]` };
        if (doc.prototypeToken?.name && doc.prototypeToken.name !== doc.name) {
          out[`${doc._id}.token`] = { en: doc.prototypeToken.name, ctx: `token name of ${doc.name}` };
        }
        for (const item of doc.items ?? []) out[`${doc._id}.${item._id}`] = { en: item.name, ctx: ctx(pack, `skill of ${doc.name}`, item) };
      }
      else out[doc._id] = { en: doc.name, ctx: ctx(pack, folder, doc) };
    }
  }
  writeJSON(path.join(WORK, "names-src", `${group}.json`), out);
  console.log(group, Object.keys(out).length);
}
