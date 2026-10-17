/**
 * On-screen translation of the values the system stores in English and reads in its automation:
 * tags and the skill block fields (Timing, Range, Target, Cost, Limit, Check), plus a few
 * abbreviations written straight into the system's templates (SR, CR, Sq, HP, [STR]…).
 * Nothing here changes document data: only the rendered HTML and the Handlebars helpers' output.
 */
import {
  FIELD_OPTIONS, FIELD_QUALS, FIELD_TRANSLATORS, TAGS, tagKey, translateAttribute, translateCheck,
  translateExclusiveGroups, translateFormulaText, translateRange, translateTag, translateTiming
} from "./terms.mjs";

/* -------------------------------------------- */
/*  Handlebars helpers                          */
/* -------------------------------------------- */

/** Replace a helper registered by the system with a wrapper that post-processes its result. */
function wrapHelper(name, transform) {
  const original = Handlebars.helpers[name];
  if (typeof original !== "function") return;
  Handlebars.registerHelper(name, function (...args) {
    const result = original.apply(this, args);
    try {
      return transform(result);
    }
    catch (err) {
      console.error(`lhtrpg-pt-br | ${name}`, err);
      return result;
    }
  });
}

/** "[Two-Handed]" → "[Duas Mãos]", "(Flame)" → "(Chama)": only text that is exactly a known tag. */
export function translateBracketTags(text) {
  return String(text)
    .replace(/\[([^\[\]<>]+)\]/g, (m, inner) => {
      const pt = translateTag(inner);
      return pt === inner ? m : `[${pt}]`;
    })
    .replace(/\(([^()<>]+)\)/g, (m, inner) => {
      const known = inner.split(",").every(t => TAG_LOOKUP.has(tagKey(t)));
      const pt = known ? translateTag(inner) : inner;
      return pt === inner ? m : `(${pt})`;
    });
}
const TAG_LOOKUP = new Set(Object.keys(TAGS).map(tagKey));

/** Text produced by the system with tags, formulas ("SR×3") and exclusive groups. */
const translateSummary = text => translateExclusiveGroups(translateFormulaText(translateBracketTags(text)));

function mapHelperText(result) {
  if (result instanceof Handlebars.SafeString) return new Handlebars.SafeString(translateSummary(result.toString()));
  return (typeof result === "string") ? translateSummary(result) : result;
}

function registerHelperWrappers() {
  // Tag chips of the sheets: only the label shown changes (removal goes by index)
  wrapHelper("lhTagChips", chips => (Array.isArray(chips)
    ? chips.map(c => ({ ...c, label: translateTag(c.label) }))
    : chips));
  wrapHelper("lhEffectSummary", mapHelperText);
  wrapHelper("lhConditionLabel", mapHelperText);
}

/* -------------------------------------------- */
/*  Rendered HTML                               */
/* -------------------------------------------- */

/** Fields of the chat card stat rows, by their label (Portuguese or, for old messages, English). */
let STAT_FIELDS = null;
function statFields() {
  if (STAT_FIELDS) return STAT_FIELDS;
  const byKey = {
    timing: ["LHTRPG.Skill.Label.Timing", "LHTRPG.Item.Label.Timing", "Timing"],
    target: ["LHTRPG.Skill.Label.Target", "LHTRPG.Item.Label.Target", "Target"],
    range: ["LHTRPG.Skill.Label.Range", "LHTRPG.Item.Label.Range", "Range"],
    cost: ["LHTRPG.Skill.Label.Cost", "Cost"],
    limit: ["LHTRPG.Skill.Label.Limit", "LHTRPG.Item.Label.BagLimit", "Limit", "Storage Limit"],
    check: ["LHTRPG.Skill.Label.Check", "LHTRPG.Item.Label.Check", "Check"],
    formula: ["LHTRPG.Skill.Label.Damage", "Damage"]
  };
  STAT_FIELDS = new Map();
  for (const [field, labels] of Object.entries(byKey)) {
    for (const label of labels) STAT_FIELDS.set(game.i18n.localize(label).trim().toLowerCase(), field);
  }
  return STAT_FIELDS;
}

const TRANSLATE_FIELD = { ...FIELD_TRANSLATORS, formula: translateFormulaText };

/** Apply `fn` to every text node under `el` (keeps the markup, e.g. a modified-value span). */
function mapTextNodes(el, fn) {
  if (!el) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    if (!text.trim()) continue;
    const out = fn(text);
    if (out !== text) node.nodeValue = out;
  }
}
const setText = (el, fn) => {
  if (!el) return;
  const text = el.textContent;
  const out = fn(text);
  if (out !== text) el.textContent = out;
};
const setAttr = (el, attr, fn) => {
  const value = el.getAttribute(attr);
  if (value == null) return;
  const out = fn(value);
  if (out !== value) el.setAttribute(attr, out);
};
/** Keep the surrounding spaces of a text node when translating its content. */
const trimmed = fn => text => text.replace(/^(\s*)([\s\S]*?)(\s*)$/, (m, a, core, b) => `${a}${fn(core)}${b}`);

