/**
 * Plain-text "block" view of the text chunks, easier to read and write than JSON (no escaping):
 *
 *   === <key>
 *   # <document name: context, ignored when converting back>
 *   <HTML, as many lines as needed>
 *
 *   node tools/blocks.mjs export              work/en/text/<pack>/NN.json  → NN.txt (all chunks)
 *   node tools/blocks.mjs import <pack> <NN>  work/pt-BR/text/<pack>/NN.txt → NN.json (+ check)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ROOT, WORK, readJSON, writeJSON } from "./lib.mjs";

// Command line only when run directly (other tools import toBlocks / fromBlocks)
const isMain = !!process.argv[1] && (import.meta.url === pathToFileURL(process.argv[1]).href);
const [command, pack, nn] = isMain ? process.argv.slice(2) : [];

export function toBlocks(chunk) {
  return Object.entries(chunk).map(([key, v]) =>
    `=== ${key}\n# ${String(v.label ?? "").replace(/\n/g, " ")}\n${(v.text ?? v).trim()}\n`).join("\n");
}

export function fromBlocks(text) {
  const out = {};
  const parts = text.replace(/\r\n/g, "\n").split(/^=== (.+)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].trim();
    const lines = parts[i + 1].split("\n");
    while (lines.length && (!lines[0].trim() || lines[0].startsWith("# "))) lines.shift();
    out[key] = lines.join("\n").trim();
  }
  return out;
}

if (command === "export") {
  let n = 0;
  for (const p of fs.readdirSync(path.join(WORK, "en", "text"))) {
    const dir = path.join(WORK, "en", "text", p);
    for (const f of fs.readdirSync(dir).filter(f => /^\d+\.json$/.test(f))) {
      fs.writeFileSync(path.join(dir, f.replace(".json", ".txt")), toBlocks(readJSON(path.join(dir, f))), "utf8");
      n++;
    }
  }
  console.log(`${n} chunks exported as blocks`);
}
else if (command === "import") {
  if (!pack || !nn) throw new Error("Usage: node tools/blocks.mjs import <pack> <NN>");
  const src = path.join(WORK, "pt-BR", "text", pack, `${nn}.txt`);
  const data = fromBlocks(fs.readFileSync(src, "utf8"));
  writeJSON(path.join(WORK, "pt-BR", "text", pack, `${nn}.json`), data);
  console.log(`${Object.keys(data).length} entries → work/pt-BR/text/${pack}/${nn}.json`);
  try {
    process.stdout.write(execFileSync(process.execPath, [path.join(ROOT, "tools", "check-chunk.mjs"), pack, nn], { encoding: "utf8" }));
  }
  catch (err) {
    process.stdout.write(err.stdout ?? String(err));
    process.exit(1);
  }
}
else if (command) throw new Error(`Unknown command ${command}`);
