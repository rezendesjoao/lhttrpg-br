/**
 * Names fixed by the glossary: races, classes, subclasses, compendium folders and the rules journal.
 * Writes work/pt-BR/names/fixed.json. Archetype folders and the "Common" folder keep their English
 * names: the system's Skill Browser compares them with hardcoded English strings.
 */
import path from "node:path";
import { WORK, readJSON, writeJSON } from "./lib.mjs";

const RACES = { "Human": "Humano", "Elf": "Elfo", "Dwarf": "Anão", "Half Alv": "Meio-Alv", "Werecat": "Homem-Gato",
  "Wolf Fang": "Presa de Lobo", "Foxtail": "Cauda de Raposa", "Race of Ritual": "Raça do Ritual" };
const CLASSES = { "Guardian": "Guardião", "Samurai": "Samurai", "Monk": "Monge", "Cleric": "Clérigo", "Druid": "Druida",
  "Kannagi": "Kannagi", "Assassin": "Assassino", "Swashbuckler": "Espadachim", "Bard": "Bardo", "Sorcerer": "Feiticeiro",
  "Summoner": "Invocador", "Enchanter": "Encantador" };
const SUBCLASSES = { "Accountant": "Contador", "Acrobat": "Acrobata", "Admiral": "Almirante", "Alchemist": "Alquimista",
  "Apprentice": "Aprendiz", "Arcanist": "Arcanista", "Armorer": "Armadureiro", "Artificer": "Artífice", "Artisan": "Artesão",
  "Astrologer": "Astrólogo", "Avenger": "Vingador", "Berserker": "Berserker", "Blacksmith": "Ferreiro",
  "Bombardier": "Bombardeiro", "Carpenter": "Carpinteiro", "Cartographer": "Cartógrafo", "Champion": "Campeão",
  "Chef": "Chef", "Chindon'ya": "Chindon'ya", "Coachman": "Cocheiro", "Collector": "Colecionador",
  "Connoisseur": "Conhecedor", "Counterfeiter": "Falsificador", "Courier": "Mensageiro", "Courtesan": "Cortesã",
  "Cursed Blade": "Lâmina Amaldiçoada", "Demon Lord": "Lorde Demônio", "Designer": "Designer", "Detective": "Detetive",
  "Devotee": "Devoto", "Doctor": "Médico", "Duelist": "Duelista", "Elder Maid": "Governanta", "Explorer": "Explorador",
  "Fisherman": "Pescador", "Food Fighter": "Glutão", "Forager": "Coletor", "Fortune Teller": "Vidente",
  "Frontier Guard": "Guarda de Fronteira", "Gambler": "Apostador", "Gemsmith": "Lapidário", "Gladiator": "Gladiador",
  "Herbalist": "Herbalista", "Hero": "Herói", "Hunter": "Caçador", "Idol": "Ídolo", "Instrument Craftsman": "Luthier",
  "Jeweler": "Joalheiro", "Knight": "Cavaleiro", "Leatherworker": "Coureiro", "Machinist": "Maquinista",
  "Magical Girl": "Garota Mágica", "Maid": "Criada", "Mercenary": "Mercenário", "Merchant": "Mercador",
  "Miner": "Minerador", "Negotiator": "Negociador", "Noble": "Nobre", "Nomad": "Nômade", "Novelist": "Romancista",
  "Outlaw": "Fora da Lei", "Painter": "Pintor", "Phantom Thief": "Ladrão Fantasma", "Pharmacist": "Farmacêutico",
  "Pirate": "Pirata", "Sage": "Sábio", "Scholar": "Erudito", "Scout": "Batedor", "Scribe": "Escriba",
  "Sigilmancer": "Sigilomante", "Spellthief": "Ladrão de Feitiços", "Spy": "Espião", "Survivor": "Sobrevivente",
  "Tactician": "Tático", "Tailor": "Alfaiate", "Tamer": "Domador", "Tracker": "Rastreador", "Trader": "Comerciante",
  "Trainer": "Treinador", "Trap Master": "Mestre de Armadilhas", "Vampnella": "Vampnella", "Vendor": "Vendedor",
  "Wand Master": "Mestre das Varinhas", "War Priest": "Sacerdote de Guerra", "Weaponsmith": "Armeiro",
  "Woodworker": "Marceneiro", "Wuxia": "Wuxia" };
