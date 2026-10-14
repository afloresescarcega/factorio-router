import { HelmodFactory } from "./helmodFactory.js";
import { decodeBlueprint } from "./blueprintFactory.js";
import { planHelmodString, processHelmodString } from "./main.js";
import { createLayout } from "./layout.js";

const encode = (units) =>
  HelmodFactory.encodeHelmod({
    blocks: units.map(([name, factory, count]) => ({
      type: "recipe",
      name,
      factory: { name: factory, count },
    })),
  });

test("Helmod is an optional adapter to the shared 2.0 layout", () => {
  const encoded = encode([["iron-gear-wheel", "assembling-machine-1", 1.2]]);
  const plan = planHelmodString(encoded);
  expect(plan.units[0].count).toBe(2);
  const blueprint = decodeBlueprint(processHelmodString(encoded)).blueprint;
  expect(blueprint.version).toBe(562949953421312);
  expect(
    blueprint.entities.filter((e) => e.recipe === "iron-gear-wheel"),
  ).toHaveLength(2);
  expect(blueprint.entities.some((e) => e.direction === 12)).toBe(true);
});

test("Helmod compact exports use the selected layout and preserve machine counts", () => {
  const encoded = encode([["iron-gear-wheel", "assembling-machine-1", 3]]);
  const plan = planHelmodString(encoded, { layoutMode: "compact" });
  expect(plan.layoutMode).toBe("compact");
  const compact = decodeBlueprint(
    processHelmodString(encoded, { layoutMode: "compact" }),
  );
  expect(compact).toEqual(createLayout(plan, { compact: true }).blueprint);
  expect(
    compact.blueprint.entities.filter((entity) => entity.recipe),
  ).toHaveLength(3);
  expect(compact).not.toEqual(decodeBlueprint(processHelmodString(encoded)));
});

test.each(["", "invalid export !!!"])(
  "reports corrupt Helmod input %j",
  (input) => {
    expect(() => planHelmodString(input)).toThrow(/Invalid Helmod export/);
  },
);

test("rejects unknown recipes, incompatible machines, and unbounded counts", () => {
  expect(() =>
    planHelmodString(encode([["fake-recipe", "assembling-machine-1", 1]])),
  ).toThrow(/not supported/);
  expect(() =>
    planHelmodString(encode([["iron-plate", "stone-furnace", 1]])),
  ).toThrow(/electric furnace/);
  expect(() =>
    planHelmodString(
      encode([["iron-gear-wheel", "assembling-machine-1", Infinity]]),
    ),
  ).toThrow(/Invalid machine count/);
  expect(() =>
    planHelmodString(
      encode([["iron-gear-wheel", "assembling-machine-1", 201]]),
    ),
  ).toThrow(/Invalid machine count/);
});

test("does not silently export an underproduced intermediate", () => {
  const encoded = encode([
    ["copper-cable", "assembling-machine-1", 1],
    ["electronic-circuit", "assembling-machine-1", 3],
  ]);
  expect(() => planHelmodString(encoded)).toThrow(
    /cannot supply enough copper-cable/,
  );
});

test("combines repeated recipe counts and rejects empty exports", () => {
  expect(
    planHelmodString(
      encode([
        ["iron-gear-wheel", "assembling-machine-1", 1],
        ["iron-gear-wheel", "assembling-machine-1", 2],
      ]),
    ).machineCount,
  ).toBe(3);
  expect(() =>
    planHelmodString(HelmodFactory.encodeHelmod({ name: "empty" })),
  ).toThrow(/No recipes with factories/);
});

test("EM plant Helmod imports infer Space Age and balance productivity outputs", () => {
  const encoded = encode([
    ["electronic-circuit", "electromagnetic-plant", 2],
  ]);
  const plan = planHelmodString(encoded);

  expect(plan.spaceAge).toBe(true);
  expect(plan.units[0].factory).toBe("electromagnetic-plant");
  expect(plan.outputs).toEqual([{ name: "electronic-circuit", rate: 45 }]);
  expect(plan.inputs).toEqual([
    { name: "iron-plate", rate: 30 },
    { name: "copper-cable", rate: 90 },
  ]);
});

test("Helmod modules, beacons, and non-normal quality are reported as ignored", () => {
  const encoded = HelmodFactory.encodeHelmod({
    type: "recipe",
    name: "electronic-circuit",
    quality: "uncommon",
    factory: {
      name: "electromagnetic-plant",
      count: 2,
      quality: "rare",
      modules: { 1: { name: "productivity-module-3", quality: "normal" } },
    },
    beacons: { 1: { name: "beacon", count: 1, modules: { 1: { name: "speed-module-3" } } } },
  });
  const plan = planHelmodString(encoded);
  expect(plan.spaceAge).toBe(true);
  expect(plan.warnings.join(" ")).toMatch(/modules, beacons, and non-normal quality settings were ignored/);
});

test("Helmod placeholder beacons and empty module maps are not reported as ignored", () => {
  const encoded = HelmodFactory.encodeHelmod({
    type: "recipe",
    name: "iron-gear-wheel",
    factory: { name: "assembling-machine-1", count: 1, modules: {} },
    beacon: { name: "beacon", count: 0, combo: 4, modules: {} },
    summary: { beacons: { beacon: { name: "beacon", count: 0 } }, modules: {} },
  });
  const plan = planHelmodString(encoded);
  expect(plan.warnings.join(" ")).not.toMatch(/were ignored/);
});
