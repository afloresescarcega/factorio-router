import { HelmodFactory } from "./helmodFactory.js";
import { decodeBlueprint } from "./blueprintFactory.js";
import { planHelmodString, processHelmodString } from "./main.js";

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
