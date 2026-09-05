import { RECIPES } from "./recipeCatalog.js";
import { DEFAULT_CONFIG, planProduction } from "./planner.js";
import { createLayout } from "./layout.js";
import { encodeBlueprint, decodeBlueprint } from "./blueprintFactory.js";
import { validateBlueprintString } from "../validator/validate.mjs";

const vector = { 0: [0, -1], 4: [1, 0], 8: [0, 1], 12: [-1, 0] };
const key = (x, y) => `${x},${y}`;
const size = (entity) =>
  entity.name.startsWith("assembling-machine") ||
  entity.name === "electric-furnace"
    ? [3, 3]
    : entity.name.endsWith("splitter")
      ? [1, 2]
      : [1, 1];
const build = (patch) =>
  createLayout(planProduction({ ...DEFAULT_CONFIG, ...patch }));

function inspect(layout) {
  const entities = layout.blueprint.blueprint.entities;
  const tiles = new Map();
  for (const entity of entities) {
    const [w, h] = size(entity);
    const { x, y } = entity.position;
    expect(Number.isInteger(x - w / 2)).toBe(true);
    expect(Number.isInteger(y - h / 2)).toBe(true);
    for (let dx = 0; dx < w; dx++)
      for (let dy = 0; dy < h; dy++) {
        const tile = key(x - w / 2 + dx + 0.5, y - h / 2 + dy + 0.5);
        expect(tiles.has(tile), `collision at ${tile}`).toBe(false);
        tiles.set(tile, entity);
      }
  }
  // Build a directed transport graph from the exported entities alone.
  const next = new Map();
  for (const entity of entities.filter(
    (e) => e.name.includes("belt") || e.name.endsWith("splitter"),
  )) {
    const [dx, dy] = vector[entity.direction];
    const { x, y } = entity.position;
    let destinations;
    if (entity.type === "input") {
      const matches = [];
      for (let distance = 2; distance <= 5; distance++) {
        const target = tiles.get(key(x + dx * distance, y + dy * distance));
        if (
          target?.type === "output" &&
          target.direction === entity.direction &&
          target.name === entity.name
        ) {
          matches.push(target);
          break;
        }
      }
      expect(matches, `unpaired underground ${x},${y}`).toHaveLength(1);
      destinations = matches;
    } else if (entity.name.endsWith("splitter")) {
      destinations = [
        tiles.get(key(x + 1, y - 0.5)),
        tiles.get(key(x + 1, y + 0.5)),
      ];
    } else destinations = [tiles.get(key(x + dx, y + dy))];
    next.set(
      entity.entity_number,
      destinations.filter(
        (e) =>
          e &&
          (e.name.includes("belt") || e.name.endsWith("splitter")) &&
          e.direction !== (entity.direction + 8) % 16,
      ),
    );
  }
  function reachable(starts) {
    const seen = new Set(),
      queue = [...starts];
    while (queue.length) {
      const entity = queue.pop();
      if (!entity || seen.has(entity.entity_number)) continue;
      seen.add(entity.entity_number);
      queue.push(...(next.get(entity.entity_number) || []));
    }
    return seen;
  }
  const inputsByItem = new Map();
  for (const annotation of layout.annotations.filter((a) => a.kind === "input"))
    inputsByItem.set(annotation.item, [
      tiles.get(key(annotation.x + 0.5, annotation.y + 0.5)),
    ]);
  const requiredPickups = [],
    outputDrops = [];
  for (const entity of entities.filter((e) => e.name.includes("inserter"))) {
    const [dx, dy] = vector[entity.direction];
    const reach = entity.name === "long-handed-inserter" ? 2 : 1;
    const pickup = tiles.get(
      key(entity.position.x + dx * reach, entity.position.y + dy * reach),
    );
    const drop = tiles.get(
      key(entity.position.x - dx * reach, entity.position.y - dy * reach),
    );
    expect(
      pickup,
      `missing inserter pickup ${entity.entity_number}`,
    ).toBeDefined();
    expect(drop, `missing inserter drop ${entity.entity_number}`).toBeDefined();
    const machine = size(pickup)[0] === 3 ? pickup : drop;
    const recipe = layout.annotations.find(
      (a) => a.kind === "machine" && a.x + 0.5 === machine.position.x,
    )?.item;
    expect(recipe).toBeDefined();
    if (machine === pickup) {
      const starts = inputsByItem.get(recipe) || [];
      starts.push(drop);
      inputsByItem.set(recipe, starts);
      outputDrops.push(drop);
    } else {
      const data = RECIPES.find((r) => r.id === recipe);
      const index =
        entity.position.x > machine.position.x ? 2 : reach === 2 ? 1 : 0;
      requiredPickups.push({ item: data.ingredients[index].name, pickup });
    }
  }
  for (const [item, starts] of inputsByItem) {
    const reachableTiles = reachable(starts);
    for (const required of requiredPickups)
      expect(
        reachableTiles.has(required.pickup.entity_number),
        `${item} route to ${required.item}`,
      ).toBe(required.item === item);
    const output = layout.annotations.find(
      (a) => a.kind === "output" && a.item === item,
    );
    if (output)
      expect(
        reachableTiles.has(
          tiles.get(key(output.x + 0.5, output.y + 0.5)).entity_number,
        ),
        `missing final output ${item}`,
      ).toBe(true);
  }
  const poles = entities.filter((e) => e.name === "medium-electric-pole");
  for (const powered of entities.filter(
    (e) => e.name.includes("inserter") || size(e)[0] === 3,
  )) {
    const [w, h] = size(powered);
    expect(
      poles.some(
        (pole) =>
          Math.abs(pole.position.x - powered.position.x) < 3.5 + w / 2 &&
          Math.abs(pole.position.y - powered.position.y) < 3.5 + h / 2,
      ),
      `unpowered entity ${powered.entity_number}`,
    ).toBe(true);
  }
  const connected = new Set([poles[0].entity_number]);
  for (let i = 0; i < poles.length; i++)
    for (const [a, portA, b, portB] of layout.blueprint.blueprint.wires) {
      expect([portA, portB]).toEqual([5, 5]);
      const source = entities[a - 1],
        target = entities[b - 1];
      expect(
        Math.hypot(
          source.position.x - target.position.x,
          source.position.y - target.position.y,
        ),
      ).toBeLessThanOrEqual(9);
      if (connected.has(a) || connected.has(b)) {
        connected.add(a);
        connected.add(b);
      }
    }
  expect(connected.size).toBe(poles.length);
}

