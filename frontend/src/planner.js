import { RECIPES, MACHINES } from "./recipeCatalog.js";

export const recipeById = Object.fromEntries(
  RECIPES.map((recipe) => [recipe.id, recipe]),
);
export const BELTS = {
  "transport-belt": {
    name: "Yellow belt",
    underground: "underground-belt",
    splitter: "splitter",
    laneRate: 450,
  },
  "fast-transport-belt": {
    name: "Red belt",
    underground: "fast-underground-belt",
    splitter: "fast-splitter",
    laneRate: 900,
  },
  "express-transport-belt": {
    name: "Blue belt",
    underground: "express-underground-belt",
    splitter: "express-splitter",
    laneRate: 1350,
  },
};
export const DEFAULT_CONFIG = {
  outputs: [{ recipe: "electronic-circuit", rate: 60 }],
  assembler: "assembling-machine-2",
  belt: "transport-belt",
  layoutMode: "standard",
  maxMachines: 200,
  intermediates: true,
  fromOre: false,
  externalItems: [],
  inputLimits: {},
  machineOverrides: {},
};
export const title = (id) =>
  id.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
const addRate = (map, name, rate) => map.set(name, (map.get(name) || 0) + rate);

// Deliberately conservative, one-item-hand transfer budgets for this layout,
// below the wiki's measured normal-quality belt transfer rates. These are
// planning assumptions, not a tick simulation: https://wiki.factorio.com/Inserters
export function craftingCapacity(recipe, factory) {
  return Math.min(
    (MACHINES[factory].speed * 60) / recipe.time,
    90 / recipe.results[0].amount,
    ...recipe.ingredients.map(
      (ingredient, index) => (index === 0 ? 90 : 45) / ingredient.amount,
    ),
  );
}

function positive(value, label, max = 100000) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > max)
    throw new Error(`${label} must be greater than 0 and at most ${max}.`);
  return number;
}

export function validateUnit(unit) {
  const recipe = recipeById[unit.recipe];
  if (!recipe)
    throw new Error(
      `${title(String(unit.recipe))} is not supported. Choose a recipe from the solid-item catalog; fluids and modded recipes need a different layout.`,
    );
  const machine = MACHINES[unit.factory];
  if (!machine || machine.category !== recipe.category)
    throw new Error(
      `${title(String(unit.factory))} cannot be used for ${recipe.name}. Use ${recipe.category === "smelting" ? "an electric furnace" : "an assembling machine"}.`,
    );
  const count = positive(unit.count, `Machine count for ${recipe.name}`, 200);
  if (!Number.isInteger(count))
    throw new Error(`Machine count for ${recipe.name} must be a whole number.`);
  return {
    ...unit,
    count,
    ingredients: recipe.ingredients,
    results: recipe.results,
  };
}

function orderedUnits(units) {
  const producers = new Map(units.map((unit) => [unit.results[0].name, unit]));
  if (producers.size !== units.length)
    throw new Error("Combine duplicate recipes into one production step.");
  const ordered = [],
    visited = new Set(),
    visiting = new Set();
  function visit(unit) {
    if (visiting.has(unit))
      throw new Error("Recipe cycles are not supported by this layout.");
    if (visited.has(unit)) return;
    visiting.add(unit);
    for (const ingredient of unit.ingredients)
      if (producers.has(ingredient.name)) visit(producers.get(ingredient.name));
    visiting.delete(unit);
    visited.add(unit);
    ordered.push(unit);
  }
  units.forEach(visit);
  return ordered;
}

