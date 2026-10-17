/**
 * Translation of the system compendiums (Foundry V14).
 *
 * The Portuguese text ships as extra language files (lang/compendium/*.json, declared in module.json
 * with "system": "lhtrpg"). Foundry only loads them on clients playing in pt-BR, and awaits them before
 * the `i18nInit` hook. There the data is moved out of game.i18n and:
 *  1. game.data.packs is translated in place (pack labels, index names, folder names) before the
 *     compendium collections and the sidebar tree are built from it;
 *  2. CONFIG.DatabaseBackend#_getDocuments is wrapped, so every document read from a system pack
 *     (getIndex, getDocument(s), fromUuid, drag & drop, import, the system's own browsers) comes out
 *     translated, embedded items, effects and journal pages included.
 *
 * Only display text is translated: names, descriptions, effect names, skill notes and journal pages.
 * Tags, timing, range, target, cost, limit, check, subtype, identifiers and every flag the system's
 * automation reads stay in English (they are translated on screen by display.mjs).
 * Unlocked packs (a GM editing the system compendiums) are left untouched.
 */

export const NAMESPACE = "LHTRPG-PTBR-COMPENDIUM";

/** @type {Record<string, {label?: string, folders?: object, entries?: object}>|null} */
let DATA = null;

/** Whether translations were loaded for this client (pt-BR language). */
export const hasTranslations = () => !!DATA;

/** Move the compendium translations out of the language data (call at `i18nInit`). */
export function loadTranslations() {
  const translations = game.i18n?.translations;
  DATA = translations?.[NAMESPACE] ?? null;
  if (translations) delete translations[NAMESPACE];
  return hasTranslations();
}

/** Translation of a pack of the active system, by collection id ("lhtrpg.skills-class"). */
function packTranslation(collection) {
  if (!DATA || (typeof collection !== "string")) return null;
  const [packageName, name] = collection.split(".");
  if (packageName !== game.system?.id) return null;
  return DATA[name] ?? null;
}

/** System packs are locked unless a GM unlocked them (then they may be edited and saved back). */
function isLocked(collection) {
  const pack = game.packs?.get(collection);
  if (pack) return pack.locked;
  const config = game.settings.get("core", "compendiumConfiguration")?.[collection];
  return config?.locked ?? true;
}

/* -------------------------------------------- */
/*  Pack metadata                               */
/* -------------------------------------------- */

/** Translate labels, index names and folder names of game.data.packs (before the packs are built). */
export function translatePackMetadata() {
  if (!DATA) return;
  for (const meta of game.data?.packs ?? []) {
    if ((meta.packageType !== "system") || (meta.packageName !== game.system.id)) continue;
    const t = DATA[meta.name];
    if (!t || !isLocked(meta.id)) continue;
    if (t.label) meta.label = t.label;
    for (const entry of meta.index ?? []) translateIndexEntry(entry, t);
    for (const folder of meta.folders ?? []) {
      const name = t.folders?.[folder._id];
      if (name) folder.name = name;
    }
  }
}

/**
 * The world folders the system's packFolders created ("Skills", "Items", "Game Master"): renamed in
 * memory only (call at `setup`).
 */
export function translateWorldPackFolders() {
  const names = DATA?._packFolders;
  if (!names) return;
  const seen = new Set();
  for (const pack of game.packs) {
    if ((pack.metadata.packageType !== "system") || (pack.metadata.packageName !== game.system.id)) continue;
    for (let folder = pack.folder; folder && !seen.has(folder.id); folder = folder.folder) {
      seen.add(folder.id);
      const name = names[folder.name];
      if (name && (folder.type === "Compendium")) folder.updateSource({ name });
    }
  }
  if (seen.size) game.packs.initializeTree?.();
}

/* -------------------------------------------- */
/*  Documents                                   */
/* -------------------------------------------- */

function translateIndexEntry(entry, t) {
  const e = t.entries?.[entry?._id];
  if (e?.name) entry.name = e.name;
}

function translateEffects(effects, translations) {
  if (!translations || !Array.isArray(effects)) return;
  for (const effect of effects) {
    const t = translations[effect?._id];
    if (!t) continue;
    if (t.name) effect.name = t.name;
    // Free-text skill notes ("Ignores [Cancel: Cold]") shown on the skill card
    for (const [i, text] of Object.entries(t.notes ?? {})) {
      const change = effect.system?.changes?.[i];
      if (change && (change.key === "lhtrpg.skill.note")) change.value = text;
    }
    // Roll filters name the skills they apply to; the uuid decides, the name is the fallback and the label
    const skills = effect.flags?.lhtrpg?.rollFilter?.skills;
    if (Array.isArray(skills)) {
      for (const [i, name] of Object.entries(t.filterSkills ?? {})) if (skills[i]) skills[i].name = name;
    }
  }
}

