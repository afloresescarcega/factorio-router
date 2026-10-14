import {
  canCraft,
  craftingCapacity,
  DEFAULT_CONFIG,
  factoryFor,
  planProduction,
  productivityFor,
  recipeById,
} from "./planner.js";
import { createLayout } from "./layout.js";

const plan = (patch) => planProduction({ ...DEFAULT_CONFIG, ...patch });
const rate = (items, name) => items.find((item) => item.name === name)?.rate;

test("sizes a circuit line from recipe times and expands cable demand", () => {
  const result = plan({});
  expect(result.issues).toEqual([]);
  expect(result.units.map((unit) => unit.recipe)).toEqual([
    "copper-cable",
    "electronic-circuit",
  ]);
  expect(rate(result.inputs, "copper-plate")).toBe(90);
  expect(rate(result.inputs, "iron-plate")).toBe(60);
  expect(result.units.map((unit) => unit.count)).toEqual([2, 4]);
});

test("catalog uses Space Age recipe categories and machine metadata", () => {
  expect(recipeById["copper-cable"].category).toBe("electronics");
  expect(recipeById["transport-belt"].category).toBe("pressing");
  expect(recipeById["iron-plate"].category).toBe("smelting");
  expect(recipeById["assembling-machine-3"].ingredients).toEqual([
    { name: "assembling-machine-2", amount: 2 },
    { name: "speed-module", amount: 4 },
  ]);
  expect(factoryFor(recipeById["copper-cable"], DEFAULT_CONFIG)).toBe(
    "assembling-machine-2",
  );
  expect(
    factoryFor(recipeById["copper-cable"], {
      ...DEFAULT_CONFIG,
      spaceAge: true,
      electronicsMachine: "electromagnetic-plant",
    }),
  ).toBe("electromagnetic-plant");
  expect(canCraft("electromagnetic-plant", recipeById["copper-cable"])).toBe(
    true,
  );
  expect(canCraft("electromagnetic-plant", recipeById["transport-belt"])).toBe(
    false,
  );
});

test("sizes EM plant production with recipe productivity and transfer limits", () => {
  const result = plan({
    spaceAge: true,
    electronicsMachine: "electromagnetic-plant",
    outputs: [{ recipe: "electronic-circuit", rate: 60 }],
  });
  const circuit = result.units.find((unit) => unit.recipe === "electronic-circuit");
  expect(circuit.factory).toBe("electromagnetic-plant");
  expect(circuit.crafts).toBeCloseTo(40);
  // The 45/min cable input hand-capacity is the limiting inserter bound.
  expect(craftingCapacity(recipeById["electronic-circuit"], circuit.factory)).toBe(15);
  expect(circuit.required).toBe(3);
  expect(circuit.count).toBe(3);
  expect(rate(result.transport, "copper-cable")).toBe(120);
  expect(rate(result.transport, "electronic-circuit")).toBe(60);
  expect(rate(result.inputs, "copper-plate")).toBe(40);
});

test("productivity applies only to recipes that allow it", () => {
  expect(productivityFor(recipeById["copper-cable"], "electromagnetic-plant")).toBe(0.5);
  expect(productivityFor(recipeById["medium-electric-pole"], "electromagnetic-plant")).toBe(0);
  const result = plan({
    spaceAge: true,
    electronicsMachine: "electromagnetic-plant",
    outputs: [{ recipe: "medium-electric-pole", rate: 60 }],
  });
  const pole = result.units.find((unit) => unit.recipe === "medium-electric-pole");
  expect(pole.factory).toBe("electromagnetic-plant");
  expect(pole.crafts).toBe(60);
});

test("layout mode defaults to standard and does not change production sizing", () => {
  const standard = plan({});
  const compact = plan({ layoutMode: "compact" });
  expect(standard.layoutMode).toBe("standard");
  expect(compact).toEqual({ ...standard, layoutMode: "compact" });
  expect(plan({ layoutMode: undefined }).layoutMode).toBe("standard");
  expect(() => plan({ layoutMode: "unknown" })).toThrow(
    /standard or compact layout/,
  );
});

test("merges shared intermediate demand and preserves requested surplus output", () => {
  const result = plan({
    outputs: [
      { recipe: "electronic-circuit", rate: 60 },
      { recipe: "copper-cable", rate: 120 },
    ],
  });
  expect(
    result.units.find((unit) => unit.recipe === "copper-cable").crafts,
  ).toBe(150);
  expect(rate(result.inputs, "copper-plate")).toBe(150);
  expect(rate(result.outputs, "copper-cable")).toBe(120);
});

