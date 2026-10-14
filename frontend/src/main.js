// Optional Helmod adapter. All callers use the same planner and layout engine.
import { HelmodFactory } from "./helmodFactory.js";
import { encodeBlueprint } from "./blueprintFactory.js";
import { MACHINES } from "./recipeCatalog.js";
import {
  validateUnit,
  finishPlan,
  recipeById,
  craftingCapacity,
  productivityFor,
} from "./planner.js";
import { createLayout } from "./layout.js";
import { transportSettings } from "./transport.js";

export function planHelmodString(helmodString, config = {}) {
  let data;
  try {
    data = HelmodFactory.decodeHelmod(helmodString);
  } catch {
    throw new Error(
      "Invalid Helmod export. Paste the complete production-line export string.",
    );
  }
  let usesSpaceAgeFactory = false;
  let ignoredSettings = false;
  // Helmod writes placeholder beacons with count 0 and empty module maps for
  // every recipe. Only entries with a positive (or unknown) count are in use.
  const inUse = (value) => {
    if (value === undefined || value === null || value === false || value === "")
      return false;
    if (typeof value === "number") return value > 0;
    if (typeof value !== "object") return true;
    if (!Array.isArray(value) && "count" in value) return Number(value.count) > 0;
    return Object.values(value).some(inUse);
  };
  function inspectNode(node) {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      const normalized = key.toLowerCase();
      if (["module", "modules", "beacon", "beacons"].includes(normalized) && inUse(value))
        ignoredSettings = true;
      if (
        normalized === "quality" &&
        value !== undefined &&
        value !== null &&
        String(value).toLowerCase() !== "normal"
      )
        ignoredSettings = true;
      if (value && typeof value === "object")
        for (const child of Array.isArray(value) ? value : Object.values(value))
          inspectNode(child);
    }
    if (
      node.type === "recipe" &&
      node.factory?.name &&
      MACHINES[node.factory.name]?.spaceAge
    )
      usesSpaceAgeFactory = true;
  }
  inspectNode(data);
  // An import with an SA machine or transport setting opts into the matching
  // game requirement so the imported line can be reviewed and edited.
  const effectiveConfig = {
    ...config,
    spaceAge: Boolean(
      config.spaceAge ||
      usesSpaceAgeFactory ||
      config.belt === "turbo-transport-belt" ||
      Number(config.inputStackSize ?? 1) > 1 ||
      Number(config.outputStackSize ?? 1) > 1
    ),
  };
  const { outputStackSize } = transportSettings(effectiveConfig);
  const byRecipe = new Map();
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "recipe" && node.name && node.factory?.name) {
      const rawCount = Number(node.factory.count);
      if (!Number.isFinite(rawCount) || rawCount <= 0 || rawCount > 200)
        throw new Error(
          `Invalid machine count for ${node.name}. Use a finite count greater than 0 and at most 200.`,
        );
      const unit = validateUnit(
        {
          recipe: node.name,
          factory: node.factory.name,
          count: Math.ceil(rawCount),
        },
        effectiveConfig,
      );
      const previous = byRecipe.get(unit.recipe);
      if (previous && previous.factory !== unit.factory)
        throw new Error(`Use one machine tier per recipe: ${unit.recipe}.`);
      byRecipe.set(unit.recipe, {
        ...unit,
        count: unit.count + (previous?.count || 0),
      });
    }
    for (const value of Object.values(node)) walk(value);
  }
  walk(data);
  if (!byRecipe.size)
    throw new Error("No recipes with factories found in the Helmod data.");
  const balance = new Map();
  const units = [...byRecipe.values()].map((unit) => {
    const recipe = recipeById[unit.recipe];
    const crafts = unit.count * craftingCapacity(recipe, unit.factory, outputStackSize);
    const outputMultiplier = 1 + productivityFor(recipe, unit.factory);
    for (const result of unit.results)
      balance.set(
        result.name,
        (balance.get(result.name) || 0) + result.amount * crafts * outputMultiplier,
      );
    for (const ingredient of unit.ingredients)
      balance.set(
        ingredient.name,
        (balance.get(ingredient.name) || 0) - ingredient.amount * crafts,
      );
    return {
      ...unit,
      crafts,
      utilization:
        (crafts * recipe.time) /
        (MACHINES[unit.factory].speed * 60 * unit.count),
      required: unit.count,
    };
  });
  const inputs = [],
    outputs = [];
  for (const [name, rate] of balance) {
    if (rate < -1e-6) {
      if (units.some((unit) => unit.results[0].name === name))
        throw new Error(
          `Imported machines cannot supply enough ${name}. Rebalance the machine counts in Helmod or use the in-app output planner.`,
        );
      inputs.push({ name, rate: -rate });
    }
    if (rate > 1e-6) outputs.push({ name, rate });
  }
  if (!outputs.length)
    throw new Error("This production line has no net item output.");
  const plan = finishPlan(units, inputs, outputs, effectiveConfig);
  plan.spaceAge = effectiveConfig.spaceAge;
  if (ignoredSettings)
    plan.warnings.push(
      "Helmod modules, beacons, and non-normal quality settings were ignored; the imported rates use normal quality without modules or beacons.",
    );
  return plan;
}

export function processHelmodString(helmodString, config = {}) {
  const plan = planHelmodString(helmodString, config);
  return encodeBlueprint(createLayout(plan).blueprint);
}
