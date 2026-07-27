import { HelmodFactory } from './helmodFactory.js';
import { encodeBlueprint } from './blueprintFactory.js';
import recipeGraph from './recipeGraph.js';

function parseHelmodData(helmodData) {
    // Helmod nests recipe entries (type "recipe") that carry the factory that
    // crafts them and how many of that factory the production line needs.
    const productionUnits = [];

    function walk(node) {
        if (typeof node !== 'object' || node === null) return;
        if (node.type === 'recipe' && node.name && node.factory && node.factory.name) {
            const rawCount = parseFloat(node.factory.count);
            productionUnits.push({
                recipe: node.name,
                factory: node.factory.name,
                count: Math.max(1, Math.ceil(isNaN(rawCount) ? 1 : rawCount)),
            });
        }
        for (const value of Object.values(node)) {
            walk(value);
        }
    }

    walk(helmodData);

    if (productionUnits.length === 0) {
        throw new Error("No recipes with factories found in the Helmod data");
    }

    console.log("Extracted production units:");
    console.log(JSON.stringify(productionUnits, null, 2));
    return productionUnits;
}

// Furnaces and mining drills pick their recipe from what they're fed, and
// setting one in a blueprint is invalid.
function acceptsRecipe(factoryName) {
    return !/furnace|mining-drill|pumpjack/.test(factoryName);
}

// Attach each unit's belt-carried (item) ingredients and results from the
// vanilla recipe graph; Helmod exports don't carry ingredient lists.
function enrichUnits(units) {
    for (const unit of units) {
        const recipe = recipeGraph[unit.recipe];
        if (!recipe) {
            console.warn(`Recipe ${unit.recipe} not in vanilla data; its inputs won't be routed`);
            unit.ingredients = [];
            unit.results = [];
            continue;
        }
        const fluids = recipe.ingredients.filter(i => i.type === 'fluid');
        if (fluids.length) {
            console.warn(`${unit.recipe}: fluid ingredients not routed: ${fluids.map(f => f.name).join(', ')}`);
        }
        unit.ingredients = recipe.ingredients.filter(i => i.type === 'item');
        if (unit.ingredients.length > 3) {
            console.warn(`${unit.recipe}: only the first 3 item ingredients get a belt lane`);
            unit.ingredients = unit.ingredients.slice(0, 3);
        }
        unit.results = recipe.results.filter(i => i.type === 'item');
    }
    return units;
}

// Final products go west, raw producers east, so intermediate buses flow
// west from producers to consumers.
function sortUnits(units) {
    const depth = new Map();
    const consumersOf = unit =>
        units.filter(other => other !== unit &&
            other.ingredients.some(i => unit.results.some(r => r.name === i.name)));
    const calc = (unit, stack) => {
        if (depth.has(unit)) return depth.get(unit);
        if (stack.has(unit)) return 0; // recipe cycle; place arbitrarily
        stack.add(unit);
        const consumers = consumersOf(unit);
        const d = consumers.length ? 1 + Math.max(...consumers.map(c => calc(c, stack))) : 0;
        stack.delete(unit);
        depth.set(unit, d);
        return d;
    };
    units.forEach(u => calc(u, new Set()));
    return [...units].sort((a, b) => depth.get(a) - depth.get(b));
}

