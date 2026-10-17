/**
 * Shared helpers for the dev tools (extract / build / check). Not loaded by Foundry.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const WORK = path.join(ROOT, "work");

/** System folder: --system <path>, LHTRPG_SYSTEM env var or the sibling ../LHTTRPG checkout. */
export function systemRoot() {
  const i = process.argv.indexOf("--system");
  const dir = (i > -1 && process.argv[i + 1]) || process.env.LHTRPG_SYSTEM || path.join(ROOT, "..", "LHTTRPG");
  if (!fs.existsSync(path.join(dir, "system.json"))) throw new Error(`System not found in ${dir} (use --system <path>)`);
  return path.resolve(dir);
}

export const readJSON = file => JSON.parse(fs.readFileSync(file, "utf8"));
export function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Every document of a pack source folder (src/packs/<pack>/*.json), folders apart. */
export function readPack(system, pack) {
  const dir = path.join(system, "src", "packs", pack);
  const docs = [];
  const folders = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
    const doc = readJSON(path.join(dir, f));
    (f.startsWith("_folder_") || doc._key?.startsWith("!folders!") ? folders : docs).push(doc);
  }
  return { docs, folders };
}

/* -------------------------------------------- */
/*  Protected fragments                          */
/* -------------------------------------------- */

/**
 * HTML for translators: tag attributes and inline roll formulas are swapped for tokens
 * (⟦a1⟧, ⟦r1⟧) so they come back untouched. The flavor text of an inline roll ({…}) stays
 * translatable.
 */
const ATTR_RE = /<([a-zA-Z][a-zA-Z0-9]*)(\s[^<>]*?)?(\s*\/?)>/g;
const ROLL_RE = /\[\[\/[a-zA-Z]+\s[^\]]*?\]\]/g;

export function protect(html) {
  const map = {};
  let a = 0;
  let r = 0;
  let text = html.replace(ROLL_RE, m => {
    const key = `⟦r${++r}⟧`;
    map[key] = m;
    return key;
  });
  text = text.replace(ATTR_RE, (m, tag, attrs, close) => {
    if (!attrs || !attrs.trim()) return m;
    const key = `⟦a${++a}⟧`;
    map[key] = attrs;
    return `<${tag} ${key}${close}>`;
  });
  return { text, map };
}

export function restore(text, map) {
  let out = text;
  // Attribute tokens were written as "<tag ⟦aN⟧>": put back the original attribute string (with its space).
  out = out.replace(/<([a-zA-Z][a-zA-Z0-9]*) (⟦a\d+⟧)(\s*\/?)>/g, (m, tag, key, close) => {
    if (!(key in map)) throw new Error(`Unknown token ${key}`);
    return `<${tag}${map[key]}${close}>`;
  });
  out = out.replace(/⟦r\d+⟧/g, key => {
    if (!(key in map)) throw new Error(`Unknown token ${key}`);
    return map[key];
  });
  const left = out.match(/⟦[ar]\d+⟧/g);
  if (left) throw new Error(`Tokens left in text: ${left.join(", ")}`);
  return out;
}

/** Problems between an English source text and its translation (tokens, tags, inline rolls). */
export function compareMarkup(en, pt) {
  const problems = [];
  const count = (s, re) => (s.match(re) ?? []).length;
  for (const token of new Set(en.match(/⟦[ar]\d+⟧/g) ?? [])) {
    const a = count(en, new RegExp(token, "g"));
    const b = count(pt, new RegExp(token, "g"));
    if (a !== b) problems.push(`token ${token}: ${a} → ${b}`);
  }
  for (const token of new Set(pt.match(/⟦[ar]\d+⟧/g) ?? [])) {
    if (!en.includes(token)) problems.push(`unknown token ${token}`);
  }
  const tags = s => {
    const counts = {};
    for (const [, close, name] of s.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)/g)) {
      const k = `${close}${name.toLowerCase()}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  };
  const ta = tags(en);
  const tb = tags(pt);
  for (const k of new Set([...Object.keys(ta), ...Object.keys(tb)])) {
    if ((ta[k] ?? 0) !== (tb[k] ?? 0)) problems.push(`<${k}>: ${ta[k] ?? 0} → ${tb[k] ?? 0}`);
  }
  if (count(en, /\[\[/g) !== count(pt, /\[\[/g)) problems.push("[[ count differs");
  return problems;
}

/** Plain text length of an HTML fragment (for chunk sizing). */
export const textLength = html => (html ?? "").replace(/<[^>]+>/g, "").length;
