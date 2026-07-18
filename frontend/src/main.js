import { HelmodFactory } from './helmodFactory.js';
import { encodeBlueprint } from './blueprintFactory.js';

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

function createBlueprintFromHelmod(helmodData) {
    const productionUnits = parseHelmodData(helmodData);

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
    const add = (entity) => entities.push({entity_number: entityNumber++, ...entity});

    // One column per recipe. Machines are 3x3 centered on (x, y); items flow
    // west -> east: input belt line, input inserter, machine, output inserter,
    // output belt line. Inserter direction in the blueprint format points at
    // the tile the inserter picks up FROM.
    const COLUMN_SPACING = 8; // input belt of col N is 2 east of output belt of col N-1
    const ROW_SPACING = 4;

    let x = 0;
    for (const unit of productionUnits) {
        console.log(`Adding ${unit.count}x ${unit.factory} for recipe ${unit.recipe}`);
        let y = 0;
        for (let i = 0; i < unit.count; i++) {
            const machine = {
                name: unit.factory,
                position: {x, y},
            };
            if (acceptsRecipe(unit.factory)) {
                machine.recipe = unit.recipe;
            }
            add(machine);

            // Input inserter: picks up from the west belt, drops into machine
            add({name: "inserter", position: {x: x - 2, y}, direction: 6});
            // Output inserter: picks up from the machine, drops on the east belt
            add({name: "inserter", position: {x: x + 2, y}, direction: 6});
            // Power: medium pole at the machine's NW corner reaches the whole
            // machine and the next pole in the column
            add({name: "medium-electric-pole", position: {x: x - 2, y: y - 2}});

            y += ROW_SPACING;
        }

        // Continuous belt lines flowing south along both sides of the column
        const columnHeight = (unit.count - 1) * ROW_SPACING;
        for (let beltY = -2; beltY <= columnHeight + 1; beltY++) {
            add({name: "transport-belt", position: {x: x - 3, y: beltY}, direction: 4});
            add({name: "transport-belt", position: {x: x + 3, y: beltY}, direction: 4});
        }

        x += COLUMN_SPACING;
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
