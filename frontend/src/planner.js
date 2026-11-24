import {
  RECIPES,
  MACHINES,
  fluidIngredients,
  isFluidName,
  solidIngredients,
} from "./recipeCatalog.js";
import {
  BELTS,
  PIPE_RATE,
  fluidRateScale,
  numericRate,
  rateExceeds,
  rateScale,
  requiredLanes,
  transportSettings,
} from "./transport.js";
export { BELTS, PIPE_RATE, requiredLanes } from "./transport.js";

export const recipeById = Object.fromEntries(
  RECIPES.map((recipe) => [recipe.id, recipe]),
);
export const MAX_OUTPUTS = RECIPES.length;
export const MAX_MACHINES = 1000;
export const DEFAULT_CONFIG = {
  outputs: [{ recipe: "electronic-circuit", rate: 60 }],
  assembler: "assembling-machine-2",
  electronicsMachine: "assembling",
  spaceAge: false,
  belt: "transport-belt",
  rateUnit: "items/min",
  inputStackSize: 1,
  outputStackSize: 1,
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

const machineFor = (factory) =>
  typeof factory === "string" ? MACHINES[factory] : factory;

export function canCraft(factory, recipe) {
  const machine = machineFor(factory);
  return Boolean(machine && recipe && machine.categories?.includes(recipe.category));
}

export function productivityFor(recipe, factory) {
  if (!recipe?.allowProductivity) return 0;
  return machineFor(factory)?.productivity ?? 0;
}

export function factoryFor(recipe, config = {}) {
  const override = config.machineOverrides?.[recipe.id]?.factory;
  if (override) return override;
  if (recipe.category === "smelting") return "electric-furnace";
  if (recipe.category === "chemistry") return "chemical-plant";
  const electronicsFactory = "electromagnetic-plant";
  if (
    config.spaceAge === true &&
    config.electronicsMachine === electronicsFactory &&
    canCraft(electronicsFactory, recipe)
  )
    return electronicsFactory;
  const assembler = config.assembler ?? DEFAULT_CONFIG.assembler;
  if (canCraft(assembler, recipe)) return assembler;
  if (fluidIngredients(recipe).length > 0) return "assembling-machine-2";
  return assembler;
}

// Deliberately conservative, one-item-hand transfer budgets for this layout,
// below the wiki's measured normal-quality belt transfer rates. Fluid inputs
// arrive by pipe and do not use inserters. These are planning assumptions,
// not a tick simulation: https://wiki.factorio.com/Inserters
export function craftingCapacity(recipe, factory, outputStackSize = 1) {
  return Math.min(
    (MACHINES[factory].speed * 60) / recipe.time,
    (90 * outputStackSize) /
      (recipe.results[0].amount * (1 + productivityFor(recipe, factory))),
    ...solidIngredients(recipe).map(
      (ingredient, index) => (index === 0 || index === 3 ? 90 : 45) / ingredient.amount,
    ),
  );
}

function positive(value, label, max = 100000) {
  const number = numericRate(value);
  if (!Number.isFinite(number) || number <= 0 || number > max)
    throw new Error(`${label} must be greater than 0 and at most ${max}.`);
  return number;
}

function compatibleMachineHint(recipe) {
  if (recipe.category === "smelting") return "an electric furnace";
  if (recipe.category === "chemistry") return "a chemical plant";
  if (fluidIngredients(recipe).length > 0)
    return "an assembling machine 2 or higher";
  return "an assembling machine";
}

export function validateUnit(unit, config = {}) {
  const recipe = recipeById[unit.recipe];
  if (!recipe)
    throw new Error(
      `${title(String(unit.recipe))} is not supported. Choose a recipe from the supported catalog; fluid-output and modded recipes need a different layout.`,
    );
  const machine = MACHINES[unit.factory];
  if (machine?.spaceAge && config.spaceAge !== true)
    throw new Error(`Enable Space Age to use ${machine.name}.`);
  if (!machine || !canCraft(machine, recipe))
    throw new Error(
      `${title(String(unit.factory))} cannot be used for ${recipe.name}. Use ${compatibleMachineHint(recipe)}.`,
    );
  const count = positive(unit.count, `Machine count for ${recipe.name}`, MAX_MACHINES);
  if (!Number.isInteger(count))
    throw new Error(`Machine count for ${recipe.name} must be a whole number.`);
  return {
    ...unit,
    count,
    ingredients: recipe.ingredients,
    results: recipe.results,
  };
}

export function splitCount(total, sections) {
  const base = Math.floor(total / sections);
  const remainder = total % sections;
  return Array.from({ length: sections }, (_, index) => base + (index < remainder ? 1 : 0));
}

function countDependencies(unit, producers, cache, seen = new Set()) {
  if (cache.has(unit)) return cache.get(unit);
  if (seen.has(unit)) return 0;
  const next = new Set(seen).add(unit);
  let total = 0;
  for (const ingredient of unit.ingredients) {
    const producer = producers.get(ingredient.name);
    if (producer) total += 1 + countDependencies(producer, producers, cache, next);
  }
  cache.set(unit, total);
  return total;
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
  // Place fluid-consuming branches first (shallowest dependencies first) so
  // piped runs stay close to the west entrances and within Factorio 2.0's
  // 320-tile pipeline extent limit.
  const depCache = new Map();
  const fluidUnits = units
    .filter((unit) => fluidIngredients(unit).length > 0)
    .sort(
      (a, b) =>
        countDependencies(a, producers, depCache) -
        countDependencies(b, producers, depCache),
    );
  const solidUnits = units.filter((unit) => fluidIngredients(unit).length === 0);
  [...fluidUnits, ...solidUnits].forEach(visit);
  return ordered;
}

function normalizeInput(input) {
  if (input.type === "fluid" || isFluidName(input.name))
    return { name: input.name, rate: input.rate, type: "fluid" };
  return { name: input.name, rate: input.rate };
}

function buildTransportEntry(name, rate, inputs, belt, inputStackSize, outputStackSize) {
  if (isFluidName(name)) {
    return {
      name,
      rate,
      type: "fluid",
      pipeCapacity: PIPE_RATE,
      lanes: requiredLanes(rate, PIPE_RATE),
    };
  }
  // Only external supplies use the input stack assumption. Every local
  // producer (including intermediates) uses the configured output inserter.
  const stackSize = inputs.some((input) => input.name === name)
    ? inputStackSize
    : outputStackSize;
  const laneCapacity = BELTS[belt].laneRate * stackSize;
  return {
    name,
    rate,
    stackSize,
    laneCapacity,
    beltCapacity: laneCapacity * 2,
    lanes: requiredLanes(rate, laneCapacity),
  };
}

function entryCapacity(entry) {
  return entry.type === "fluid" ? entry.pipeCapacity : entry.laneCapacity;
}

function computeTransport(units, inputs, belt, inputStackSize, outputStackSize) {
  // Merges side-load one belt lane. Budget against that lane, not the full belt.
  const traffic = new Map();
  for (const unit of units) {
    const recipe = recipeById[unit.recipe];
    const productivity = productivityFor(recipe, unit.factory);
    for (const result of unit.results || recipe.results) {
      addRate(
        traffic,
        result.name,
        unit.crafts * result.amount * (1 + productivity),
      );
    }
  }
  for (const input of inputs) addRate(traffic, input.name, input.rate);
  return [...traffic].map(([name, rate]) =>
    buildTransportEntry(name, rate, inputs, belt, inputStackSize, outputStackSize),
  );
}

function checkTransportIssue(entry, belt, reason = "") {
  const suffix = reason ? ` ${reason}` : "";
  if (entry.type === "fluid") {
    if (!rateExceeds(entry.rate, entry.pipeCapacity)) return null;
    return `${title(entry.name)} needs ${formatRate(entry.rate)}/min; this layout budgets ${formatRate(entry.pipeCapacity)}/min per pipe (1,200/s).${suffix || " Reduce the target."}`;
  }
  if (!rateExceeds(entry.rate, entry.laneCapacity)) return null;
  return `${title(entry.name)} needs ${formatRate(entry.rate)}/min; this layout allows ${formatRate(entry.laneCapacity)}/min per ${BELTS[belt].name.toLowerCase()} lane.${suffix || " Use a faster belt, increase the relevant stack size, or reduce the target."}`;
}

function unsplitReason(entry, neededSections, hasEnoughMachines) {
  if (!hasEnoughMachines) {
    return `Splitting across ${neededSections} sections requires at least ${neededSections} machines per production step.`;
  }
  const hint =
    entry.type === "fluid"
      ? " Adjust the machine counts."
      : " Adjust the machine counts, use a faster belt, or increase the stack size.";
  return `Fixed machine counts cannot be split across ${neededSections} or more parallel sections without under-sizing a section.${hint}`;
}

export function finishPlan(units, inputs, outputs, config = {}) {
  const { belt, rateUnit, inputStackSize, outputStackSize, spaceAge } = transportSettings(config);
  const effectiveConfig = { ...config, spaceAge };
  const layoutMode = config.layoutMode ?? DEFAULT_CONFIG.layoutMode;
  if (!["standard", "compact"].includes(layoutMode))
    throw new Error("Choose a standard or compact layout.");
  const maxMachines = Number(config.maxMachines ?? 200);
  const ordered = orderedUnits(units.map((unit) => validateUnit(unit, effectiveConfig)));
  const normalizedInputs = inputs.map(normalizeInput);
  const machineCount = ordered.reduce((sum, unit) => sum + unit.count, 0);
  if (!machineCount) throw new Error("Add at least one production step.");
  const issues = [];
  const rawTransport = computeTransport(
    ordered,
    normalizedInputs,
    belt,
    inputStackSize,
    outputStackSize,
  );
  const neededSections = Math.max(1, ...rawTransport.map((entry) => entry.lanes));
  const hasExplicitSplit =
    neededSections > 1 &&
    ordered.every(
      (unit) =>
        Array.isArray(unit.sectionCounts) &&
        unit.sectionCounts.length === neededSections &&
        unit.sectionCounts.every((count) => count >= 1),
    );
  let sections = neededSections;
  if (sections === 1) {
    for (const unit of ordered) {
      if (!unit.sectionCounts) unit.sectionCounts = [unit.count];
    }
  } else if (!hasExplicitSplit) {
    // Fixed-count callers (Helmod or direct finishPlan) feed every parallel
    // section at 1/count of the total rate, so each unit's smallest integer
    // slice must cover 1/count of its crafts within single-lane/pipe limits.
    const canSplitAt = (count) => {
      if (
        !ordered.every((unit) => {
          const minSlice = Math.floor(unit.count / count);
          if (minSlice < 1) return false;
          const sliceCapacity =
            minSlice *
            craftingCapacity(recipeById[unit.recipe], unit.factory, outputStackSize);
          return !rateExceeds(unit.crafts / count, sliceCapacity);
        })
      )
        return false;
      return rawTransport.every(
        (entry) => !rateExceeds(entry.rate / count, entryCapacity(entry)),
      );
    };
    const minUnitCount = Math.min(...ordered.map((unit) => unit.count));
    let resolved = null;
    for (let candidate = neededSections; candidate <= minUnitCount; candidate++) {
      if (canSplitAt(candidate)) {
        resolved = candidate;
        break;
      }
    }
    if (resolved !== null) {
      sections = resolved;
      for (const unit of ordered) {
        unit.sectionCounts = splitCount(unit.count, sections);
      }
    } else if (config.sections === undefined) {
      const hasEnoughMachines = ordered.every(
        (unit) => unit.count >= neededSections,
      );
      for (const entry of rawTransport) {
        const reason = unsplitReason(entry, neededSections, hasEnoughMachines);
        const issue = checkTransportIssue(entry, belt, reason);
        if (issue) issues.push(issue);
      }
      sections = 1;
      for (const unit of ordered) {
        unit.sectionCounts = [unit.count];
      }
    }
  }
  const transport = rawTransport.map((entry) => ({
    ...entry,
    perSectionRate: entry.rate / sections,
  }));
  const bottlenecks =
    sections > 1
      ? transport
          .filter((entry) => entry.lanes > 1)
          .sort(
            (a, b) =>
              b.rate / entryCapacity(b) - a.rate / entryCapacity(a),
          )
      : [];
  if (!Number.isInteger(maxMachines) || maxMachines < 1 || maxMachines > MAX_MACHINES)
    issues.push(`Machine budget must be a whole number between 1 and ${MAX_MACHINES}.`);
  if (machineCount > maxMachines)
    issues.push(
      sections > 1
        ? `This line needs ${machineCount} machines across ${sections} parallel sections; your budget is ${maxMachines}. Reduce the target, use a faster belt, or increase the budget.`
        : `This line needs ${machineCount} machines; your budget is ${maxMachines}. Reduce the target or increase the budget.`,
    );
  for (const input of normalizedInputs) {
    const raw = config.inputLimits?.[input.name];
    if (raw === undefined || raw === "") continue;
    const scale = input.type === "fluid"
      ? fluidRateScale(rateUnit)
      : rateScale(rateUnit, belt, inputStackSize);
    const limit = numericRate(raw) * scale;
    if (!Number.isFinite(limit) || limit < 0) {
      issues.push(
        `Supply limit for ${title(input.name)} must be 0 or greater.`,
      );
      continue;
    }
    if (rateExceeds(input.rate, limit))
      issues.push(
        `${title(input.name)} needs ${formatRate(input.rate)}/min, but only ${formatRate(limit)}/min is available.`,
      );
  }
  const hasFluids = normalizedInputs.some((input) => input.type === "fluid");
  return {
    units: ordered,
    inputs: normalizedInputs,
    outputs,
    machineCount,
    belt,
    inputStackSize,
    outputStackSize,
    transport,
    sections,
    bottlenecks,
    layoutMode,
    issues,
    warnings: [
      `Sizing includes conservative inserter budgets (90 items/min for fast, 45 for long-handed${outputStackSize > 1 ? `, ${90 * outputStackSize} for stack outputs` : ""}). Normal quality, no modules. Actual belt loading can affect throughput; verify the line in Factorio.`,
      ...(sections > 1
        ? [`Split into ${sections} parallel sections so every ${BELTS[belt].name.toLowerCase()} lane${hasFluids ? " and pipe" : ""} stays within capacity. Feed each section's west entrances at 1/${sections} of the total rate.`]
        : []),
      ...(hasFluids
        ? ["Fluid ingredients are supplied by pipe (budgeted at 1,200 fluid/s per pipe). Connect each marked fluid pipe entrance."] : []),
      ...(belt === "turbo-transport-belt"
        ? ["Green belts require Turbo transport belt research."] : []),
      ...(inputStackSize > 1 ? [`Supply every external input in stacks of at least ${inputStackSize} items. The blueprint does not stack incoming supplies.`] : []),
      ...(outputStackSize > 1 ? [`Stack inserters load all machine outputs, including intermediates, in batches of ${outputStackSize}. Requires ${["", "", "Stack inserter", "Transport belt capacity 1", "Transport belt capacity 2"][outputStackSize]} research or higher. Allow time for full batches at startup.`] : []),
    ],
  };
}

export function formatRate(value) {
  if (value !== 0 && Math.abs(value) < 0.01)
    return value.toLocaleString("en-US", { maximumSignificantDigits: 3 });
  return Number(value.toFixed(2)).toLocaleString("en-US");
}

export function planProduction(config) {
  const { belt, rateUnit, inputStackSize, outputStackSize, spaceAge } = transportSettings(config);
  const effectiveConfig = { ...config, spaceAge };
  if (
    !Array.isArray(config.outputs) ||
    !config.outputs.length ||
    config.outputs.length > MAX_OUTPUTS
  )
    throw new Error(`Choose between 1 and ${MAX_OUTPUTS} output targets.`);
  if (
    !MACHINES[config.assembler] ||
    !MACHINES[config.assembler].categories?.includes("crafting")
  )
    throw new Error("Choose an assembling machine tier.");
  const demand = new Map(),
    factories = new Map(),
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
    const factory = factoryFor(recipe, effectiveConfig);
    const machine = MACHINES[factory];
    if (machine?.spaceAge && !spaceAge)
      throw new Error(`Enable Space Age to use ${machine.name}.`);
    if (!machine || !canCraft(machine, recipe))
      throw new Error(`Select a compatible machine for ${recipe.name}.`);
    const crafts = rate /
      (recipe.results[0].amount * (1 + productivityFor(recipe, factory)));
    addRate(demand, name, crafts);
    factories.set(name, factory);
    const next = new Set(stack).add(name);
    for (const ingredient of recipe.ingredients)
      requireItem(ingredient.name, crafts * ingredient.amount, next);
  }
  for (const output of config.outputs) {
    if (!output || !Object.hasOwn(recipeById, output.recipe))
      throw new Error("Choose an output from the supported recipe catalog.");
    const rate = positive(numericRate(output.rate) * rateScale(rateUnit, belt, outputStackSize), "Output rate (items/min)");
    addRate(targets, output.recipe, rate);
  }
  // A requested output that is also an intermediate must be produced locally.
  for (const item of targets.keys()) supplied.delete(item);
  for (const [name, rate] of targets) requireItem(name, rate, new Set(), true);
  const externalInputs = [...external].map(([name, rate]) =>
    normalizeInput({ name, rate }),
  );
  const preliminaryUnits = [...demand].map(([recipeId, crafts]) => ({
    recipe: recipeId,
    factory: factories.get(recipeId) || factoryFor(recipeById[recipeId], effectiveConfig),
    crafts,
  }));
  const preliminaryTransport = computeTransport(
    preliminaryUnits,
    externalInputs,
    belt,
    inputStackSize,
    outputStackSize,
  );
  const sections = Math.max(
    1,
    ...preliminaryTransport.map((entry) => entry.lanes),
  );
  const units = [...demand].map(([recipeId, crafts]) => {
    const recipe = recipeById[recipeId];
    const override = config.machineOverrides?.[recipeId] || {};
    const factory = factories.get(recipeId) || factoryFor(recipe, effectiveConfig);
    const machine = MACHINES[factory];
    if (!machine || !canCraft(machine, recipe))
      throw new Error(`Select a compatible machine for ${recipe.name}.`);
    const perSectionRequired = Math.max(
      1,
      Math.ceil(
        crafts / sections / craftingCapacity(recipe, factory, outputStackSize) -
          1e-9,
      ),
    );
    const required = perSectionRequired * sections;
    const isAuto = override.count === undefined || override.count === "";
    let count = isAuto ? required : Number(override.count);
    if (isAuto && count > MAX_MACHINES) {
      const sectionText =
        sections > 1 ? ` across ${sections} parallel sections` : "";
      issues.push(
        `${recipe.name} needs ${required} ${machine.name.toLowerCase()} machines${sectionText} (maximum ${MAX_MACHINES}). Reduce the target or use faster machines or belts.`,
      );
      count = MAX_MACHINES;
    } else if (!Number.isInteger(count) || count < 1 || count > MAX_MACHINES) {
      issues.push(
        `Machine count for ${recipe.name} must be a whole number between 1 and ${MAX_MACHINES}.`,
      );
      count = Math.min(required, MAX_MACHINES);
    } else if (count < required) {
      issues.push(
        sections > 1
          ? `${recipe.name} needs at least ${required} ${machine.name.toLowerCase()} machines (${perSectionRequired} per section across ${sections} sections) for this target.`
          : `${recipe.name} needs at least ${required} ${machine.name.toLowerCase()} machines for this target.`,
      );
    }
    const sectionCounts = count >= sections ? splitCount(count, sections) : undefined;
    return {
      recipe: recipeId,
      factory,
      count,
      crafts,
      required,
      perSectionRequired,
      ...(sectionCounts ? { sectionCounts } : {}),
      utilization: (crafts * recipe.time) / (machine.speed * 60 * count),
    };
  });
  const plan = finishPlan(
    units,
    externalInputs,
    [...targets].map(([name, rate]) => ({ name, rate })),
    { ...effectiveConfig, sections },
  );
  plan.issues.push(...issues);
  return plan;
}