export function finishPlan(units, inputs, outputs, config = {}) {
  const belt = config.belt || DEFAULT_CONFIG.belt;
  if (!BELTS[belt]) throw new Error("Choose a supported belt tier.");
  const layoutMode = config.layoutMode ?? DEFAULT_CONFIG.layoutMode;
  if (!["standard", "compact"].includes(layoutMode))
    throw new Error("Choose a standard or compact layout.");
  const maxMachines = Number(config.maxMachines ?? 200);
  const ordered = orderedUnits(units.map(validateUnit));
  const machineCount = ordered.reduce((sum, unit) => sum + unit.count, 0);
  if (!machineCount) throw new Error("Add at least one production step.");
  const issues = [];
  if (!Number.isInteger(maxMachines) || maxMachines < 1 || maxMachines > 200)
    issues.push("Machine budget must be a whole number between 1 and 200.");
  if (machineCount > maxMachines)
    issues.push(
      `This line needs ${machineCount} machines; your budget is ${maxMachines}. Reduce the target or increase the budget.`,
    );
  for (const input of inputs) {
    const raw = config.inputLimits?.[input.name];
    if (raw === undefined || raw === "") continue;
    const limit = Number(raw);
    if (!Number.isFinite(limit) || limit < 0) {
      issues.push(
        `Supply limit for ${title(input.name)} must be 0 or greater.`,
      );
      continue;
    }
    if (input.rate > limit + 1e-6)
      issues.push(
        `${title(input.name)} needs ${formatRate(input.rate)}/min, but only ${formatRate(limit)}/min is available.`,
      );
  }
  // Merges side-load one belt lane. Budget against that lane, not the full belt.
  const traffic = new Map();
  for (const unit of ordered)
    for (const result of unit.results)
      addRate(traffic, result.name, unit.crafts * result.amount);
  for (const input of inputs) addRate(traffic, input.name, input.rate);
  for (const [name, rate] of traffic)
    if (rate > BELTS[belt].laneRate + 1e-6)
      issues.push(
        `${title(name)} needs ${formatRate(rate)}/min; this layout allows ${BELTS[belt].laneRate}/min per ${BELTS[belt].name.toLowerCase()} lane. Use a faster belt or reduce the target.`,
      );
  return {
    units: ordered,
    inputs,
    outputs,
    machineCount,
    belt,
    layoutMode,
    issues,
    warnings: [
      "Sizing includes conservative inserter budgets (90 items/min for fast, 45 for long-handed). Normal quality, no modules. Actual belt loading can affect throughput; verify the line in Factorio.",
    ],
  };
}

export function formatRate(value) {
  return Number(value.toFixed(2)).toLocaleString("en-US");
}

export function planProduction(config) {
  if (
    !Array.isArray(config.outputs) ||
    !config.outputs.length ||
    config.outputs.length > 20
  )
    throw new Error("Choose between 1 and 20 output targets.");
  if (
    !MACHINES[config.assembler] ||
    MACHINES[config.assembler].category !== "crafting"
  )
    throw new Error("Choose an assembling machine tier.");
  const demand = new Map(),
    external = new Map(),
    targets = new Map(),
    issues = [];
  const supplied = new Set(config.externalItems || []);
  if (!config.fromOre)
    ["iron-plate", "copper-plate", "steel-plate", "stone-brick"].forEach(
      (item) => supplied.add(item),
    );

  function requireItem(name, rate, stack = new Set(), isTarget = false) {
    const recipe = recipeById[name];
    const build =
      isTarget ||
      targets.has(name) ||
      (config.intermediates && recipe && !supplied.has(name));
    if (!build) {
      addRate(external, name, rate);
      return;
    }
    if (!recipe)
      throw new Error(`${title(name)} is not in the supported recipe catalog.`);
    if (stack.has(name)) throw new Error(`Recipe cycle at ${recipe.name}.`);
    addRate(demand, name, rate / recipe.results[0].amount);
    const next = new Set(stack).add(name);
    for (const ingredient of recipe.ingredients)
      requireItem(
        ingredient.name,
        (rate * ingredient.amount) / recipe.results[0].amount,
        next,
      );
  }
  for (const output of config.outputs) {
    if (!recipeById[output.recipe])
      throw new Error("Choose an output from the supported recipe catalog.");
    const rate = positive(output.rate, "Output rate");
    addRate(targets, output.recipe, rate);
  }
  // A requested output that is also an intermediate must be produced locally.
  for (const item of targets.keys()) supplied.delete(item);
  for (const [name, rate] of targets) requireItem(name, rate, new Set(), true);
  const units = [...demand].map(([recipeId, crafts]) => {
    const recipe = recipeById[recipeId];
    const override = config.machineOverrides?.[recipeId] || {};
    const factory =
      override.factory ||
      (recipe.category === "smelting" ? "electric-furnace" : config.assembler);
    const machine = MACHINES[factory];
    if (!machine || machine.category !== recipe.category)
      throw new Error(`Select a compatible machine for ${recipe.name}.`);
    const required = Math.max(
      1,
      Math.ceil(crafts / craftingCapacity(recipe, factory) - 1e-9),
    );
    let count =
      override.count === undefined || override.count === ""
        ? required
        : Number(override.count);
    if (!Number.isInteger(count) || count < 1 || count > 200) {
      issues.push(
        `Machine count for ${recipe.name} must be a whole number between 1 and 200.`,
      );
      count = Math.min(required, 200);
    }
    if (count < required)
      issues.push(
        `${recipe.name} needs at least ${required} ${machine.name.toLowerCase()} machines for this target.`,
      );
    return {
      recipe: recipeId,
      factory,
      count,
      crafts,
      required,
      utilization: (crafts * recipe.time) / (machine.speed * 60 * count),
    };
  });
  const plan = finishPlan(
    units,
    [...external].map(([name, rate]) => ({ name, rate })),
    [...targets].map(([name, rate]) => ({ name, rate })),
    config,
  );
  plan.issues.push(...issues);
  return plan;
}
