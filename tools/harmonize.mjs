/**
 * Terminology harmonization after the parallel translation of the chunks: the same English term was
 * sometimes rendered in two ways by different translators. Applies the chosen form to every
 * translated chunk (work/pt-BR/text/<pack>/NN.json and its .txt) and reports what changed.
 * Idempotent: running it again changes nothing.
 *
 *   node tools/harmonize.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { WORK, readJSON, writeJSON } from "./lib.mjs";
import { toBlocks } from "./blocks.mjs";

const DRY = process.argv.includes("--dry");

/** Every chunk. */
const GLOBAL = [
  // Exhaustion tables: "Stamina" → Estamina (rules and most lots)
  [/(\[Tabela de Exaustão:[^\]]*?)Fôlego/g, "$1Estamina"],
  [/(Tabela de Exaustão[^.<\]]{0,40}?)\bFôlego\b/g, "$1Estamina"],
  // [Trigger: X] / [Active: X] on items work as the Timing field
  [/\[Gatilho:\s*/g, "[Momento: "],
  [/\[Ativação:\s*/g, "[Momento: "],
  // [Hinder]
  [/\[Bloqueio\]/g, "[Obstrução]"],
  // [Attack Check] is the Hit Check
  [/\[Teste de Ataque\]/g, "[Teste de Acerto]"],
  [/\[Testes de Ataque\]/g, "[Testes de Acerto]"],
  // (Self: X) condition markers
  [/\(Pessoal:\s*/g, "(Você: "],
  [/\[Pessoal:\s*/g, "[Você: "],
  // [STR base] → [valor de FOR], as in the interface ("@dex.base (valor de DES)")
  [/\[(FOR|DES|POD|INT) [Bb]ase\]/g, "[valor de $1]"],
  // Creed tag Freeman, as defined in chapter II of the rules
  [/\bHomem Livre\b/g, "Espírito Livre"],
  // [Hand Slot] as in the glossary
  [/\[Espaço de Mão\]/g, "[espaço de mão]"],
  [/\[Espaços de Mão\]/g, "[espaços de mão]"],
  // [Teleport]
  [/Teletransportes/g, "Teleportes"],
  [/Teletransporte/g, "Teleporte"],
  [/teletransporte/g, "teleporte"]
  // (A status "rating" is sometimes "intensidade", sometimes "Valor": both read well, left as they are.)
];

/** Specific chunks: the check values ("Attributes") are Perícias, as in chapter V of the rules. */
const LOCAL = {
  // "Shikigami Master" in the source is the Kannagi skill Summon Shikigami
  "items/06": [["\"Mestre dos Shikigami\"", "\"Invocar Shikigami\""]],
  // [Hinder] as a noun, like in the skills
  "rules/02": [
    ["todos os personagens têm a capacidade de [Obstruir] uns aos outros", "todos os personagens podem usar [Obstrução] uns contra os outros"],
    ["[Obstruir]", "[Obstrução]"]
  ],
  "rules/01": [
    // Creed tag Craftsman: not "Artesão", which is the Artisan subclass in the Connection lists
    ["[Artesão]", "[Mestre de Ofício]"],
    ["2d6 + Valor de Teste", "2d6 + Perícia"],
    ["- Atributos e Valores de Teste -", "- Atributos e Perícias -"],
    ["Agora anote seus Valores de Teste. São eles que você de fato usa para fazer testes. Eles são determinados pelo Atributo correspondente",
      "Agora anote suas Perícias. São elas que você de fato usa para fazer testes. Elas são determinadas pelo Atributo correspondente"],
    ["Os Valores de Teste Podem Aumentar", "As Perícias Podem Aumentar"],
    ["os Valores de Teste dele também aumentarão", "as Perícias dele também aumentarão"],
    ["quais Atributos afetam quais Valores de Teste:", "quais Atributos afetam quais Perícias:"],
    ["Básico (Valor de Teste/Dificuldade): exige um Teste Básico com o valor de teste e a dificuldade especificados.",
      "Básico (Perícia/Dificuldade): exige um Teste Básico com a perícia e a dificuldade especificadas."],
    ["Oposto (Valor de Teste/Valor de Teste): exige um Teste Oposto. Se forem especificados valores de teste, o primeiro é o do usuário e o segundo, o do alvo.",
      "Oposto (Perícia/Perícia): exige um Teste Oposto. Se forem especificadas perícias, a primeira é a do usuário e a segunda, a do alvo."]
  ]
};

/**
 * Recipe ingredients "Frasco de Potência Mágica (Intermediário)": the item is "… II" in the compendium.
 * Only when an item with that numeral exists ("Livro Ilustrado dos Monstros (Iniciante)" is a real name).
 */
const itemNames = new Set(Object.values(readJSON(path.join(WORK, "pt-BR", "names", "items.json"))));
const TIERS = { "Iniciante": "I", "Básico": "I", "Intermediário": "II", "Avançado": "III" };
const tierNames = text => text.replace(/([\p{L}\p{N}'’ -]+?)\s*\((Iniciante|Básico|Intermediário|Avançado)\)/gu, (m, name, tier) => {
  const words = name.trim().split(/\s+/);
  // The longest tail of the preceding words that is an item name
  for (let i = 0; i < words.length; i++) {
    const candidate = `${words.slice(i).join(" ")} ${TIERS[tier]}`;
    if (itemNames.has(candidate)) return `${name.slice(0, name.length - name.trimStart().length)}${words.slice(0, i).join(" ")}${i ? " " : ""}${candidate}`;
  }
  return m;
});

let total = 0;
const log = [];
for (const pack of fs.readdirSync(path.join(WORK, "pt-BR", "text"))) {
  for (const f of fs.readdirSync(path.join(WORK, "pt-BR", "text", pack)).filter(f => /^\d+\.json$/.test(f))) {
    const id = `${pack}/${f.replace(".json", "")}`;
    const file = path.join(WORK, "pt-BR", "text", pack, f);
    const data = readJSON(file);
    let changed = 0;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== "string") continue;
      let out = value;
      for (const [re, to] of GLOBAL) out = out.replace(re, to);
      for (const [from, to] of LOCAL[id] ?? []) out = out.split(from).join(to);
      if (pack === "items") out = tierNames(out);
      if (out !== value) {
        changed++;
        data[key] = out;
      }
    }
    if (!changed) continue;
    total += changed;
    log.push(`${id}: ${changed} text(s)`);
    if (DRY) continue;
    writeJSON(file, data);
    // Keep the editable block file in step with the JSON
    const en = readJSON(path.join(WORK, "en", "text", pack, f));
    const blocks = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { label: en[k]?.label ?? "", text: v }]));
    fs.writeFileSync(file.replace(/\.json$/, ".txt"), toBlocks(blocks), "utf8");
  }
}
// Names: "Stamina Save" goes with the Stamina table
const names = path.join(WORK, "pt-BR", "names", "skills-a.json");
const data = readJSON(names);
let renamed = 0;
for (const [id, v] of Object.entries(data)) if (v === "Economia de Fôlego") { data[id] = "Economia de Estamina"; renamed++; }
if (renamed && !DRY) writeJSON(names, data);
console.log(`${DRY ? "[dry] " : ""}${total} text(s) harmonized, ${renamed} name(s) renamed`);
for (const l of log) console.log(`  ${l}`);