const ATTR_RE = /\[(STR|DEX|POW|INT)\]/g;
const SR_RE = /\bSR\b/g;

/** Translate the system values shown in an element (a sheet, an app or a chat message). */
export function translateElement(root) {
  if (!(root instanceof HTMLElement)) return;

  // Tag chips of chat cards and lists
  for (const el of root.querySelectorAll(".chat-card-tags .tag, .lh-tag-input .tag > span")) setText(el, trimmed(translateTag));

  // Stat rows of chat cards (skills, items, use cards, monster info)
  const fields = statFields();
  for (const stat of root.querySelectorAll(".chat-stat")) {
    const label = stat.querySelector(".chat-stat-label")?.textContent.trim().toLowerCase();
    const fn = TRANSLATE_FIELD[fields.get(label)];
    if (fn) mapTextNodes(stat.querySelector(".chat-stat-value"), trimmed(fn));
  }

  // Monster sheet skill list
  for (const el of root.querySelectorAll(".item-timing h4")) setText(el, trimmed(translateTiming));
  for (const el of root.querySelectorAll(".item-checkType h4")) setText(el, trimmed(translateCheck));

  // Skill tiles of the character sheet: "Name — Timing — Check" tooltip
  for (const el of root.querySelectorAll(".skill-tile .item-throw[title]")) {
    setAttr(el, "title", title => {
      const parts = title.split(" — ");
      if (parts.length < 3) return title;
      parts[parts.length - 2] = translateTiming(parts[parts.length - 2]);
      parts[parts.length - 1] = translateCheck(parts[parts.length - 1]);
      return parts.join(" — ");
    });
  }

  // Skill Browser: "[Tag]" in the details line, "SR n" badges and picks
  for (const el of root.querySelectorAll(".skill-browser-body .skill-meta")) mapTextNodes(el, translateBracketTags);
  for (const el of root.querySelectorAll(".skill-browser-body .skill-owned, .skill-browser-body .skill-chip")) {
    mapTextNodes(el, text => text.replace(SR_RE, "NH"));
  }

  // Attack card: target distance and the range in the subtitle
  for (const el of root.querySelectorAll(".lh-distance")) setText(el, text => text.replace(/(\d)\s*Sq\b/, "$1 Qd"));
  for (const el of root.querySelectorAll(".lh-attack-card .chat-card-type")) {
    mapTextNodes(el, text => {
      const i = text.lastIndexOf(" · ");
      return (i < 0) ? text : text.slice(0, i + 3) + translateRange(text.slice(i + 3));
    });
  }

  // Damage card: "→ 12 HP" lines and their tooltips
  for (const card of root.querySelectorAll(".lh-damage-card")) {
    mapTextNodes(card, text => text.replace(/\bHP\b/g, "PV"));
    for (const el of card.querySelectorAll("[data-tooltip]")) setAttr(el, "data-tooltip", text => text.replace(/\bHP\b/g, "PV"));
  }

  // Item sheet: the dropdowns of the skill block fields (the option values stay English)
  for (const field of root.querySelectorAll(".skill-field[data-field]")) {
    const labels = FIELD_OPTIONS[field.dataset.field];
    if (labels) {
      for (const option of field.querySelectorAll("select.skill-field-type option")) {
        const pt = labels[option.value];
        if (pt) option.textContent = pt;
      }
    }
    for (const option of field.querySelectorAll("select.skill-field-qual option")) {
      const pt = FIELD_QUALS[option.value];
      if (pt) option.textContent = pt;
    }
  }

  // Free-text fields of weapon / gear / bag sheets keep the stored English value: Portuguese as tooltip
  const FREE_TEXT = { ".itemRange-input": "range", ".itemTiming-input": "timing", ".itemTarget-input": "target",
    ".itemBagLimit-input": "limit" };
  for (const [selector, field] of Object.entries(FREE_TEXT)) {
    for (const input of root.querySelectorAll(`input${selector}`)) {
      const pt = FIELD_TRANSLATORS[field](input.value);
      if (input.value && (pt !== input.value)) input.dataset.tooltip = pt;
    }
  }

  // "[STR]" attribute headers: character sheet and the Human / bonus points dialogs
  for (const el of root.querySelectorAll("h4.attr-name, .stat-allocation-body .stat-label, .stat-allocation-body th")) {
    setText(el, text => text.replace(ATTR_RE, (m, a) => `[${translateAttribute(a)}]`));
  }

  // Ranked ticket slots: "CR 3"
  for (const el of root.querySelectorAll(".ticket-rank-name, .ticket-rank-add > span")) {
    setText(el, text => text.replace(/\bCR\b/, "NP"));
  }

  // Shops: "R3 · Tag · Tag" under each item
  for (const el of root.querySelectorAll(".pile-item-type")) {
    setText(el, text => text.includes(" · ")
      ? text.split(" · ").map(p => translateTag(p)).join(" · ")
      : text);
  }

  // Effect editor: tag suggestions of the conditions (the inserted value stays English)
  for (const option of root.querySelectorAll("datalist#lh-condition-tags option")) {
    const pt = translateTag(option.value);
    if (pt !== option.value) option.label = pt;
  }
}

