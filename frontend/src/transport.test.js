import { RECIPES } from "./recipeCatalog.js";
import { DEFAULT_CONFIG, MAX_OUTPUTS, craftingCapacity, formatRate, planProduction, recipeById } from "./planner.js";
import { BELTS, RATE_UNITS, convertRateUnit, rateScale, transportSettings } from "./transport.js";
import { createLayout } from "./layout.js";

const plan = (patch) => planProduction({ ...DEFAULT_CONFIG, ...patch });
const outputs = (recipe, rate) => [{ recipe, rate }];

test("Wube's four belt tiers have the expected full-belt throughput", () => {
  expect(Object.keys(BELTS).map((belt) => rateScale("belts", belt, 1) / 60)).toEqual([15, 30, 45, 60]);
  expect(Object.keys(BELTS).map((belt) => rateScale("belts", belt, 4) / 60)).toEqual([60, 120, 180, 240]);
});

test("small belt fractions remain visible instead of rounding to zero", () => {
  expect(formatRate(60 / 14400)).toBe("0.00417");
  expect(formatRate(0)).toBe("0");
  expect(formatRate(7200)).toBe("7,200");
});

test("floating-point tolerances do not accept zero supply or a deliberate tiny overload", () => {
  expect(plan({ outputs: outputs("copper-cable", 1e-8), inputLimits: { "copper-plate": 0 } }).issues.join()).toMatch(/only 0\/min/);
  expect(plan({ outputs: outputs("copper-cable", 450 + 1e-7) }).issues.join()).toMatch(/one lane/);
});

test("stack changes recalculate automatic counts and still reject insufficient manual counts", () => {
  const config = { belt: "turbo-transport-belt", outputs: outputs("copper-cable", 720) };
  expect(plan(config).units[0].count).toBe(8);
  expect(plan({ ...config, outputStackSize: 4 }).units[0].count).toBe(4);
  expect(plan({ ...config, outputStackSize: 4, machineOverrides: { "copper-cable": { count: 3 } } }).issues.join()).toMatch(/needs at least 4/);
  expect(plan({ ...config, inputStackSize: 4 }).units[0].count).toBe(8);
});

test.each(Object.keys(BELTS))("%s: every stack pairing and unit obeys both independent lane limits", (belt) => {
  for (let inputStackSize = 1; inputStackSize <= 4; inputStackSize++) {
    for (let outputStackSize = 1; outputStackSize <= 4; outputStackSize++) {
      for (const rateUnit of RATE_UNITS) {
        // Cable produces two items from one plate. Either side can bottleneck.
        const maximum = Math.min(BELTS[belt].laneRate * inputStackSize * 2, BELTS[belt].laneRate * outputStackSize);
        const scale = rateScale(rateUnit, belt, outputStackSize);
        const config = { belt, inputStackSize, outputStackSize, rateUnit, outputs: outputs("copper-cable", maximum / scale) };
        const valid = plan(config);
        expect(valid.issues, JSON.stringify(config)).toEqual([]);
        expect(valid.outputs[0].rate).toBeCloseTo(maximum, 7);
        expect(valid.inputs[0].rate).toBeCloseTo(maximum / 2, 7);
        const invalid = plan({ ...config, outputs: outputs("copper-cable", (maximum + 0.01) / scale) });
        expect(invalid.issues.join(" ")).toMatch(/one lane/);
        expect(() => createLayout(invalid)).toThrow();
      }
    }
  }
});

test("stacked inputs do not grant stacked capacity to intermediate producers", () => {
  const config = { inputStackSize: 4, outputs: outputs("electronic-circuit", 200) };
  const invalid = plan(config);
  expect(invalid.issues.join()).toMatch(/Copper cable needs 600\/min/);
  expect(plan({ ...config, outputStackSize: 2 }).issues).toEqual([]);
  const supplied = plan({ ...config, externalItems: ["copper-cable"] });
  expect(supplied.issues).toEqual([]);
  expect(supplied.transport.find((item) => item.name === "copper-cable").stackSize).toBe(4);
});

test("stacked outputs do not increase external supply capacity or input inserter speed", () => {
  expect(plan({ outputStackSize: 4, outputs: outputs("iron-gear-wheel", 300) }).issues.join()).toMatch(/Iron plate needs 600\/min/);
  for (const recipe of RECIPES) {
    const factory = recipe.category === "smelting" ? "electric-furnace" : "assembling-machine-3";
    const crafts = craftingCapacity(recipe, factory, 4);
    recipe.ingredients.forEach((item, i) => expect(crafts * item.amount).toBeLessThanOrEqual(i === 0 ? 90 : 45));
    expect(crafts * recipe.results[0].amount).toBeLessThanOrEqual(360);
  }
});

test("requested surplus and intermediate consumption share the same capacity budget", () => {
  const config = { outputStackSize: 2, outputs: [...outputs("electronic-circuit", 200), ...outputs("copper-cable", 300)] };
  expect(plan(config).issues).toEqual([]);
  expect(plan({ ...config, outputs: [...outputs("electronic-circuit", 200), ...outputs("copper-cable", 301)] }).issues.join()).toMatch(/Copper cable needs 901/);
  // Duplicate rows are merged before checking throughput.
  expect(plan({ outputs: [...outputs("copper-cable", 225), ...outputs("copper-cable", 226)] }).issues.join()).toMatch(/Copper cable needs 451/);
});

