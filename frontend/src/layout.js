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

// Keep recipe dependency order while packing the lanes and their splitter taps.
// A spare tile between columns prevents a downstream splitter from occupying
// the preceding column's tap or output feeder on a shared material bus.
function arrange(plan, compact, columnLimit) {
  const columns = [];
  for (const unit of plan.units)
    for (let remaining = unit.count; remaining > 0; remaining -= columnLimit) {
      const previous = columns.at(-1);
      const leftLane = unit.ingredients.length > 1 ? -4 : -3;
      const previousRight = previous?.unit.ingredients.length === 3 ? 4 : 3;
      columns.push({
        unit,
        count: Math.min(columnLimit, remaining),
        x: previous
          ? previous.x +
            (compact ? previousRight - leftLane + 2 : COLUMN_SPACING)
          : 0,
      });
    }
  const channels = compact ? LANES : CHANNELS;
  const items = [
    ...new Set(
      plan.units.flatMap((unit) =>
        [...unit.ingredients, ...unit.results].map((item) => item.name),
      ),
    ),
  ];
  const buses = items.map((item, i) => ({
    item,
    row: -10 - i * 5,
    taps: [],
    feeders: [],
  }));
  const busFor = new Map(buses.map((bus) => [bus.item, bus]));
  for (const column of columns) {
    column.unit.ingredients.forEach((item, i) =>
      busFor.get(item.name).taps.push(column.x + channels[i]),
    );
    busFor.get(column.unit.results[0].name).feeders.push(column.x + 3);
  }
  const last = columns.at(-1);
  const leftEdge = compact
    ? Math.min(...buses.flatMap((bus) => bus.taps)) - 2
    : -12;
  const rightEdge =
    last.x + (compact ? (last.unit.ingredients.length === 3 ? 6 : 5) : 11);
  for (const bus of buses) {
    bus.external = plan.inputs.some((input) => input.name === bus.item);
    bus.exported = plan.outputs.some((output) => output.name === bus.item);
    bus.from = bus.external ? leftEdge : Math.min(...bus.feeders);
    bus.to = bus.exported
      ? rightEdge
      : Math.max(...bus.taps.map((x) => x - 1), ...bus.feeders);
  }
  if (compact) {
    // Disjoint material runs can share a horizontal band. Include each branch
    // and a blank tile in its interval so separate materials never connect.
    const ends = [];
    for (const bus of [...buses].sort((a, b) => a.from - b.from || a.to - b.to)) {
      let band = ends.findIndex((end) => end + 1 < bus.from);
      if (band === -1) band = ends.length;
      ends[band] = Math.max(bus.to, ...bus.taps);
      bus.row = -5 - band * 4;
    }
  }
  const rowSpacing = compact ? 3 : ROW_SPACING;
  const bottom = Math.max(
    ...columns.map(({ count }) =>
      compact
        ? Math.max((count - 1) * 3 + 1, Math.floor((count - 1) / 2) * 6 + 2)
        : (count - 1) * ROW_SPACING + 2,
    ),
  );
  const top = Math.min(...buses.map((bus) => bus.row));
  return {
    columns,
    buses,
    leftEdge,
    rightEdge,
    rowSpacing,
    area: (rightEdge - leftEdge + 1) * (bottom - top + 1),
  };
}

function compactArrangement(plan) {
  let best;
  // Search column heights rather than imposing a tall or wide shape. Geometry
  // alone is cheap to evaluate; entities are generated only for the winner.
  const maximum = Math.max(...plan.units.map((unit) => unit.count));
  for (let limit = 1; limit <= maximum; limit++) {
    const candidate = arrange(plan, true, limit);
    if (!best || candidate.area < best.area) best = candidate;
  }
  return best;
}

export function createLayout(
  plan,
  { compact = plan.layoutMode === "compact" } = {},
) {
  if (plan.issues.length) throw new Error(plan.issues.join(" "));
  const { columns, buses, leftEdge, rightEdge, rowSpacing } = compact
    ? compactArrangement(plan)
    : arrange(plan, false, MAX_PER_COLUMN);
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
  // Cross each bus separately; every tunnel spans just 2 hidden tiles. This
  // works for any number of buses and leaves room for a splitter's second tile.
  function vertical(x, from, to, direction, ownRow) {
    const hidden = new Set(),
      endpoints = new Map();
    for (const bus of buses)
      if (
        bus.row !== ownRow &&
        bus.row - 1 >= from &&
        bus.row + 2 <= to &&
        (!compact || (x >= bus.from && x <= bus.to))
      ) {
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
  for (const bus of buses) {
    const { external, exported, from, to } = bus;
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
    for (const x of bus.taps)
      vertical(x, bus.row + 1, compact ? -3 : -4, SOUTH, bus.row);
    for (const x of bus.feeders) vertical(x, bus.row + 1, -3, NORTH, bus.row);
  }
  for (const { x, unit, count } of columns) {
    // Compact lanes connect directly to the bus; standard lanes fan out.
    unit.ingredients.forEach((ingredient, i) => {
      const channel = x + (compact ? LANES[i] : CHANNELS[i]),
        lane = x + LANES[i];
      const bend = compact ? -2 : i === 0 ? -3 : -2;
      for (let y = compact ? -2 : -3; y < bend; y++)
        belt(channel, y, SOUTH);
      const step = lane > channel ? 1 : -1;
      for (let bx = channel; bx !== lane; bx += step)
        belt(bx, bend, step === 1 ? EAST : WEST);
      for (let y = bend; y <= (count - 1) * rowSpacing + 1; y++)
        belt(lane, y, SOUTH);
    });
    for (let y = -2; y <= (count - 1) * rowSpacing; y++)
      belt(x + 3, y, NORTH);
    for (let i = 0; i < count; i++) {
      const y = i * rowSpacing;
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
      if (!compact) pole(x, y + 2);
      else if (i % 2 === 0) {
        // Touching machines leave no center gap. Side poles cover two machines
        // and all four inserters per machine, with six tiles between pole pairs.
        pole(x - 2, y + 2);
        pole(x + 2, y + 2);
      }
    }
    pole(x - 2, -2);
    pole(x + 2, -2);
    if (!compact && x < columns.at(-1).x) pole(x + 10, -2);
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
    ...(compact
      ? ["Compact layout: tightly packed machine columns and shared bus rows for separate material runs."]
      : []),
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
  const extents = {
    left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity,
  };
  for (const entity of entities) {
    const [width, height] = entitySize(entity);
    extents.left = Math.min(extents.left, entity.position.x - width / 2);
    extents.right = Math.max(extents.right, entity.position.x + width / 2);
    extents.top = Math.min(extents.top, entity.position.y - height / 2);
    extents.bottom = Math.max(extents.bottom, entity.position.y + height / 2);
  }
  const footprint = {
    width: extents.right - extents.left,
    height: extents.bottom - extents.top,
  };
  footprint.area = footprint.width * footprint.height;
  const bounds = compact
    ? {
        left: extents.left - 2,
        top: extents.top - 3,
        right: extents.right + 2,
        bottom: extents.bottom + 2,
      }
    : {
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
    footprint,
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
