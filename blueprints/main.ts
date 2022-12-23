import Blueprint from "https://esm.sh/v87/factorio-blueprint@2.4.0/es2022/factorio-blueprint.js";

import DEFAULT_ENTITIES from "https://esm.sh/v87/factorio-blueprint@2.4.0/es2022/factorio-blueprint.js";
// import generateElectricalConnections from "https://esm.sh/v87/factorio-blueprint@2.4.0/es2022/factorio-blueprint.js";


let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();
let pos:InstanceType<typeof Blueprint.position> = {x: 0, y: 0};
myBlueprint.createEntity("assembling_machine_1", { x: 0, y: 0 }, Blueprint.UP);

add_inserters(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, myBlueprint, pos);
console.log(myBlueprint.encode());


export function validate_io_orientations(entity: InstanceType<typeof Blueprint.entity>, orientations: string[]) {
    if (orientations.length !== 2 * (entity.width + entity.height)) {
        throw TypeError("Orientations array must have exactly the number of I/O slots as entity " +
            `being passed in. i.e. 2 * (width+height). Orientations length: ${orientations.length}. Required length ${2 * (entity.width + entity.height)}`);
    }
    return true
}

export function add_single_assembler(blueprint: InstanceType<typeof Blueprint>, position:InstanceType<typeof Blueprint.position>, recipeName: string = "splitter") {
    console.log("pos: " + position.x + " " + position.y);
    let entity2 = blueprint.createEntity("underground-belt", { x: position.x + 0.5, y: position.y + 1.5 }, 6); // top splitter output
    entity2.setDirectionType("output");
    blueprint.createEntity("transport-belt", { x: position.x + 0.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 2.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 1.5 }, 4); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 2.5, y: position.y + 1.5 }, 6); // top left corner
    blueprint.createEntity("underground-belt", { x: position.x + 4.5, y: position.y + 1.5 }, 6); // top left corner
    blueprint.createEntity("splitter", { x: position.x + 3.5, y: position.y + 0 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 4.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 6.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 6.5, y: position.y + 1.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 5.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 5.5, y: position.y + 1.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 8.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 8.5, y: position.y + 1.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 1.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 9.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 10.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 9.5, y: position.y + 1.5 }, 6); // top left corner
    blueprint.createEntity("splitter", { x: position.x + 10.5, y: position.y + 1 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 11.5, y: position.y + 0.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 11.5, y: position.y + 1.5 }, 6); // top left corner
    let entity1 = blueprint.createEntity("underground-belt", { x: position.x + 0.5, y: position.y + 2.5 }, 6); // output middle line
    entity1.setDirectionType("output");
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 3.5 }, 4); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 2.5 }, 4); // top left corner
    blueprint.createEntity("underground-belt", { x: position.x + 4.5, y: position.y + 2.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 5.5, y: position.y + 2.5 }, 6); // top left corner
    blueprint.createEntity("splitter", { x: position.x + 6.5, y: position.y + 2 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 5.5, y: position.y + 3.5 }, 4); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 3.5 }, 4); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 8.5, y: position.y + 3.5 }, 6); // top left corner
    let entity = blueprint.createEntity("underground-belt", { x: position.x + 8.5, y: position.y + 2.5 }, 6); // output bottom line
    entity.setDirectionType("output");
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 2.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 9.5, y: position.y + 3.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 9.5, y: position.y + 2.5 }, 4); // top left corner
    blueprint.createEntity("underground-belt", { x: position.x + 11.5, y: position.y + 2.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 5.5 }, 4); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 4.5 }, 4); // top left corner
    blueprint.createEntity("splitter", { x: position.x + 4.5, y: position.y + 4 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 5.5, y: position.y + 4.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 5.5 }, 4); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 4.5 }, 4); // top left corner
    blueprint.createEntity("small-electric-pole", { x: position.x + 11.5, y: position.y + 5.5 }, 0); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 7.5 }, 4); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 6.5 }, 4); // top left corner
    blueprint.createEntity("inserter", { x: position.x + 4.5, y: position.y + 6.5 }, 0); // top left corner
    blueprint.createEntity("small-electric-pole", { x: position.x + 6.5, y: position.y + 6.5 }, 0); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 7.5 }, 4); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 6.5 }, 4); // top left corner
    blueprint.createEntity("inserter", { x: position.x + 2.5, y: position.y + 8.5 }, 6); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 8.5 }, 4); // top left corner
    blueprint.createEntity("inserter", { x: position.x + 6.5, y: position.y + 8.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 8.5 }, 4); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 0.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("small-electric-pole", { x: position.x + 2.5, y: position.y + 10.5 }, 0); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 2.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 1.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("inserter", { x: position.x + 4.5, y: position.y + 10.5 }, 0); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 4.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 3.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 6.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 5.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 8.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 7.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 10.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 9.5, y: position.y + 11.5 }, 2); // top left corner
    blueprint.createEntity("transport-belt", { x: position.x + 11.5, y: position.y + 11.5 }, 2); // top left corner
    let assembler = blueprint.createEntity("assembling-machine-1", { x: position.x + 3.5, y: position.y + 7.5 }, 0); // top left corner
    assembler.setRecipe(recipeName);
}

