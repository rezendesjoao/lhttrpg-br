/**
 * Portuguese display forms of the values the system stores (and reads) in English: tags and the
 * standardized skill fields (Timing, Range, Target, Cost, Limit, Check). The stored data is never
 * changed: these functions only turn an English value into the text shown on screen.
 */

/** Canonical English tag label (as in the system's tag catalog) → Portuguese label. */
export const TAGS = {
  // Equipment
  "Blade": "Lâmina", "Katana": "Katana", "Spear": "Lança", "Hafted": "Contundente", "Staff": "Cajado",
  "Bow": "Arco", "Crossbow": "Besta", "Throwing": "Arremesso", "Whip": "Chicote",
  "Martial Arts": "Artes Marciais", "Instrument": "Instrumento", "Magic Stone": "Pedra Mágica",
  "Light": "Leve", "Light Armor": "Armadura Leve", "Medium Armor": "Armadura Média",
  "Heavy Armor": "Armadura Pesada", "Shield": "Escudo", "Helm": "Elmo", "Gloves": "Luvas",
  "Boots": "Botas", "Cloak": "Manto", "Bag": "Bolsa", "One-Handed": "Uma Mão", "Two-Handed": "Duas Mãos",
  "Accessory": "Acessório", "Head": "Cabeça", "Arms": "Braços", "Legs": "Pernas", "Dual Wield": "Duas Armas",
  "Sword": "Espada",
  // Item properties
  "Consumable": "Consumível", "Not For Sale": "Invendável", "Untradeable": "Intransferível",
  "Rare": "Raro", "Potion": "Poção", "Scroll": "Pergaminho", "Toxin": "Toxina", "Food": "Comida",
  "Gem": "Gema", "Charm": "Amuleto", "Medicine": "Medicamento", "Magic Tool": "Ferramenta Mágica",
  "Magic Ring": "Anel Mágico", "Embroidery": "Bordado", "Summoning Whistle": "Apito de Invocação",
  "Flag": "Bandeira", "Tame": "Adestramento", "Valuable": "Valioso", "Core Material": "Material-Base",
  // Skill keywords
  "Preparation": "Preparação", "Training": "Treinamento", "Style": "Estilo", "Stance": "Postura",
  "Harmony": "Harmonia", "Servant Summon": "Invocação de Servo", "Enchantment": "Encantamento",
  "Swift": "Veloz", "Scout": "Reconhecimento", "Summon": "Invocação", "Combat": "Combate",
  "General": "Geral", "Movement": "Movimento", "Auto": "Automático", "Constant": "Constante",
  "Support": "Suporte", "Standby": "Espera", "EX Power": "Poder EX", "GM": "Mestre", "Special": "Especial",
  // Attacks
  "Weapon Attack": "Ataque com Arma", "Melee Attack": "Ataque Corpo a Corpo",
  "Ranged Attack": "Ataque à Distância", "Magic Attack": "Ataque Mágico", "Physical Attack": "Ataque Físico",
  "Special Attack": "Ataque Especial", "Sword Attack": "Ataque com Espada",
  "Non-Close Attacks": "Ataques Não Corpo a Corpo", "Physical Damage": "Dano Físico", "Magical Damage": "Dano Mágico",
  // Elements
  "Flame": "Chama", "Cold": "Frio", "Shock": "Choque", "Radiance": "Radiância", "Blight": "Corrupção",
  "Holy": "Sagrado", "Poison": "Veneno", "Psychic": "Psíquico", "Mental": "Mental",
  // Creatures
  "Human": "Humano", "Humanoid": "Humanoide", "Adventurer": "Aventureiro", "Lander": "Nativo",
  "Goblin": "Goblin", "Kobold": "Kobold", "Ratman": "Homem-Rato", "Neirity": "Neirity",
  "Undead": "Morto-Vivo", "Spirit": "Espírito", "Fairy": "Fada", "Dragon": "Dragão", "Cryptid": "Criptídeo",
  "Mythic": "Mítico", "Nature": "Natureza", "Natural": "Natural", "Plant": "Planta", "Aquatic": "Aquático",
  "Construct": "Constructo", "Artificial": "Artificial", "Inorganic": "Inorgânico", "Inanimate": "Inanimado",
  "Mechanical": "Mecânico", "Clockwork": "Engrenagem", "Magical": "Mágico", "Genius": "Gênio",
  "Gimmick": "Artifício", "Mob": "Lacaio", "Boss": "Chefe", "Raid": "Raide", "Duel": "Duelo",
  "Night Vision": "Visão Noturna", "Underwater": "Submerso"
};