const FOLDERS = {
  "races-classes": { "Classes": "Classes", "Races": "Raças", "Subclasses": "Subclasses" },
  "skills-class": CLASSES,
  "skills-racial": RACES,
  "skills-common": { "Subclass": "Subclasse" },
  "items": { "Accessories": "Acessórios", "Armor": "Armaduras", "Bags": "Bolsas", "Charms": "Amuletos", "Food": "Comidas",
    "Gems": "Gemas", "Instruments": "Instrumentos", "Magic Tools": "Ferramentas Mágicas", "Medicine": "Medicamentos",
    "Miscellaneous": "Diversos", "Scrolls": "Pergaminhos", "Shields": "Escudos", "Summons": "Invocações",
    "Toxins": "Toxinas", "Weapons": "Armas" },
  "bestiary": { "Boss": "Chefes", ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(n => [`CR${n}`, `NP${n}`])) }
};
const JOURNALS = {
  "DA RULES": "AS REGRAS", "Enemy Creation Data Guide": "Guia de Criação de Inimigos", "Helper": "Referência Rápida",
  "INDEX": "ÍNDICE", "I. THE BASICS": "I. O BÁSICO", "II. CHARACTERS": "II. PERSONAGENS",
  "III. SESSION FLOW": "III. FLUXO DA SESSÃO", "IV. COMBAT": "IV. COMBATE", "V. GAME MASTER": "V. MESTRE DO JOGO",
  "VI. REFERENCE": "VI. REFERÊNCIA", "VII. Tips": "VII. Dicas", "VIII. Others": "VIII. Outros",
  "About This Document": "Sobre Este Documento", "I. Basic data of the enemy": "I. Dados básicos do inimigo",
  "II. How to create your own enemy": "II. Como criar seu próprio inimigo", "III. Armorer": "III. Encouraçado",
  "IV. Fencer": "IV. Esgrimista", "V. Grappler": "V. Lutador", "VI. Supporter": "VI. Suporte",
  "VII. Healer": "VII. Curandeiro", "VIII. Spear": "VIII. Lanceiro", "IX. Archer": "IX. Arqueiro",
  "X. Shooter": "X. Atirador", "XI. Bomber": "XI. Bombardeiro",
  "Cheat Sheet": "Folha de Consulta (em inglês)", "Attack": "Ataque", "Defense": "Defesa",
  "Round Progression": "Andamento da Rodada", "Status Effects": "Estados", "Scenes": "Cenas"
};

const out = { entries: {}, folders: {}, pages: {} };
const need = (map, en, where) => {
  if (!(en in map)) throw new Error(`No fixed name for "${en}" (${where})`);
  return map[en];
};
const rc = readJSON(path.join(WORK, "en", "names", "races-classes.json"));
for (const [id, e] of Object.entries(rc.entries)) {
  out.entries[id] = need({ race: RACES, class: CLASSES, subclass: SUBCLASSES }[e.type], e.name, `races-classes ${e.type}`);
}
for (const [pack, map] of Object.entries(FOLDERS)) {
  const names = readJSON(path.join(WORK, "en", "names", `${pack}.json`));
  for (const [id, en] of Object.entries(names.folders)) if (en in map) out.folders[id] = map[en];
}
const rules = readJSON(path.join(WORK, "en", "names", "rules.json"));
for (const [id, e] of Object.entries(rules.entries)) {
  out.entries[id] = need(JOURNALS, e.name, "journal");
  for (const [pid, pn] of Object.entries(e.pages)) out.pages[pid] = need(JOURNALS, pn, "page");
}
writeJSON(path.join(WORK, "pt-BR", "names", "fixed.json"), out);
console.log(`entries ${Object.keys(out.entries).length}, folders ${Object.keys(out.folders).length}, pages ${Object.keys(out.pages).length}`);
