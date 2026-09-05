import { BELTS, title, formatRate } from "./planner.js";

// Factorio 2.0 cardinal directions. All coordinates below are tile indices;
// odd-size entity centers sit on half tiles in the exported blueprint.
// Inserter direction points toward PICKUP, opposite the displayed flow arrow.
// Wube's unrotated fast inserter uses pickup {0,-1}, insert {0,1.2}:
// https://github.com/wube/factorio-data/blob/2.0.72/base/prototypes/entity/entities.lua#L2373-L2374
export const NORTH = 0,
  EAST = 4,
  SOUTH = 8,
  WEST = 12;
export const COLUMN_SPACING = 20,
  ROW_SPACING = 4,
  MAX_PER_COLUMN = 12;
const CHANNELS = [-5, -8, 7],
  LANES = [-3, -4, 4];

export function entitySize(entity) {
  if (
    entity.name.startsWith("assembling-machine") ||
    entity.name === "electric-furnace"
  )
    return [3, 3];
  if (entity.name.endsWith("splitter"))
    return entity.direction === EAST || entity.direction === WEST
      ? [1, 2]
      : [2, 1];
  return [1, 1];
}

export function createLayout(plan) {
  if (plan.issues.length) throw new Error(plan.issues.join(" "));
  const tier = BELTS[plan.belt];
  const entities = [],
    occupied = new Set(),
    annotations = [],
    poles = [];
  function add(name, x, y, extra = {}) {
    const entity = {
      entity_number: entities.length + 1,
      name,
      position: { x: x + 0.5, y: y + 0.5 },
      ...extra,
    };
    const [width, height] = entitySize(entity);
    const left = entity.position.x - width / 2,
      top = entity.position.y - height / 2;
    for (let dx = 0; dx < width; dx++)
      for (let dy = 0; dy < height; dy++) {
        const key = `${left + dx},${top + dy}`;
        if (occupied.has(key))
          throw new Error(
            `Layout collision at ${key}. Please reduce this line and report the configuration.`,
          );
        occupied.add(key);
      }
    entities.push(entity);
    return entity;
  }
  const belt = (x, y, direction) => add(plan.belt, x, y, { direction });
  const underground = (x, y, direction, type) =>
    add(tier.underground, x, y, { direction, type });
  const pole = (x, y) => poles.push(add("medium-electric-pole", x, y));
  const columns = [];
  for (const unit of plan.units)
    for (let remaining = unit.count; remaining > 0; remaining -= MAX_PER_COLUMN)
      columns.push({
        unit,
        count: Math.min(MAX_PER_COLUMN, remaining),
        x: columns.length * COLUMN_SPACING,
      });
  const itemNames = [
    ...new Set(
      plan.units.flatMap((unit) =>
        [...unit.ingredients, ...unit.results].map((item) => item.name),
      ),
    ),
  ];
  const buses = itemNames.map((item, i) => ({
    item,
    row: -10 - i * 5,
    taps: [],
    feeders: [],
  }));
  const busFor = (item) => buses.find((bus) => bus.item === item);
  for (const column of columns) {
    column.unit.ingredients.forEach((item, i) =>
      busFor(item.name).taps.push(column.x + CHANNELS[i]),
    );
    busFor(column.unit.results[0].name).feeders.push(column.x + 3);
  }

  // Cross each bus separately; every tunnel spans just 2 hidden tiles. This
  // works for any number of buses and leaves room for a splitter's second tile.
  function vertical(x, from, to, direction, ownRow) {
    const hidden = new Set(),
      endpoints = new Map();
    for (const bus of buses)
      if (bus.row !== ownRow && bus.row - 1 >= from && bus.row + 2 <= to) {
        endpoints.set(bus.row - 1, direction === SOUTH ? "input" : "output");
        endpoints.set(bus.row + 2, direction === SOUTH ? "output" : "input");
        hidden.add(bus.row);
        hidden.add(bus.row + 1);
      }
    for (let y = from; y <= to; y++) {
      if (hidden.has(y)) continue;
      if (endpoints.has(y)) underground(x, y, direction, endpoints.get(y));
      else belt(x, y, direction);
    }
  }
  const leftEdge = -12,
    rightEdge = columns.at(-1).x + 11;
  for (const bus of buses) {
    const external = plan.inputs.some((input) => input.name === bus.item);
    const exported = plan.outputs.some((output) => output.name === bus.item);
    const from = external ? leftEdge : Math.min(...bus.feeders);
    const to = exported
      ? rightEdge
      : Math.max(...bus.taps.map((x) => x - 1), ...bus.feeders);
    const splitters = new Set(bus.taps.map((x) => x - 1));
    for (let x = from; x <= to; x++) {
      if (splitters.has(x))
        add(tier.splitter, x, bus.row + 0.5, {
          direction: EAST,
          output_priority: "right",
        });
      else belt(x, bus.row, EAST);
    }
    if (external)
      annotations.push({
        x: leftEdge,
        y: bus.row,
        item: bus.item,
        kind: "input",
        rate: plan.inputs.find((input) => input.name === bus.item).rate,
      });
    if (exported)
      annotations.push({
        x: rightEdge,
        y: bus.row,
        item: bus.item,
        kind: "output",
        rate: plan.outputs.find((output) => output.name === bus.item).rate,
      });
    for (const x of bus.taps) vertical(x, bus.row + 1, -4, SOUTH, bus.row);
    for (const x of bus.feeders) vertical(x, bus.row + 1, -3, NORTH, bus.row);
  }
  for (const { x, unit, count } of columns) {
    // Fan out the closely spaced machine lanes to separated bus crossings.
    unit.ingredients.forEach((ingredient, i) => {
      const channel = x + CHANNELS[i],
        lane = x + LANES[i];
      const bend = i === 0 ? -3 : -2;
      for (let y = -3; y < bend; y++) belt(channel, y, SOUTH);
      const step = lane > channel ? 1 : -1;
      for (let bx = channel; bx !== lane; bx += step)
        belt(bx, bend, step === 1 ? EAST : WEST);
      for (let y = bend; y <= (count - 1) * ROW_SPACING + 1; y++)
        belt(lane, y, SOUTH);
    });
    for (let y = -2; y <= (count - 1) * ROW_SPACING; y++) belt(x + 3, y, NORTH);
    for (let i = 0; i < count; i++) {
      const y = i * ROW_SPACING;
      add(
        unit.factory,
        x,
        y,
        unit.factory === "electric-furnace" ? {} : { recipe: unit.recipe },
      );
      add("fast-inserter", x + 2, y, { direction: WEST });
      if (unit.ingredients[0])
        add("fast-inserter", x - 2, y, { direction: WEST });
      if (unit.ingredients[1])
        add("long-handed-inserter", x - 2, y + 1, { direction: WEST });
      if (unit.ingredients[2])
        add("long-handed-inserter", x + 2, y + 1, { direction: EAST });
      pole(x, y + 2);
    }
    pole(x - 2, -2);
    pole(x + 2, -2);
    if (x < columns.at(-1).x) pole(x + 10, -2);
    annotations.push({ x, y: -1, item: unit.recipe, kind: "machine", count });
  }
  // Explicit Factorio 2.0 copper-wire spanning tree, within the 9-tile reach.
  const wired = new Set([poles[0]]),
    wires = [];
  while (wired.size < poles.length) {
    let edge;
    for (const a of wired)
      for (const b of poles)
        if (!wired.has(b)) {
          const distance = Math.hypot(
            a.position.x - b.position.x,
            a.position.y - b.position.y,
          );
          if (distance <= 9 && (!edge || distance < edge.distance))
            edge = { a, b, distance };
        }
    if (!edge) throw new Error("The layout has a disconnected power pole.");
    wires.push([edge.a.entity_number, 5, edge.b.entity_number, 5]);
    wired.add(edge.b);
  }
  const description = [
    "Inputs enter from the west; outputs leave to the east. Connect the poles to power.",
    ...annotations
      .filter((a) => a.kind !== "machine")
      .map(
        (a) =>
          `${a.kind}: ${title(a.item)} ${formatRate(a.rate)}/min at (${a.x + 0.5}, ${a.y + 0.5})`,
      ),
    ...plan.warnings,
  ].join("\n");
  const blueprint = {
    blueprint: {
      item: "blueprint",
      label:
        "Router: " +
        plan.outputs.map((output) => title(output.name)).join(", "),
      description,
      version: 562949953421312,
      icons: plan.outputs
        .slice(0, 4)
        .map((output, i) => ({
          signal: { type: "item", name: output.name },
          index: i + 1,
        })),
      entities,
      wires,
    },
  };
  const bounds = {
    left: leftEdge - 2,
    top: Math.min(...buses.map((bus) => bus.row)) - 3,
    right: rightEdge + 2,
    bottom: Math.max(
      ...columns.map((column) => (column.count - 1) * ROW_SPACING + 4),
    ),
  };
  return {
    blueprint,
    annotations,
    bounds,
    materials: Object.entries(
      entities.reduce(
        (counts, entity) => ({
          ...counts,
          [entity.name]: (counts[entity.name] || 0) + 1,
        }),
        {},
      ),
    ).map(([name, count]) => ({ name, count })),
  };
}