function translateItemSource(source, t) {
  if (t.name) source.name = t.name;
  if ((typeof t.description === "string") && source.system) source.system.description = t.description;
  translateEffects(source.effects, t.effects);
}

function translateActorSource(source, t) {
  if (t.name) source.name = t.name;
  if (t.tokenName && source.prototypeToken) source.prototypeToken.name = t.tokenName;
  if ((typeof t.description === "string") && source.system) source.system.description = t.description;
  translateEffects(source.effects, t.effects);
  if (t.items && Array.isArray(source.items)) {
    for (const item of source.items) {
      const it = t.items[item._id];
      if (it) translateItemSource(item, it);
    }
  }
}

function translateJournalSource(source, t) {
  if (t.name) source.name = t.name;
  if (!t.pages || !Array.isArray(source.pages)) return;
  for (const page of source.pages) {
    const p = t.pages[page._id];
    if (!p) continue;
    if (p.name) page.name = p.name;
    if ((typeof p.text === "string") && page.text) page.text.content = p.text;
    if (p.caption && page.image) page.image.caption = p.caption;
  }
}

const TRANSLATE_SOURCE = { Item: translateItemSource, Actor: translateActorSource, JournalEntry: translateJournalSource };

/**
 * The translation of the system compendium entry a world document comes from: by its compendium
 * link (`_stats.compendiumSource` / `flags.core.sourceId`) or else by its English name.
 * @param {Document} doc
 * @returns {{pack: string, id: string, entry: object}|null}
 */
export function findEntry(doc) {
  if (!DATA || !doc) return null;
  const uuid = doc._stats?.compendiumSource ?? doc.flags?.core?.sourceId;
  const m = String(uuid ?? "").match(/^Compendium\.([^.]+)\.([^.]+)\.(?:Item|Actor|JournalEntry)\.([^.]+)$/);
  if (m && (m[1] === game.system.id)) {
    const entry = DATA[m[2]]?.entries?.[m[3]];
    if (entry) return { pack: m[2], id: m[3], entry, en: englishName(m[2], m[3]) };
  }
  for (const [pack, t] of Object.entries(DATA)) {
    if ((t?.documentName !== doc.documentName) || !t.byName) continue;
    const id = t.byName[doc.name];
    if (id && t.entries?.[id]) return { pack, id, entry: t.entries[id], en: doc.name };
  }
  return null;
}

let ENGLISH_NAMES = null;
/** English name of a compendium entry (from the name index of the translation data). */
function englishName(pack, id) {
  ENGLISH_NAMES ??= Object.fromEntries(Object.entries(DATA ?? {}).map(([p, t]) =>
    [p, Object.fromEntries(Object.entries(t?.byName ?? {}).map(([name, i]) => [i, name]))]));
  return ENGLISH_NAMES[pack]?.[id] ?? null;
}

/**
 * Translate the source data of a document of a system pack in place.
 * @returns {boolean}  Whether there was a translation for it
 */
export function translateSource(documentName, source, collection) {
  const t = packTranslation(collection)?.entries?.[source?._id];
  const fn = TRANSLATE_SOURCE[documentName];
  if (!t || !fn) return false;
  fn(source, t);
  return true;
}

/** Wrap the client database backend so compendium reads come out translated (call at `init`). */
export function wrapDatabaseBackend() {
  const backend = CONFIG.DatabaseBackend;
  if (!backend || backend._lhtrpgPtBr) return;
  const original = backend._getDocuments;
  backend._lhtrpgPtBr = true;
  backend._getDocuments = async function (documentClass, operation, user) {
    const result = await original.call(this, documentClass, operation, user);
    const collection = operation?.pack;
    if (!DATA || !collection || !Array.isArray(result) || !packTranslation(collection) || !isLocked(collection)) {
      return result;
    }
    try {
      const t = packTranslation(collection);
      if (operation.index) {
        for (const entry of result) translateIndexEntry(entry, t);
        return result;
      }
      const documentName = documentClass.documentName;
      return result.map(doc => {
        if (!(doc instanceof foundry.abstract.Document) || doc.invalid || !t.entries?.[doc.id]) return doc;
        const source = doc.toObject();
        if (!translateSource(documentName, source, collection)) return doc;
        return documentClass.fromSource(source, { pack: collection });
      });
    }
    catch (err) {
      console.error("lhtrpg-pt-br | Compendium translation failed, the original text is used.", err);
      return result;
    }
  };
}
