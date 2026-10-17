/**
 * Checks one translated text chunk against its English source.
 *
 *   node tools/check-chunk.mjs <pack> <NN>      e.g.  node tools/check-chunk.mjs skills-class 03
 *
 * Reports: invalid JSON, missing / extra keys, empty values, protected tokens (⟦a1⟧ ⟦r1⟧) or HTML tags
 * that differ from the source, text left in English (heuristic), and leftover English game terms.
 * Exit code 1 when there is a blocking problem.
 */
import fs from "node:fs";
import path from "node:path";
import { WORK, readJSON, compareMarkup } from "./lib.mjs";

const [pack, nn] = process.argv.slice(2);
if (!pack || !nn) {
  console.log("Usage: node tools/check-chunk.mjs <pack> <NN>");
  process.exit(2);
}
const enFile = path.join(WORK, "en", "text", pack, `${nn}.json`);
const ptFile = path.join(WORK, "pt-BR", "text", pack, `${nn}.json`);
const en = readJSON(enFile);
let pt;
try {
  pt = JSON.parse(fs.readFileSync(ptFile, "utf8"));
}
catch (err) {
  console.log(`BLOCKING: ${ptFile} is missing or not valid JSON: ${err.message}`);
  process.exit(1);
}

const blocking = [];
const notes = [];
const plain = s => s.replace(/<[^>]+>/g, " ").replace(/⟦[ar]\d+⟧/g, " ").replace(/&[a-z]+;/g, " ");
// English words that should not survive in a Portuguese rules text (outside proper names)
const ENGLISH = /\b(the|and|you|your|with|this|that|when|target|damage|skill|gain|deal|each|enemy|ally|allies|round|scene|check|attack|until|during|may|must|which|from|have|has|SR|CR|HP|Sq)\b/g;

for (const key of Object.keys(en)) {
  const raw = pt[key];
  const value = (raw && typeof raw === "object") ? raw.text : raw;
  if (typeof value !== "string" || !value.trim()) {
    blocking.push(`${key}: missing or empty`);
    continue;
  }
  const diff = compareMarkup(en[key].text, value);
  if (diff.length) blocking.push(`${key}: markup differs: ${diff.join("; ")}`);
  if (value === en[key].text && plain(value).trim()) notes.push(`${key}: identical to the English text`);
  const words = [...new Set(plain(value).match(ENGLISH) ?? [])];
  if (words.length >= 3) notes.push(`${key}: English words left? ${words.join(", ")}`);
}
for (const key of Object.keys(pt)) if (!(key in en)) blocking.push(`${key}: not in the source`);

console.log(`${pack}/${nn}: ${Object.keys(en).length} entries, ${blocking.length} blocking problem(s), ${notes.length} note(s)`);
for (const p of blocking) console.log(`  BLOCKING ${p}`);
for (const p of notes) console.log(`  note     ${p}`);
process.exit(blocking.length ? 1 : 0);