test.each(RATE_UNITS)("%s supply limits use the input stack height, not the output height", (rateUnit) => {
  const config = {
    rateUnit, belt: "turbo-transport-belt", inputStackSize: 2, outputStackSize: 4,
    outputs: outputs("copper-cable", 720 / rateScale(rateUnit, "turbo-transport-belt", 4)),
    inputLimits: { "copper-plate": 360 / rateScale(rateUnit, "turbo-transport-belt", 2) },
  };
  expect(plan(config).issues).toEqual([]);
  expect(plan({ ...config, inputLimits: { "copper-plate": Number(config.inputLimits["copper-plate"]) / 2 } }).issues.join()).toMatch(/only 180\/min/);
});

test("unit switching preserves rates, zero/blank supply limits, and machine counts", () => {
  let config = {
    ...DEFAULT_CONFIG, belt: "turbo-transport-belt", inputStackSize: 3, outputStackSize: 4,
    outputs: outputs("copper-cable", 720), inputLimits: { "copper-plate": 360, coal: "", stone: 0 },
  };
  const before = plan(config);
  for (const rateUnit of ["items/s", "belts", "items/min", "belts", "items/s", "items/min"]) {
    config = convertRateUnit(config, rateUnit);
    expect(plan(config)).toEqual(before);
    expect(config.inputLimits.coal).toBe("");
    expect(config.inputLimits.stone).toBe(0);
  }
});

test("belt multiples follow belt/stack choices, while item rates remain fixed", () => {
  const config = { rateUnit: "belts", outputs: outputs("copper-cable", 0.25) };
  expect(plan(config).outputs[0].rate).toBe(225);
  expect(plan({ ...config, belt: "turbo-transport-belt", outputStackSize: 4 }).outputs[0].rate).toBe(3600);
  expect(plan({ ...config, rateUnit: "items/s", belt: "turbo-transport-belt", outputStackSize: 4 }).outputs[0].rate).toBe(15);
  expect(plan({ ...config, outputs: outputs("copper-cable", 2) }).issues.join()).toMatch(/parallel belts are not generated/);
});

test.each([0, -1, 1.5, 5, Infinity, NaN, "", " ", "bad", null, true, [], {}])("rejects invalid stack height %j at both boundaries", (value) => {
  for (const key of ["inputStackSize", "outputStackSize"])
    expect(() => plan({ [key]: value })).toThrow(/stack size/);
});

test.each(["items/hour", "belt/s", "", "__proto__"])("rejects unsupported rate unit %s", (rateUnit) => {
  expect(() => plan({ rateUnit })).toThrow(/rate units/);
});

test.each(RATE_UNITS)("%s rejects invalid output edits, overflow and invalid supply", (rateUnit) => {
  for (const value of [0, -1, "", " ", "no", Infinity, NaN, true, null, [], {}, 1e300]) {
    expect(() => plan({ rateUnit, outputs: outputs("copper-cable", value) })).toThrow(/Output rate/);
  }
  for (const value of [-1, Infinity, NaN, "bad", " ", true, null, [], {}]) {
    expect(plan({ rateUnit, outputs: outputs("copper-cable", 0.01), inputLimits: { "copper-plate": value } }).issues.join()).toMatch(/Supply limit/);
  }
  const converted = convertRateUnit({ ...DEFAULT_CONFIG, outputs: outputs("copper-cable", "") }, rateUnit);
  expect(converted.outputs[0].rate).toBe("");
  expect(() => plan(converted)).toThrow(/Output rate/);
});

test("all catalog outputs conserve materials and retain machine and target-count limits", () => {
  const config = { belt: "turbo-transport-belt", inputStackSize: 4, outputStackSize: 4, fromOre: true, outputs: RECIPES.map((recipe) => ({ recipe: recipe.id, rate: 0.01 })) };
  const result = plan(config);
  expect(result.outputs).toHaveLength(MAX_OUTPUTS);
  expect(result.units).toHaveLength(RECIPES.length);
  expect(result.issues).toEqual([]);
  const balance = new Map(result.inputs.map((input) => [input.name, input.rate]));
  for (const unit of result.units) {
    for (const item of recipeById[unit.recipe].ingredients) balance.set(item.name, (balance.get(item.name) || 0) - item.amount * unit.crafts);
    for (const item of recipeById[unit.recipe].results) balance.set(item.name, (balance.get(item.name) || 0) + item.amount * unit.crafts);
  }
  for (const item of result.outputs) balance.set(item.name, balance.get(item.name) - item.rate);
  for (const amount of balance.values()) expect(amount).toBeCloseTo(0, 8);
  expect(plan({ ...config, maxMachines: 44 }).issues.join()).toMatch(/budget/);
  expect(() => plan({ ...config, outputs: [...config.outputs, config.outputs[0]] })).toThrow(/output targets/);
  expect(plan({ ...config, maxMachines: 201 }).issues.join()).toMatch(/between 1 and 200/);
  expect(plan({ ...config, machineOverrides: { "copper-cable": { count: 200 } } }).issues.join()).toMatch(/budget/);
  expect(() => transportSettings({ belt: "__proto__" })).toThrow(/supported belt/);
});