function createBlueprintFromHelmod(helmodData) {
    const productionUnits = sortUnits(enrichUnits(parseHelmodData(helmodData)));

    const blueprint = {
        blueprint: {
            icons: [
                {signal: {type: "item", name: productionUnits[0].factory}, index: 1}
            ],
            entities: [],
            item: "blueprint",
            label: "Helmod: " + productionUnits.map(u => u.recipe).join(', '),
            version: 281479275151360
        }
    };

    const entities = blueprint.blueprint.entities;
    let entityNumber = 1;
    const occupied = new Map();
    const add = (entity, tiles) => {
        for (const [tx, ty] of tiles || [[entity.position.x, entity.position.y]]) {
            const key = `${tx},${ty}`;
            if (occupied.has(key)) {
                console.warn(`Tile collision at ${key}: ${occupied.get(key)} vs ${entity.name}`);
            }
            occupied.set(key, entity.name);
        }
        entities.push({entity_number: entityNumber++, ...entity});
    };
    const belt = (x, y, direction) =>
        add({name: "transport-belt", position: {x, y}, direction});
    const underground = (x, y, direction, type) =>
        add({name: "underground-belt", position: {x, y}, direction, type});

    // Machines are 3x3 centered on (x, y); items flow west -> east through
    // them. Inserter direction in the blueprint format points at the tile the
    // inserter picks up FROM. Lane offsets from the column center, by
    // ingredient index: 0 -> normal inserter, 1 and 2 -> long-handed.
    const LANE_OFFSETS = [-3, -4, 4];
    const OUTPUT_OFFSET = 3;
    const COLUMN_SPACING = 10;
    const ROW_SPACING = 4;
    const MAX_PER_COLUMN = 15; // wrap tall recipes into multiple columns

    // 1. Plan columns.
    const columns = [];
    let nextX = 0;
    for (const unit of productionUnits) {
        console.log(`Adding ${unit.count}x ${unit.factory} for recipe ${unit.recipe}`);
        let remaining = unit.count;
        while (remaining > 0) {
            const count = Math.min(remaining, MAX_PER_COLUMN);
            columns.push({x: nextX, unit, count});
            nextX += COLUMN_SPACING;
            remaining -= count;
        }
    }

    // 2. Plan buses: one line per consumed item, in reserved rows above the
    // grid. Rows are 2 apart so branches can hop lower buses with underground
    // belts; 3 rows is the deepest a yellow underground can clear.
    const busByItem = new Map();
    for (const column of columns) {
        column.unit.ingredients.forEach((ingredient, laneIndex) => {
            if (!busByItem.has(ingredient.name)) {
                busByItem.set(ingredient.name, {item: ingredient.name, consumers: [], producers: []});
            }
            busByItem.get(ingredient.name).consumers.push({column, laneIndex});
        });
    }
    for (const column of columns) {
        for (const result of column.unit.results) {
            if (busByItem.has(result.name)) {
                busByItem.get(result.name).producers.push(column);
            }
        }
    }
    let buses = [...busByItem.values()];
    // Intermediates get the rows closest to the machines
    buses.sort((a, b) => (b.producers.length ? 1 : 0) - (a.producers.length ? 1 : 0));
    if (buses.length > 3) {
        const dropped = buses.slice(3);
        console.warn(`More than 3 items consumed; not routing: ${dropped.map(b => b.item).join(', ')}`);
        buses = buses.slice(0, 3);
    }
    buses.forEach((bus, i) => { bus.row = -4 - 2 * i; });
    const busFor = item => buses.find(b => b.item === item);

    // 3. Machines, inserters, poles and vertical lanes per column.
    for (const {x, unit, count} of columns) {
        const columnBottom = (count - 1) * ROW_SPACING + 1;

        for (let i = 0; i < count; i++) {
            const y = i * ROW_SPACING;
            const machine = {name: unit.factory, position: {x, y}};
            if (acceptsRecipe(unit.factory)) {
                machine.recipe = unit.recipe;
            }
            add(machine, [[x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
                          [x - 1, y], [x, y], [x + 1, y],
                          [x - 1, y + 1], [x, y + 1], [x + 1, y + 1]]);

            // Output inserter: machine -> east belt
            add({name: "inserter", position: {x: x + 2, y}, direction: 6});
            // Input inserters, one per ingredient lane
            if (unit.ingredients.length > 0) {
                add({name: "inserter", position: {x: x - 2, y}, direction: 6});
            }
            if (unit.ingredients.length > 1) {
                add({name: "long-handed-inserter", position: {x: x - 2, y: y + 1}, direction: 6});
            }
            if (unit.ingredients.length > 2) {
                add({name: "long-handed-inserter", position: {x: x + 2, y: y + 1}, direction: 2});
            }
            // Pole between machines covers inserters on both sides
            add({name: "medium-electric-pole", position: {x, y: y + 2}});
        }
        // Relay poles at the top keep neighboring columns connected
        add({name: "medium-electric-pole", position: {x: x - 2, y: -2}});
        add({name: "medium-electric-pole", position: {x: x + 2, y: -2}});

        // Ingredient lanes flow south; they are fed by bus taps in step 4.
        unit.ingredients.forEach((ingredient, laneIndex) => {
            const laneX = x + LANE_OFFSETS[laneIndex];
            for (let y = -1; y <= columnBottom; y++) {
                belt(laneX, y, 4);
            }
        });

        // Output lane: intermediates flow north into their bus, final
        // products flow south and pile up at the bottom.
        const outputX = x + OUTPUT_OFFSET;
        const feedsBus = unit.results.map(r => busFor(r.name)).find(Boolean);
        if (feedsBus) {
            for (let y = -1; y <= columnBottom; y++) {
                belt(outputX, y, 0);
            }
            if (feedsBus.row === -4) {
                belt(outputX, -2, 0);
                belt(outputX, -3, 0);
            } else {
                underground(outputX, -2, 0, "input");
                underground(outputX, feedsBus.row + 1, 0, "output");
            }
        } else {
            for (let y = -2; y <= columnBottom; y++) {
                belt(outputX, y, 4);
            }
        }
    }

    // 4. Bus lines with splitter taps dropping into each consumer lane.
    for (const bus of buses) {
        // Externals flow east from a west lead-in; intermediates flow west
        // from their producers (sorted east of consumers).
        const flowsEast = bus.producers.length === 0;
        const direction = flowsEast ? 2 : 6;
        const splitterXs = new Set();

        for (const {column, laneIndex} of bus.consumers) {
            const laneX = column.x + LANE_OFFSETS[laneIndex];
            const splitterX = flowsEast ? laneX - 1 : laneX + 1;
            splitterXs.add(splitterX);
            add({name: "splitter", position: {x: splitterX, y: bus.row + 0.5}, direction},
                [[splitterX, bus.row], [splitterX, bus.row + 1]]);
            // Branch from the splitter down into the lane
            if (bus.row === -4) {
                belt(laneX, -3, 4);
                belt(laneX, -2, 4);
            } else {
                underground(laneX, bus.row + 1, 4, "input");
                underground(laneX, -2, 4, "output");
            }
        }

        const tapXs = [...splitterXs];
        const feederXs = bus.producers.map(c => c.x + OUTPUT_OFFSET);
        const from = flowsEast ? Math.min(...tapXs) - 4 : Math.min(...tapXs);
        const to = flowsEast ? Math.max(...tapXs) : Math.max(...feederXs);
        for (let bx = from; bx <= to; bx++) {
            if (!splitterXs.has(bx)) {
                belt(bx, bus.row, direction);
            }
        }
        if (flowsEast) {
            // Label the feed point so a human knows what this lane takes
            add({
                name: "constant-combinator",
                position: {x: from - 1, y: bus.row},
                control_behavior: {
                    filters: [{signal: {type: "item", name: bus.item}, count: 1, index: 1}]
                }
            });
        }
        console.log(`Bus for ${bus.item} on row ${bus.row}, ` +
            `${flowsEast ? 'east from external input' : 'west from ' + bus.producers.length + ' producer columns'}, ` +
            `${bus.consumers.length} taps`);
    }

    console.log(`Total entities added: ${entities.length}`);
    return blueprint;
}

export function processHelmodString(helmodString) {
    console.log("Processing Helmod string:", helmodString);
    try {
        const helmodData = HelmodFactory.decodeHelmod(helmodString);
        console.log("Decoded Helmod data:", JSON.stringify(helmodData, null, 2));

        const blueprint = createBlueprintFromHelmod(helmodData);
        console.log("Created blueprint:", JSON.stringify(blueprint, null, 2));

        const encodedBlueprint = encodeBlueprint(blueprint);
        console.log("Encoded blueprint:", encodedBlueprint);

        return encodedBlueprint;
    } catch (error) {
        console.error("Error processing Helmod string:", error);
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid Helmod string format: ${error.message}`);
        } else if (error.message.includes('atob')) {
            throw new Error('Invalid base64 encoding in Helmod string');
        } else {
            throw new Error(`Failed to process Helmod string: ${error.message}`);
        }
    }
}
