import Blueprint from "https://esm.sh/v87/factorio-blueprint@2.4.0/es2022/factorio-blueprint.js";

const myBlueprint = new Blueprint();
myBlueprint.createEntity("transport-belt", { x: 0, y: 0 }, Blueprint.UP);
console.log(myBlueprint.encode());