/** Same normalization as the system's `tagKey`: no brackets, case or hyphen/space differences. */
export const tagKey = tag => String(tag ?? "").replace(/[\[\]]/g, "").replace(/[\s-]+/g, " ").trim().toLowerCase();

const TAG_INDEX = new Map(Object.entries(TAGS).map(([en, pt]) => [tagKey(en), pt]));
const TAG_ALIASES = { "fire": "Chama", "electric": "Choque", "move": "Movimento", "night-vision": "Visão Noturna",
  "unmarketable": "Invendável", "shooting attack": "Ataque à Distância", "one hand": "Uma Mão" };
for (const [k, v] of Object.entries(TAG_ALIASES)) TAG_INDEX.set(tagKey(k), v);

/** Portuguese label of a tag; unknown (custom) tags are returned unchanged. */
export function translateTag(tag) {
  const raw = String(tag ?? "");
  const known = TAG_INDEX.get(tagKey(raw));
  if (known) return known;
  let m;
  if ((m = raw.match(/^\s*Magic Catalyst\s*(\d+)\s*$/i))) return `Catalisador Mágico ${m[1]}`;
  if ((m = raw.match(/^\s*CR\s*(\d+)\s*$/))) return `NP${m[1]}`;
  // Comma lists of known tags ("Boss, Raid"); anything else is free text and stays as it is
  if (raw.includes(",")) {
    const parts = raw.split(",").map(t => t.trim());
    if (parts.every(t => TAG_INDEX.has(tagKey(t)))) return parts.map(t => TAG_INDEX.get(tagKey(t))).join(", ");
  }
  return raw;
}

/* -------------------------------------------- */
/*  Skill block fields                          */
/* -------------------------------------------- */

const simplify = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

const TIMING = {
  "Constant": "Constante", "Pre-Play": "Pré-Jogo", "Interlude": "Interlúdio", "Briefing": "Briefing",
  "Rest Time": "Descanso", "Major": "Maior", "Minor": "Menor", "Move": "Movimento", "Movement": "Movimento",
  "Instant": "Instantânea", "Main Process": "Processo Principal", "Setup": "Abertura", "Initiative": "Iniciativa",
  "Cleanup": "Encerramento", "Before Check": "Antes do Teste", "After Check": "Após o Teste",
  "Damage Roll": "Rolagem de Dano", "Before Damage": "Antes do Dano", "After Damage": "Após o Dano",
  "Action": "Ação", "Refer": "Ver texto", "Interrupt": "Interrupção", "Continuous": "Contínuo",
  "Post-action": "Pós-Ação", "Pre-action": "Pré-Ação", "upon attack": "Ao atacar",
  "Fail a defence roll": "Ao falhar em um teste de defesa", "Fail a defense roll": "Ao falhar em um teste de defesa"
};
const TIMING_INDEX = new Map(Object.entries(TIMING).map(([en, pt]) => [simplify(en), pt]));

/** Option labels of the item sheet dropdowns, by field and option key. */
export const FIELD_OPTIONS = {
  timing: TIMING,
  target: { "Self": "Pessoal", "Single": "Individual", "Targets": "Alvos", "Area": "Área", "Wide": "Amplo",
    "Line": "Linha", "Refer": "Ver texto" },
  range: { "Close": "Corpo a corpo", "Weapon": "Arma", "Sq": "Qd", "Refer": "Ver texto" },
  cost: { "Hate": "Ódio", "Fate": "Destino", "Refer": "Ver texto" },
  limit: { "Scenario": "Cenário", "Scene": "Cena", "Round": "Rodada", "[Party]": "[Grupo]", "Other": "Outro" }
};
/** Qualifier options (target P/A, cost Party/Allies). */
export const FIELD_QUALS = { "P": "E", "A": "T", "Party": "Grupo", "Allies": "Aliados" };