test("supports supplying intermediates and starting with ore", () => {
  const supplied = plan({ externalItems: ["copper-cable"] });
  expect(supplied.units).toHaveLength(1);
  expect(rate(supplied.inputs, "copper-cable")).toBe(180);
  const ore = plan({ fromOre: true });
  expect(
    ore.units.filter((unit) => unit.factory === "electric-furnace"),
  ).toHaveLength(2);
  expect(rate(ore.inputs, "iron-ore")).toBe(60);
  expect(rate(ore.inputs, "copper-ore")).toBe(90);
});

test("output order does not affect shared producers when auto-expansion is disabled", () => {
  const outputs = [
    { recipe: "electronic-circuit", rate: 60 },
    { recipe: "copper-cable", rate: 60 },
  ];
  const a = plan({ intermediates: false, outputs });
  const b = plan({ intermediates: false, outputs: [...outputs].reverse() });
  expect(a.units.map((unit) => [unit.recipe, unit.crafts])).toEqual(
    b.units.map((unit) => [unit.recipe, unit.crafts]),
  );
  expect(rate(a.inputs, "copper-cable")).toBeUndefined();
  expect(rate(a.inputs, "copper-plate")).toBe(120);
});

test("blocks export for supply, belt, and machine constraints", () => {
  for (const patch of [
    { inputLimits: { "iron-plate": 0 } },
    { maxMachines: 1 },
    { outputs: [{ recipe: "electronic-circuit", rate: 300 }] },
  ]) {
    const result = plan(patch);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(() => createLayout(result)).toThrow();
  }
  expect(
    plan({
      outputs: [{ recipe: "electronic-circuit", rate: 300 }],
      belt: "express-transport-belt",
    }).issues,
  ).toEqual([]);
});

test("machine overrides use their own crafting speed and remain editable when invalid", () => {
  const result = plan({
    outputs: [{ recipe: "electronic-circuit", rate: 180 }],
    belt: "fast-transport-belt",
    machineOverrides: {
      "electronic-circuit": { factory: "assembling-machine-1", count: 2 },
    },
  });
  expect(
    result.units.find((unit) => unit.recipe === "electronic-circuit").required,
  ).toBe(12);
  expect(result.issues.join()).toMatch(/needs at least 12/);
  expect(
    plan({ machineOverrides: { "copper-cable": { count: -1 } } }).issues.join(),
  ).toMatch(/whole number/);
});

test.each([0, -1, "", Infinity, NaN, "bad"])(
  "rejects invalid output rate %j without generating entities",
  (value) => {
    expect(() =>
      plan({ outputs: [{ recipe: "electronic-circuit", rate: value }] }),
    ).toThrow(/Output rate/);
  },
);

test("rejects unsupported recipes and machine categories", () => {
  expect(() =>
    plan({ outputs: [{ recipe: "sulfuric-acid", rate: 60 }] }),
  ).toThrow(/supported recipe/);
  expect(() => plan({ assembler: "stone-furnace" })).toThrow(
    /assembling machine/,
  );
});

test("rejects Space Age machines and transport settings while Space Age is off", () => {
  expect(() =>
    plan({
      machineOverrides: {
        "electronic-circuit": { factory: "electromagnetic-plant" },
      },
    }),
  ).toThrow(/Enable Space Age to use Electromagnetic plant/);
  expect(() => plan({ belt: "turbo-transport-belt" })).toThrow(
    /Enable Space Age/,
  );
  expect(() => plan({ inputStackSize: 2 })).toThrow(/Enable Space Age/);
  expect(() => plan({ outputStackSize: 2 })).toThrow(/Enable Space Age/);
});

test("every production plan conserves materials at its target crafting rate", () => {
  const result = plan({
    outputs: [
      { recipe: "logistic-science-pack", rate: 30 },
      { recipe: "automation-science-pack", rate: 30 },
    ],
    fromOre: true,
    spaceAge: true,
    electronicsMachine: "electromagnetic-plant",
  });
  const balance = new Map(result.inputs.map((item) => [item.name, item.rate]));
  for (const unit of result.units) {
    const recipe = recipeById[unit.recipe];
    for (const item of recipe.ingredients)
      balance.set(
        item.name,
        (balance.get(item.name) || 0) - item.amount * unit.crafts,
      );
    for (const item of recipe.results)
      balance.set(
        item.name,
        (balance.get(item.name) || 0) +
          item.amount * unit.crafts * (1 + productivityFor(recipe, unit.factory)),
      );
  }
  for (const item of result.outputs)
    balance.set(item.name, balance.get(item.name) - item.rate);
  for (const amount of balance.values()) expect(amount).toBeCloseTo(0, 8);
});