test("complex multi-output line has reachable, isolated routes and connected power", () => {
  const layout = build({
    outputs: [
      { recipe: "logistic-science-pack", rate: 20 },
      { recipe: "automation-science-pack", rate: 20 },
      { recipe: "electronic-circuit", rate: 15 },
    ],
    fromOre: true,
  });
  expect(
    layout.annotations.filter((a) => a.kind === "input").length,
  ).toBeGreaterThan(1);
  inspect(layout);
  const encoded = encodeBlueprint(layout.blueprint);
  expect(validateBlueprintString(encoded)).toEqual({ ok: true, errors: [] });
  expect(decodeBlueprint(encoded)).toEqual(layout.blueprint);
});

test("every catalog recipe exports without overlap, missing routes or invalid names", () => {
  for (const recipe of RECIPES) {
    const layout = build({
      outputs: [{ recipe: recipe.id, rate: 1 }],
      fromOre: true,
    });
    inspect(layout);
    expect(
      validateBlueprintString(encodeBlueprint(layout.blueprint)),
      recipe.id,
    ).toEqual({ ok: true, errors: [] });
  }
});

test("wrapped columns retain all machine counts and connect every lane", () => {
  const layout = build({
    outputs: [{ recipe: "automation-science-pack", rate: 150 }],
    machineOverrides: { "automation-science-pack": { count: 30 } },
    belt: "express-transport-belt",
  });
  expect(
    layout.blueprint.blueprint.entities.filter(
      (e) => e.recipe === "automation-science-pack",
    ),
  ).toHaveLength(30);
  inspect(layout);
});

test("electric furnaces choose recipes from input and exports use 2.0 directions", () => {
  const layout = build({
    outputs: [{ recipe: "iron-plate", rate: 60 }],
    fromOre: true,
  });
  const furnace = layout.blueprint.blueprint.entities.find(
    (e) => e.name === "electric-furnace",
  );
  expect(furnace.recipe).toBeUndefined();
  for (const entity of layout.blueprint.blueprint.entities)
    if (entity.direction !== undefined)
      expect([0, 4, 8, 12]).toContain(entity.direction);
});
