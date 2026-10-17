/**
 * Release zip: dist/lhtrpg-pt-br.zip with the files Foundry needs (no work/ or tools/), plus a copy of
 * module.json next to it.
 *
 *   node tools/package.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, readJSON } from "./lib.mjs";

const manifest = readJSON(path.join(ROOT, "module.json"));
const DIST = path.join(ROOT, "dist");
const STAGE = path.join(DIST, manifest.id);
const FILES = ["module.json", "README.md", "CHANGELOG.md", "LICENSE.txt", "lang", "scripts", "docs/GLOSSARIO.md"];

fs.rmSync(DIST, { recursive: true, force: true });
for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) throw new Error(`Missing ${f}`);
  fs.cpSync(src, path.join(STAGE, f), { recursive: true });
}
const zip = path.join(DIST, `${manifest.id}.zip`);
// Windows (bsdtar) and other systems: tar -a picks the zip format from the extension
const entries = [...new Set(FILES.map(f => f.split("/")[0]))];
// The Windows tar (bsdtar), not a GNU tar from Git/MSYS that reads "C:" as a remote host
const tar = (process.platform === "win32") ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
execFileSync(tar, ["-a", "-c", "-f", path.relative(STAGE, zip), ...entries], { cwd: STAGE, stdio: "inherit" });
fs.copyFileSync(path.join(ROOT, "module.json"), path.join(DIST, "module.json"));
const size = fs.statSync(zip).size;
console.log(`${path.relative(ROOT, zip)}: ${(size / 1024).toFixed(0)} KB (${manifest.id} ${manifest.version})`);
