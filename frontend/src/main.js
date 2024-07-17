import { HelmodFactory } from './helmodFactory.js';
import { encodeBlueprint } from './blueprintFactory.js';

function parseHelmodData(helmodData) {
    const recipes = {};
    console.log("Parsing Helmod data:");
    console.log(JSON.stringify(helmodData, null, 2));

    function processBlock(block) {
        if (typeof block === 'object' && block !== null) {
            if (block.name && block.type === 'item') {
                recipes[block.name] = Math.max(block.count || 1, 1);
            }
            for (const [key, value] of Object.entries(block)) {
                processBlock(value);
            }
        }
    }

    processBlock(helmodData);

    if (Object.keys(recipes).length === 0) {
        recipes['iron-plate'] = 1;
    }

    console.log("Extracted recipes:");
    console.log(JSON.stringify(recipes, null, 2));
    return recipes;
}

function createBlueprintFromHelmod(helmodData) {
    const recipes = parseHelmodData(helmodData);

    const blueprint = {
        blueprint: {
            icons: [
                {signal: {type: "item", name: "assembling-machine-1"}, index: 1}
            ],
            entities: [],
            item: "blueprint",
            version: 281479275151360
        }
    };

    console.log("Creating blueprint:");
    let entityNumber = 1;
    let x = 0, y = 0;
    for (const [recipe, count] of Object.entries(recipes)) {
        console.log(`Adding recipe: ${recipe} (count: ${count})`);
        for (let i = 0; i < Math.max(parseInt(count), 1); i++) {
            // Add assembling machine
            blueprint.blueprint.entities.push({
                entity_number: entityNumber,
                name: "assembling-machine-1",
                position: {x, y},
                recipe: recipe
            });
            entityNumber++;

            // Add inserters
            const inserterPositions = [
                {x: x - 1, y: y, direction: 2},
                {x: x + 1, y: y, direction: 6},
                {x: x, y: y - 1, direction: 0},
                {x: x, y: y + 1, direction: 4},
            ];

            for (const pos of inserterPositions) {
                blueprint.blueprint.entities.push({
                    entity_number: entityNumber,
                    name: "inserter",
                    position: {x: pos.x, y: pos.y},
                    direction: pos.direction
                });
                entityNumber++;
            }

            // Add transport belts
            const beltPositions = [
                {x: x - 2, y: y, direction: 2},
                {x: x + 2, y: y, direction: 6},
                {x: x, y: y - 2, direction: 0},
                {x: x, y: y + 2, direction: 4},
            ];

            for (const pos of beltPositions) {
                blueprint.blueprint.entities.push({
                    entity_number: entityNumber,
                    name: "transport-belt",
                    position: {x: pos.x, y: pos.y},
                    direction: pos.direction
                });
                entityNumber++;
            }

            y += 6;
        }
        x += 6;
        y = 0;
    }

    console.log(`Total entities added: ${blueprint.blueprint.entities.length}`);
    return blueprint;
}

export function processHelmodString(helmodString) {
    const helmodData = HelmodFactory.decodeHelmod(helmodString);
    const blueprint = createBlueprintFromHelmod(helmodData);

    console.log("Final blueprint structure:");
    console.log(JSON.stringify(blueprint, null, 2));

    const encodedBlueprint = encodeBlueprint(blueprint);
    console.log("Encoded blueprint:");
    console.log(encodedBlueprint);

    return encodedBlueprint;
}
