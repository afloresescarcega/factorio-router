import { RECIPES } from "./recipeCatalog.js";
import { BELTS, DEFAULT_CONFIG, planProduction } from "./planner.js";
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
      ? entity.direction === 4 || entity.direction === 12
        ? [1, 2]
        : [2, 1]
      : [1, 1];
const build = (patch, options) =>
  createLayout(planProduction({ ...DEFAULT_CONFIG, ...patch }), options);
const undergroundReach = {
  "underground-belt": 5,
  "fast-underground-belt": 7,
  "express-underground-belt": 9,
  "turbo-underground-belt": 11,
};
const isTransport = (entity) =>
  entity && (entity.name.includes("belt") || entity.name.endsWith("splitter"));

function measuredFootprint(layout) {
  const edges = layout.blueprint.blueprint.entities.map((entity) => {
    const [width, height] = size(entity);
    return {
      left: entity.position.x - width / 2,
      right: entity.position.x + width / 2,
      top: entity.position.y - height / 2,
      bottom: entity.position.y + height / 2,
    };
  });
  const width =
    Math.max(...edges.map((edge) => edge.right)) -
    Math.min(...edges.map((edge) => edge.left));
  const height =
    Math.max(...edges.map((edge) => edge.bottom)) -
    Math.min(...edges.map((edge) => edge.top));
  return { width, height, area: width * height };
}
const footprint = (layout) => measuredFootprint(layout).area;

function machineCounts(layout) {
  return layout.blueprint.blueprint.entities
    .filter((entity) => size(entity)[0] === 3)
    .reduce((counts, entity) => {
      const id = `${entity.name}:${entity.recipe || "smelting"}`;
      counts[id] = (counts[id] || 0) + 1;
      return counts;
    }, {});
}

