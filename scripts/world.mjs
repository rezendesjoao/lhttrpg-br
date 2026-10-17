/**
 * GM tool: translate the world documents that came from the system compendiums before the module
 * (or while playing in English). Each document is matched with its compendium entry (by its link, or
 * by its English name) and gets the Portuguese name, effect names and, if asked, description.
 * Documents renamed by hand are left alone, characters keep their own names, and tags, timing and
 * every other rules field are never touched.
 */
import { findEntry, hasTranslations } from "./compendium.mjs";

const MODULE_ID = "lhtrpg-pt-br";
const L = (key, data) => (data ? game.i18n.format(`LHTRPG-PTBR.World.${key}`, data)
  : game.i18n.localize(`LHTRPG-PTBR.World.${key}`));

/** The entry applies when the document still has the English name, or already the Portuguese one. */
const sameDocument = (doc, en, entry) => !!entry && [en, entry.name].includes(doc.name);

/** Changes of an item (and of its effects) from its compendium entry. */
function itemChanges(item, entry, { descriptions }) {
  const update = {};
  if (entry.name && (item.name !== entry.name)) update.name = entry.name;
  if (descriptions && (typeof entry.description === "string") && (item.system?.description !== entry.description)) {
    update["system.description"] = entry.description;
  }
  const effects = [];
  for (const effect of item.effects ?? []) {
    const name = entry.effects?.[effect.id]?.name;
    if (name && (effect.name !== name)) effects.push({ _id: effect.id, name });
  }
  return { update, effects };
}

/** Everything the tool would change, without changing anything. */
function collect(options) {
  const plan = { actors: [], items: [], counts: { actors: 0, owned: 0, items: 0, effects: 0 } };
  const addItem = (item, entry, list) => {
    const { update, effects } = itemChanges(item, entry, options);
    if (foundry.utils.isEmpty(update) && !effects.length) return false;
    list.push({ item, update, effects });
    plan.counts.effects += effects.length;
    return true;
  };
  const itemEntry = item => {
    const found = findEntry(item);
    return (found && sameDocument(item, found.en, found.entry)) ? found.entry : null;
  };

  for (const item of game.items) {
    const entry = itemEntry(item);
    if (entry && addItem(item, entry, plan.items)) plan.counts.items++;
  }
  for (const actor of game.actors) {
    const update = {};
    // Monsters of the bestiary (player characters keep their names)
    const found = (actor.type === "monster") ? findEntry(actor) : null;
    const monster = (found && sameDocument(actor, found.en, found.entry)) ? found.entry : null;
    if (monster) {
      if (monster.name && (actor.name !== monster.name)) update.name = monster.name;
      if ((actor.prototypeToken?.name === actor.name) && update.name) {
        update["prototypeToken.name"] = monster.tokenName ?? monster.name;
      }
      if (options.descriptions && (typeof monster.description === "string")
        && (actor.system?.description !== monster.description)) update["system.description"] = monster.description;
    }
    const owned = [];
    for (const item of actor.items) {
      // A skill of a bestiary monster by its id, otherwise the item's own compendium entry
      const embedded = monster?.items?.[item.id];
      const entry = (embedded && sameDocument(item, embedded.en, embedded)) ? embedded : itemEntry(item);
      if (entry && addItem(item, entry, owned)) plan.counts.owned++;
    }
    if (!foundry.utils.isEmpty(update)) plan.counts.actors++;
    if (!foundry.utils.isEmpty(update) || owned.length) plan.actors.push({ actor, update, owned });
  }
  return plan;
}

async function apply(plan) {
  let count = 0;
  const withEffects = [];
  const itemUpdates = plan.items.filter(p => !foundry.utils.isEmpty(p.update)).map(p => ({ _id: p.item.id, ...p.update }));
  if (itemUpdates.length) await Item.implementation.updateDocuments(itemUpdates);
  count += plan.items.length;
  withEffects.push(...plan.items.filter(p => p.effects.length));
  for (const { actor, update, owned } of plan.actors) {
    if (!foundry.utils.isEmpty(update)) {
      await actor.update(update);
      count++;
    }
    const updates = owned.filter(p => !foundry.utils.isEmpty(p.update)).map(p => ({ _id: p.item.id, ...p.update }));
    if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
    count += owned.length;
    withEffects.push(...owned.filter(p => p.effects.length));
  }
  for (const { item, effects } of withEffects) await item.updateEmbeddedDocuments("ActiveEffect", effects);
  return count;
}

export async function translateWorld() {
  if (!game.user.isGM) return;
  if (!hasTranslations()) {
    ui.notifications.warn(L("NoLanguage"));
    return;
  }
  const { counts } = collect({ descriptions: true });
  if (!counts.actors && !counts.owned && !counts.items) {
    ui.notifications.info(L("Nothing"));
    return;
  }
  const content = `<p>${L("Hint")}</p>
    <ul>
      <li>${L("CountActors", { count: counts.actors })}</li>
      <li>${L("CountOwned", { count: counts.owned })}</li>
      <li>${L("CountItems", { count: counts.items })}</li>
      <li>${L("CountEffects", { count: counts.effects })}</li>
    </ul>
    <div class="form-group"><label class="checkbox"><input type="checkbox" name="descriptions"> ${L("Descriptions")}</label></div>
    <p class="hint">${L("DescriptionsHint")}</p>
    <p><strong>${L("Backup")}</strong></p>`;
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: L("Title"), icon: "fa-solid fa-language" },
    position: { width: 480 },
    content,
    buttons: [
      {
        action: "apply", label: L("Apply"), icon: "fa-solid fa-language", default: true,
        callback: (event, button) => ({ descriptions: !!button.form.elements.descriptions?.checked })
      },
      { action: "cancel", label: L("Cancel"), icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if (!result || (typeof result !== "object")) return;
  const count = await apply(collect(result));
  ui.notifications.info(L("Done", { count }));
}

/** Settings menu entry (Configure Settings → this module). */
class TranslateWorldMenu extends foundry.applications.api.ApplicationV2 {
  /** @override */
  async render() {
    translateWorld();
    return this;
  }
}

export function registerWorldTool() {
  game.settings.registerMenu(MODULE_ID, "translateWorld", {
    name: "LHTRPG-PTBR.World.Title",
    label: "LHTRPG-PTBR.World.MenuLabel",
    hint: "LHTRPG-PTBR.World.MenuHint",
    icon: "fa-solid fa-language",
    type: TranslateWorldMenu,
    restricted: true
  });
}
