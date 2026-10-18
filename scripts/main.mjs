/**
 * Log Horizon TRPG — Português (Brasil)
 *
 * - lang/pt-BR.json: the system's interface (loaded by Foundry for the pt-BR language).
 * - lang/compendium/*.json: the text of the system compendiums, applied by compendium.mjs.
 * - display.mjs: the values the system keeps in English for its automation, shown in Portuguese.
 */
import {
  hasTranslations, loadTranslations, translatePackMetadata, translateWorldPackFolders, wrapDatabaseBackend
} from "./compendium.mjs";
import { addTagAliases, attempt, registerDisplay, translateTicketPresets } from "./display.mjs";
import { registerWorldTool } from "./world.mjs";

const MODULE_ID = "lhtrpg-pt-br";
const SYSTEM_ID = "lhtrpg";

const setting = key => {
  try {
    return game.settings.get(MODULE_ID, key);
  }
  catch {
    return true;
  }
};

Hooks.once("init", () => {
  if (game.system.id !== SYSTEM_ID) return;

  game.settings.register(MODULE_ID, "compendiums", {
    name: "LHTRPG-PTBR.Settings.Compendiums.Name",
    hint: "LHTRPG-PTBR.Settings.Compendiums.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
  game.settings.register(MODULE_ID, "display", {
    name: "LHTRPG-PTBR.Settings.Display.Name",
    hint: "LHTRPG-PTBR.Settings.Display.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
  attempt("World tool", registerWorldTool);

  // Compendium reads go through the backend from the start; it does nothing until data is loaded.
  if (setting("compendiums")) attempt("Compendium backend", wrapDatabaseBackend);
});

Hooks.once("i18nInit", () => {
  if ((game.system.id !== SYSTEM_ID) || (game.i18n.lang !== "pt-BR")) return;

  // The compendium data travels as language data: take it out of game.i18n in any case.
  const loaded = attempt("Compendium translations", loadTranslations);
  if (loaded && setting("compendiums")) attempt("Compendium labels", translatePackMetadata);

  if (setting("display")) {
    attempt("Tag aliases", addTagAliases);
    attempt("Ticket names", translateTicketPresets);
    registerDisplay();
  }
});

Hooks.once("setup", () => {
  if ((game.system.id !== SYSTEM_ID) || !hasTranslations() || !setting("compendiums")) return;
  translateWorldPackFolders();
});