/** Ordered regex substitutions; each pattern only matches English text, so Portuguese stays untouched. */
const rules = list => list.map(([re, to]) => [re, to]);
const SHARED = rules([
  [/\bRefer\b/g, "Ver texto"],
  [/\(\s*Select\s*\)/gi, "(Escolha)"],
  [/\(\s*Indiscriminate\s*\)/gi, "(Indiscriminado)"],
  [/\(\s*P\s*\)/g, "(E)"],
  [/\(\s*A\s*\)/g, "(T)"],
  [/\(\s*P\s*\/\s*A\s*\)/g, "(E/T)"],
  // "SR", "SRx3", "2xSR" (x = times), but not inside other words
  [/(?<![A-Za-wyz])SR(?![A-Za-wyz])/g, "NH"],
  [/(?<![A-Za-wyz])CR(?![A-Za-wyz])/g, "NP"]
]);
const RANGE = rules([
  [/\bWide Area(?![a-z])/gi, "Área Ampla"],
  [/\bWide(?![a-z])/g, "Amplo"],
  [/\bArea(?![a-z])/g, "Área"],
  [/\bOutside Close\b/gi, "Fora do Corpo a corpo"],
  [/\bClose\b/gi, "Corpo a corpo"],
  [/\bWeapon\b/g, "Arma"],
  [/(\d|\])\s*Sq\b/g, "$1Qd"],
  [/\bSq\b/g, "Qd"],
  [/\bSquares?\b/gi, "quadrados"]
]);
const TARGET = rules([
  [/\bSelf\b/gi, "Pessoal"],
  [/\bSingle\b/gi, "Individual"],
  [/^\s*1\s+Targets?\b/i, "1 Alvo"],
  [/\bTargets?\b/gi, "Alvos"],
  [/\bWide Area(?![a-z])/gi, "Área Ampla"],
  [/\bWide(?![a-z])/g, "Amplo"],
  [/\bArea(?![a-z])/g, "Área"],
  [/\bLine(?![a-z])/g, "Linha"],
  [/\bClose\b/gi, "Corpo a corpo"],
  [/\b(Two|Three|Four|Five|Six)\b/g, m => ({ Two: "Dois", Three: "Três", Four: "Quatro", Five: "Cinco", Six: "Seis" })[m]]
]);
const COST = rules([
  [/\bHate\b/gi, "Ódio"],
  [/\bFate\b/gi, "Destino"],
  [/\bH\s*\(/g, "Ó("],
  [/\bF\s*\(/g, "D("],
  [/\(\s*Party\s*\)/gi, "(Grupo)"],
  [/\(\s*Allies\s*\)/gi, "(Aliados)"]
]);
const LIMIT = rules([
  [/\bScenarios?\b/gi, "Cenário"],
  [/\bScenes?\b/gi, "Cena"],
  [/\bRounds?\b/gi, "Rodada"],
  [/\bencounters?\b/gi, "Encontro"],
  [/\[\s*Party\s*\]/gi, "[Grupo]"],
  [/\bParty\b/gi, "Grupo"],
  [/\bOther\b/g, "Outro"]
]);
const CHECK_WORDS = rules([
  // "(2D+4vsEvasion)", "(2+3D)vsResistance": separate a glued "vs" first
  [/([\d)])\s*vs\.?\s*(?=[A-Za-z(\d])/g, "$1 vs "],
  [/\bNone\b/g, "Nenhum"],
  [/\bAutomatic\b/gi, "Automático"],
  [/\bAuto\b/g, "Automático"],
  [/\bConstant\b/g, "Constante"],
  [/\bOpposed\b/gi, "Oposto"],
  [/\bBasic\b/g, "Básico"],
  [/\bConfrontation\b/gi, "Confronto"],
  [/\(\s*Fixed\s*\)/gi, "(Fixo)"],
  [/\bFixed\b/gi, "Fixo"],
  [/\bIdentification Diff(?:iculty)?\b/gi, "Dificuldade de Identificação"],
  [/\bDetection Difficulty\b/gi, "Dificuldade de Detecção"],
  [/\bDisable Difficulty\b/gi, "Dificuldade de Desarme"],
  [/\bAccuracy\b/gi, "Precisão"],
  [/\bEvasion\b/gi, "Esquiva"],
  [/\bEVA\b/g, "Esquiva"],
  [/\bResistance\b/gi, "Resistência"],
  [/\bPerception\b/gi, "Percepção"],
  [/\bAthletics\b/gi, "Atletismo"],
  [/\bDisable\b/gi, "Desarme"],
  [/\bAnalysis\b/gi, "Análise"],
  [/\bKnowledge\b/gi, "Conhecimento"],
  [/\bOperat(?:e|ion)\b/gi, "Operação"],
  [/\bNegotiation\b/gi, "Negociação"],
  [/\bEndurance\b/gi, "Vigor"],
  [/\bvs\.?(?=\s|$)/gi, "vs"],
  [/\s+v\s+/g, " vs "]
]);

const apply = (text, ...lists) => {
  let out = String(text ?? "");
  for (const list of lists) for (const [re, to] of list) out = out.replace(re, to);
  return out;
};
const isEmpty = v => /^[\s\p{Pd}−]*$/u.test(String(v ?? ""));

export function translateTiming(value) {
  if (isEmpty(value)) return value;
  return TIMING_INDEX.get(simplify(value)) ?? apply(value, SHARED);
}
export const translateRange = value => (isEmpty(value) ? value : apply(value, RANGE, SHARED));
export const translateTarget = value => (isEmpty(value) ? value : apply(value, TARGET, SHARED));
export const translateCost = value => (isEmpty(value) ? value : apply(value, COST, SHARED));
export const translateLimit = value => (isEmpty(value) ? value : apply(value, LIMIT, SHARED));
/** Legacy "Check" text ("Opposed (Accuracy vs Evasion)") or a check label built by the system. */
export const translateCheck = value => (isEmpty(value) ? value : apply(value.trim(), CHECK_WORDS, SHARED));

export const FIELD_TRANSLATORS = {
  timing: translateTiming, range: translateRange, target: translateTarget,
  cost: translateCost, limit: translateLimit, check: translateCheck
};

/* -------------------------------------------- */
/*  Effect formulas (readable form)             */
/* -------------------------------------------- */

const ATTR = { STR: "FOR", DEX: "DES", POW: "POD", INT: "INT" };

/** The system shows formulas as "SR×3", "DEX mod", "Weapon Attack Power"…: Portuguese forms. */
const FORMULA = rules([
  [/\bWeapon Attack Power\b/g, "Poder de Ataque da Arma"],
  [/\bWeapon Magic Power\b/g, "Poder Mágico da Arma"],
  [/\bOff-hand Attack Power\b/g, "Poder de Ataque da Mão Secundária"],
  [/\bOff-hand Magic Power\b/g, "Poder Mágico da Mão Secundária"],
  [/\bSR max\b/g, "NH máx."],
  [/\bAttack Power\b/g, "Poder de Ataque"],
  [/\bMagic Power\b/g, "Poder Mágico"],
  [/\bRecovery\b/g, "Recuperação"],
  [/\b(STR|DEX|POW|INT) (mod|base)\b/g, (m, a, p) => `${p === "mod" ? "mod. de" : "valor de"} ${ATTR[a]}`],
  [/\[(STR|DEX|POW|INT)\]/g, (m, a) => `[${ATTR[a]}]`],
  [/\bSR\b/g, "NH"],
  [/\bCR\b/g, "NP"]
]);
export const translateFormulaText = text => apply(text, FORMULA);

/** Exclusive roll-bonus groups (stored in English, compared by the system): the skill family names. */
export const EXCLUSIVE_GROUPS = { "Weapon Mastery": "Maestria em Armas", "Energy Mastery": "Maestria em Energia" };
const EXCLUSIVE_RE = new RegExp(`\\b(${Object.keys(EXCLUSIVE_GROUPS).join("|")})\\b(?!:)`, "g");
export const translateExclusiveGroups = text => String(text).replace(EXCLUSIVE_RE, m => EXCLUSIVE_GROUPS[m]);
export const translateAttribute = abbr => ATTR[abbr] ?? abbr;