/** Whether an application belongs to the system (its sheets, browsers, dialogs and effect editor). */
function isSystemApplication(app, element) {
  const classes = element?.classList;
  if (classes?.contains("lhtrpg") || classes?.contains("lhtrpg-effect-config")) return true;
  return ["Actor", "Item", "ActiveEffect"].includes(app?.document?.documentName);
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/**
 * Messages where the system inserts stored English values ("Timing major", "range 4Sq", "[Harmony]"):
 * the values are translated before the text is built.
 */
const FORMAT_VALUES = {
  "LHTRPG.Item.Use.Blocked": { timing: translateTiming },
  "LHTRPG.Item.Use.GMOverride": { timing: translateTiming },
  "LHTRPG.Combat.Notif.OutOfRange": { range: translateRange, names: text => text.replace(/(\d)\s*Sq\)/g, "$1 Qd)") },
  "LHTRPG.EffectExpiry.Reason.SustainedLimit": { tag: translateTag },
  "LHTRPG.Sustained.Dialog.Hint": { tag: translateTag },
  "LHTRPG.Condition.Summary.equipped": { value: translateTag },
  "LHTRPG.Condition.Summary.notEquipped": { value: translateTag },
  "LHTRPG.Condition.Summary.oneWeapon": { value: translateTag },
  "LHTRPG.Condition.Summary.twoWeapons": { value: translateTag },
  "LHTRPG.RollFilter.Summary.Exclusive": { group: translateExclusiveGroups }
};
function wrapFormat() {
  const i18n = game.i18n;
  if (!i18n || i18n._lhtrpgPtBr) return;
  const original = i18n.format;
  i18n._lhtrpgPtBr = true;
  i18n.format = function (key, data = {}) {
    const fields = FORMAT_VALUES[key];
    if (fields && data && (typeof data === "object")) {
      data = { ...data };
      for (const [field, fn] of Object.entries(fields)) {
        if ((data[field] !== undefined) && (data[field] !== null)) data[field] = fn(String(data[field]));
      }
    }
    return original.call(this, key, data);
  };
}

/** Call at `i18nInit`, after the system registered its helpers. */
export function registerDisplay() {
  registerHelperWrappers();
  wrapFormat();
  Hooks.on("renderApplicationV2", (app, element) => {
    if (isSystemApplication(app, element)) translateElement(element);
  });
  Hooks.on("renderChatMessageHTML", (message, html) => translateElement(html));
  watchSuggestionMenus();
}

/**
 * The tag suggestion menus of the system (floating lists appended to the page): the labels shown
 * become Portuguese, the picked value stays the English tag.
 */
function watchSuggestionMenus() {
  if (!document.body) return;
  const translateMenu = menu => {
    for (const el of menu.querySelectorAll(".lh-tag-menu-label")) mapTextNodes(el, trimmed(translateTag));
  };
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement) || !node.classList.contains("lh-tag-menu")) continue;
        translateMenu(node);
        // The menu is refilled as the user types
        new MutationObserver(() => translateMenu(node)).observe(node, { childList: true });
      }
    }
  }).observe(document.body, { childList: true });
}

/** Default names of new tickets (the system's presets). */
export function translateTicketPresets() {
  const presets = CONFIG.Item.documentClass?.TICKET_PRESETS;
  if (!presets) return;
  const names = { Treasure: "Tíquete de Tesouro", Fate: "Tíquete de Destino", Connection: "Tíquete de Conexão",
    Reset: "Tíquete de Reinício" };
  for (const [subtype, name] of Object.entries(names)) if (presets[subtype]) presets[subtype].name = name;
}

/**
 * Portuguese aliases in the tag catalog: tags typed in Portuguese ("Duas Mãos", "duas maos") are
 * stored as the English label the automation expects. Never changes a label.
 */
export function addTagAliases() {
  const catalog = CONFIG.LHTRPG?.tags;
  if (!Array.isArray(catalog)) return;
  const taken = new Map();
  for (const entry of catalog) {
    for (const name of [entry.label, ...(entry.aliases ?? [])]) taken.set(tagKey(name), entry);
  }
  const strip = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const entry of catalog) {
    const pt = TAGS[entry.label];
    if (!pt || (pt === entry.label)) continue;
    for (const alias of new Set([pt, strip(pt)])) {
      const key = tagKey(alias);
      if (taken.has(key)) continue;
      entry.aliases = [...(entry.aliases ?? []), alias];
      taken.set(key, entry);
    }
  }
  // A new array makes the system rebuild its lookup index with the aliases.
  CONFIG.LHTRPG.tags = [...catalog];
}