function inspect(layout) {
  expect(layout.footprint).toEqual(measuredFootprint(layout));
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
  const next = new Map(),
    pairedOutputs = new Set();
  for (const entity of entities.filter(isTransport)) {
    const [dx, dy] = vector[entity.direction];
    const { x, y } = entity.position;
    let destinations;
    if (entity.type === "input") {
      const matches = [];
      for (
        let distance = 1;
        distance <= undergroundReach[entity.name];
        distance++
      ) {
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
      expect(
        pairedOutputs.has(matches[0].entity_number),
        `underground output paired twice at ${x},${y}`,
      ).toBe(false);
      pairedOutputs.add(matches[0].entity_number);
      destinations = matches;
    } else if (entity.name.endsWith("splitter")) {
      destinations = [
        tiles.get(key(x + dx - dy * 0.5, y + dy + dx * 0.5)),
        tiles.get(key(x + dx + dy * 0.5, y + dy - dx * 0.5)),
      ];
    } else destinations = [tiles.get(key(x + dx, y + dy))];
    next.set(
      entity.entity_number,
      destinations.filter(
        (e) =>
          isTransport(e) &&
          e.direction !== (entity.direction + 8) % 16,
      ),
    );
  }
  for (const entity of entities.filter((e) => e.type === "output"))
    expect(
      pairedOutputs.has(entity.entity_number),
      `unpaired underground output ${entity.entity_number}`,
    ).toBe(true);
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
  for (const annotation of layout.annotations.filter((a) => a.kind === "input")) {
    const input = tiles.get(key(annotation.x + 0.5, annotation.y + 0.5));
    expect(isTransport(input), `missing input ${annotation.item}`).toBe(true);
    const starts = inputsByItem.get(annotation.item) || [];
    starts.push(input);
    inputsByItem.set(annotation.item, starts);
  }
  const requiredPickups = [];
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
    } else {
      const data = RECIPES.find((r) => r.id === recipe);
      const index =
        entity.position.x > machine.position.x ? 2 : reach === 2 ? 1 : 0;
      requiredPickups.push({ item: data.ingredients[index].name, pickup });
    }
  }
  for (const { item } of requiredPickups)
    expect(inputsByItem.has(item), `missing material source ${item}`).toBe(true);
  for (const [item, starts] of inputsByItem) {
    // Each producer must deliver, including every wrapped producer column.
    // Taking the union of all producers could hide a disconnected output belt.
    for (const start of starts) {
      const reachableTiles = reachable([start]);
      for (const required of requiredPickups)
        expect(
          reachableTiles.has(required.pickup.entity_number),
          `${item} from ${start.entity_number} route to ${required.item}`,
        ).toBe(required.item === item);
      for (const output of layout.annotations.filter((a) => a.kind === "output")) {
        const exit = tiles.get(key(output.x + 0.5, output.y + 0.5));
        expect(isTransport(exit), `missing output ${output.item}`).toBe(true);
        expect(
          reachableTiles.has(exit.entity_number),
          `${item} from ${start.entity_number} route to final output ${output.item}`,
        ).toBe(output.item === item);
      }
    }
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
  const neighbors = new Map(poles.map((pole) => [pole.entity_number, []]));
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
      neighbors.get(a).push(b);
      neighbors.get(b).push(a);
  }
  const queue = [...connected];
  while (queue.length) {
    for (const neighbor of neighbors.get(queue.pop())) {
      if (connected.has(neighbor)) continue;
      connected.add(neighbor);
      queue.push(neighbor);
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

test.each(Object.keys(BELTS))(
  "compact %s layouts keep every catalog recipe connected and isolated",
  (belt) => {
    for (const recipe of RECIPES) {
      const config = {
        outputs: [{ recipe: recipe.id, rate: 1 }],
        belt,
        fromOre: true,
      };
      const layout = build(config, { compact: true });
      const standard = build(config);
      inspect(layout);
      expect(machineCounts(layout), recipe.id).toEqual(
        machineCounts(standard),
      );
      expect(footprint(layout), recipe.id).toBeLessThanOrEqual(footprint(standard));
      expect(
        validateBlueprintString(encodeBlueprint(layout.blueprint)),
        recipe.id,
      ).toEqual({ ok: true, errors: [] });
    }
  },
);

test.each(Object.keys(BELTS))(
  "compact %s wrapped columns connect all producers and all three ingredients",
  (belt) => {
    const config = {
      outputs: [
        { recipe: "splitter", rate: 10 },
        { recipe: "electronic-circuit", rate: 5 },
      ],
      machineOverrides: {
        "electronic-circuit": { count: 30 },
        splitter: { count: 30 },
        "copper-cable": { count: 25 },
      },
      belt,
      fromOre: true,
    };
    const layout = build(config, { compact: true });
    expect(machineCounts(layout)).toEqual(machineCounts(build(config)));
    for (const recipe of ["splitter", "electronic-circuit", "copper-cable"])
      expect(
        layout.annotations.filter(
          (annotation) =>
            annotation.kind === "machine" && annotation.item === recipe,
        ).length,
        `wrapped ${recipe}`,
      ).toBeGreaterThan(1);
    inspect(layout);
  },
);

// Reproduces the supplied blueprint without committing its encoded entity data.
const suppliedSplitterConfig = {
  outputs: [{ recipe: "splitter", rate: 84 }],
  assembler: "assembling-machine-3",
  belt: "express-transport-belt",
  fromOre: true,
};

test("compact layout substantially reduces the supplied splitter factory footprint", () => {
  const spacious = build(suppliedSplitterConfig);
  const compact = build(suppliedSplitterConfig, { compact: true });
  expect(machineCounts(compact)).toEqual(machineCounts(spacious));
  expect(
    Object.values(machineCounts(compact)).reduce((sum, count) => sum + count, 0),
  ).toBe(113);
  // Measure actual exported entity extents, independent of preview bounds.
  expect(footprint(compact)).toBeLessThan(footprint(spacious) * 0.75);
  expect(
    compact.blueprint.blueprint.entities.filter(isTransport).length,
  ).toBeLessThan(spacious.blueprint.blueprint.entities.filter(isTransport).length);
  inspect(compact);
  const encoded = encodeBlueprint(compact.blueprint);
  expect(validateBlueprintString(encoded)).toEqual({ ok: true, errors: [] });
  expect(decodeBlueprint(encoded)).toEqual(compact.blueprint);
});

test("compact mode is opt-in, deterministic, and does not mutate the plan", () => {
  const plan = planProduction({ ...DEFAULT_CONFIG, ...suppliedSplitterConfig });
  const original = structuredClone(plan);
  const spacious = createLayout(plan);
  const compact = createLayout(plan, { compact: true });
  expect(createLayout(plan, { compact: false })).toEqual(spacious);
  expect(createLayout(plan, { compact: true })).toEqual(compact);
  expect(createLayout(plan)).toEqual(spacious);
  expect(plan).toEqual(original);
});

test("compact mode rejects production plans with insufficient belt capacity", () => {
  const plan = planProduction({
    ...DEFAULT_CONFIG,
    ...suppliedSplitterConfig,
    belt: "transport-belt",
  });
  expect(plan.issues.length).toBeGreaterThan(0);
  expect(() => createLayout(plan, { compact: true })).toThrow(
    plan.issues.join(" "),
  );
});

test("neighboring three-ingredient columns preserve their shared ingredient branches", () => {
  // Iron is the turret's east-side third input and the next machine's second
  // input. Their splitter branches must remain separate despite sharing a bus.
  const layout = build(
    {
      outputs: [
        { recipe: "gun-turret", rate: 1 },
        { recipe: "fast-inserter", rate: 1 },
      ],
      intermediates: false,
    },
    { compact: true },
  );
  expect(layout.annotations.filter((a) => a.kind === "machine")).toHaveLength(2);
  inspect(layout);
});

test("separate input and output materials safely share the same compact bus row", () => {
  const layout = build(
    {
      outputs: [{ recipe: "electronic-circuit", rate: 1 }],
      fromOre: true,
    },
    { compact: true },
  );
  const input = layout.annotations.find(
    (a) => a.kind === "input" && a.item === "iron-ore",
  );
  const output = layout.annotations.find(
    (a) => a.kind === "output" && a.item === "electronic-circuit",
  );
  expect(input.y).toBe(output.y);
  // The graph inspector checks both required routes and every forbidden final
  // output route, so row reuse cannot silently mix ore into the circuit exit.
  inspect(layout);
});

test.each(["standard", "compact"])("%s supports all 45 output targets with isolated routes and valid Space Age entities", (layoutMode) => {
  const config = {
    layoutMode, belt: "turbo-transport-belt", inputStackSize: 4, outputStackSize: 4,
    fromOre: true, outputs: RECIPES.map((recipe) => ({ recipe: recipe.id, rate: 0.01 })),
  };
  const layout = build(config);
  expect(layout.annotations.filter((a) => a.kind === "output")).toHaveLength(45);
  inspect(layout);
  const encoded = encodeBlueprint(layout.blueprint);
  expect(validateBlueprintString(encoded)).toEqual({ ok: true, errors: [] });
  expect(decodeBlueprint(encoded)).toEqual(layout.blueprint);
}, 30000);

test.each(["standard", "compact"])("%s stacked belts at the lane limit use stack inserters on every producer", (layoutMode) => {
  for (const belt of Object.keys(BELTS)) {
    for (const stackSize of [1, 2, 3, 4]) {
      const config = {
        belt, layoutMode, inputStackSize: stackSize, outputStackSize: stackSize,
        outputs: [{ recipe: "copper-cable", rate: BELTS[belt].laneRate * stackSize }],
      };
      const layout = build(config);
      inspect(layout);
      const entities = layout.blueprint.blueprint.entities;
      const machines = entities.filter((entity) => entity.recipe === "copper-cable");
      const outputInserters = machines.map((machine) => entities.find((entity) => entity.position.x === machine.position.x + 2 && entity.position.y === machine.position.y));
      for (const inserter of outputInserters) {
        expect(inserter.name).toBe(stackSize > 1 ? "stack-inserter" : "fast-inserter");
        expect(inserter.override_stack_size).toBe(stackSize > 1 ? stackSize : undefined);
        expect(inserter.direction).toBe(12);
      }
      expect(entities.filter((entity) => entity.name === "stack-inserter")).toHaveLength(stackSize > 1 ? machines.length : 0);
      expect(validateBlueprintString(encodeBlueprint(layout.blueprint))).toEqual({ ok: true, errors: [] });
    }
  }
}, 30000);

test("green stacked intermediates, furnaces, and three-ingredient machines keep every pickup connected", () => {
  for (const outputStackSize of [2, 3, 4]) {
    for (const recipe of RECIPES) {
      const layout = build({
        belt: "turbo-transport-belt", inputStackSize: 4, outputStackSize, fromOre: true,
        layoutMode: "compact", outputs: [{ recipe: recipe.id, rate: 1 }],
      });
      inspect(layout);
      const entities = layout.blueprint.blueprint.entities;
      expect(entities.filter((entity) => entity.name === "stack-inserter")).toHaveLength(entities.filter((entity) => size(entity)[0] === 3).length);
      expect(validateBlueprintString(encodeBlueprint(layout.blueprint))).toEqual({ ok: true, errors: [] });
    }
  }
}, 30000);

test.each(Object.keys(BELTS))(
  "compact %s mixed-output routes survive varied column heights and external supplies",
  (belt) => {
    const cases = [
      {
        outputs: ["gun-turret", "fast-inserter", "medium-electric-pole"],
        fromOre: true,
      },
      {
        outputs: ["military-science-pack", "advanced-circuit", "substation"],
        fromOre: false,
      },
      {
        outputs: [
          "logistic-science-pack",
          "automation-science-pack",
          "electronic-circuit",
        ],
        fromOre: true,
        externalItems: ["iron-gear-wheel"],
      },
      {
        outputs: ["splitter", "fast-splitter", "long-handed-inserter"],
        fromOre: true,
        externalItems: ["copper-cable"],
      },
    ];
    for (const [caseIndex, scenario] of cases.entries()) {
      const config = {
        ...DEFAULT_CONFIG,
        ...scenario,
        belt,
        outputs: scenario.outputs.map((recipe) => ({ recipe, rate: 1 })),
      };
      const initial = planProduction(config);
      const counts = [1, 2, 3, 7, 13];
      config.machineOverrides = Object.fromEntries(
        initial.units.map((unit, index) => [
          unit.recipe,
          {
            count: Math.max(
              unit.required,
              counts[(index + caseIndex) % counts.length],
            ),
          },
        ]),
      );
      const plan = planProduction(config);
      expect(plan.issues, scenario.outputs.join(", ")).toEqual([]);
      const layout = createLayout(plan, { compact: true });
      const standard = createLayout(plan, { compact: false });
      expect(machineCounts(layout)).toEqual(machineCounts(standard));
      expect(footprint(layout)).toBeLessThanOrEqual(footprint(standard));
      inspect(layout);
    }
  },
);