export function add_inserters(entity: InstanceType<typeof Blueprint.entity>, blueprint: InstanceType<typeof Blueprint>, position:InstanceType<typeof Blueprint.position>, orientations?:string[]) {
    if (orientations) {
        validate_io_orientations(entity, orientations);
    }

    console.log("entity's pos: " + position.x + " " + position.y);
    blueprint.createEntity("medium_electric_pole", { x: position.x - 1, y: position.y -1 }, Blueprint.DOWN); // top left corner
    blueprint.createEntity("medium_electric_pole", { x: position.x + entity.width, y: position.y - 1 }, Blueprint.DOWN); // top right corner
    // clockwise starting from top, ending at left

    let orientations_index = 0;
    for (let x_i = 0; x_i < entity.width; x_i++) {
        if(orientations && orientations[orientations_index] !== "")
        {
            if(orientations[orientations_index] === 'o') {
                blueprint.createEntity("inserter", {x: x_i + position.x, y: -1 + position.y}, Blueprint.DOWN); // top
            } else if(orientations[orientations_index] === 'i'){
                blueprint.createEntity("inserter", {x: x_i + position.x, y: -1 + position.y}, Blueprint.UP); // top
            }
        }
        orientations_index++;
    }

    for (let y_i = 0; y_i < entity.height; y_i++) {
        if(orientations && orientations[orientations_index] !== "")
        {
            if(orientations[orientations_index] === 'o') {
                blueprint.createEntity("inserter", { x: entity.width + position.x, y: y_i + position.y }, Blueprint.LEFT); // right
            } else if(orientations[orientations_index] === 'i'){
                blueprint.createEntity("inserter", { x: entity.width + position.x, y: y_i + position.y }, Blueprint.RIGHT); // right
            }
        }
        orientations_index++;
    }

    for (let x_i = 0; x_i < entity.width; x_i++) {
        if(orientations && orientations[orientations_index] !== ""){
            if(orientations[orientations_index] === 'o') {
                blueprint.createEntity("inserter", { x: x_i + position.x, y: entity.height + position.y }, Blueprint.UP); // bottom
            } else if(orientations[orientations_index] === 'i'){
                blueprint.createEntity("inserter", { x: x_i + position.x, y: entity.height  + position.y}, Blueprint.DOWN); // bottom
            }
        }
        orientations_index++;
    }

    for (let y_i = 0; y_i < entity.height; y_i++) {
        if(orientations && orientations[orientations_index] !== ""){
            if(orientations[orientations_index] === 'o') {
                blueprint.createEntity("inserter", { x: -1 + position.x, y: y_i + position.y }, Blueprint.RIGHT); // left
            } else if(orientations[orientations_index] === 'i'){
                blueprint.createEntity("inserter", { x: -1 + position.x, y: y_i + position.y }, Blueprint.LEFT); // left
            }
        }
        orientations_index++;
    }
}