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