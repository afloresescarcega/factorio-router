/*
 * Curated vanilla Factorio 2.0 recipe data for the deterministic planner.
 *
 * Source: Wube Software Ltd., factorio-data tag 2.0.72:
 * https://github.com/wube/factorio-data/blob/2.0.72/base/prototypes/recipe.lua
 *
 * `time` is the prototype's energy_required value in seconds.  Factorio
 * recipes without an explicit energy_required use the 0.5 second default.
 * This subset keeps solid-item, single-result recipes with no more than three
 * item ingredient types and only the crafting/smelting categories supported
 * by MACHINES below.  Dependencies that are outside this subset (for
 * example plastic-bar and explosives) are kept as their vanilla item names.
 */

export const RECIPES = [
  // Basic smelting
  {
    id: 'iron-plate',
    name: 'Iron plate',
    category: 'smelting',
    time: 3.2,
    ingredients: [{ name: 'iron-ore', amount: 1 }],
    results: [{ name: 'iron-plate', amount: 1 }],
  },
  {
    id: 'copper-plate',
    name: 'Copper plate',
    category: 'smelting',
    time: 3.2,
    ingredients: [{ name: 'copper-ore', amount: 1 }],
    results: [{ name: 'copper-plate', amount: 1 }],
  },
  {
    id: 'steel-plate',
    name: 'Steel plate',
    category: 'smelting',
    time: 16,
    ingredients: [{ name: 'iron-plate', amount: 5 }],
    results: [{ name: 'steel-plate', amount: 1 }],
  },
  {
    id: 'stone-brick',
    name: 'Stone brick',
    category: 'smelting',
    time: 3.2,
    ingredients: [{ name: 'stone', amount: 2 }],
    results: [{ name: 'stone-brick', amount: 1 }],
  },

  // Intermediate products
  {
    id: 'iron-stick',
    name: 'Iron stick',
    category: 'crafting',
    time: 0.5,
    ingredients: [{ name: 'iron-plate', amount: 1 }],
    results: [{ name: 'iron-stick', amount: 2 }],
  },
  {
    id: 'iron-gear-wheel',
    name: 'Iron gear wheel',
    category: 'crafting',
    time: 0.5,
    ingredients: [{ name: 'iron-plate', amount: 2 }],
    results: [{ name: 'iron-gear-wheel', amount: 1 }],
  },
  {
    id: 'copper-cable',
    name: 'Copper cable',
    category: 'crafting',
    time: 0.5,
    ingredients: [{ name: 'copper-plate', amount: 1 }],
    results: [{ name: 'copper-cable', amount: 2 }],
  },
  {
    id: 'electronic-circuit',
    name: 'Electronic circuit',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'iron-plate', amount: 1 },
      { name: 'copper-cable', amount: 3 },
    ],
    results: [{ name: 'electronic-circuit', amount: 1 }],
  },
  {
    id: 'advanced-circuit',
    name: 'Advanced circuit',
    category: 'crafting',
    time: 6,
    ingredients: [
      { name: 'electronic-circuit', amount: 2 },
      { name: 'plastic-bar', amount: 2 },
      { name: 'copper-cable', amount: 4 },
    ],
    results: [{ name: 'advanced-circuit', amount: 1 }],
  },

  // Science packs
  {
    id: 'automation-science-pack',
    name: 'Automation science pack',
    category: 'crafting',
    time: 5,
    ingredients: [
      { name: 'copper-plate', amount: 1 },
      { name: 'iron-gear-wheel', amount: 1 },
    ],
    results: [{ name: 'automation-science-pack', amount: 1 }],
  },
  {
    id: 'logistic-science-pack',
    name: 'Logistic science pack',
    category: 'crafting',
    time: 6,
    ingredients: [
      { name: 'inserter', amount: 1 },
      { name: 'transport-belt', amount: 1 },
    ],
    results: [{ name: 'logistic-science-pack', amount: 1 }],
  },
  {
    id: 'military-science-pack',
    name: 'Military science pack',
    category: 'crafting',
    time: 10,
    ingredients: [
      { name: 'piercing-rounds-magazine', amount: 1 },
      { name: 'grenade', amount: 1 },
      { name: 'stone-wall', amount: 2 },
    ],
    results: [{ name: 'military-science-pack', amount: 2 }],
  },

  // Belts and belt routing
  {
    id: 'transport-belt',
    name: 'Transport belt',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'iron-plate', amount: 1 },
      { name: 'iron-gear-wheel', amount: 1 },
    ],
    results: [{ name: 'transport-belt', amount: 2 }],
  },
  {
    id: 'fast-transport-belt',
    name: 'Fast transport belt',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'iron-gear-wheel', amount: 5 },
      { name: 'transport-belt', amount: 1 },
    ],
    results: [{ name: 'fast-transport-belt', amount: 1 }],
  },
  {
    id: 'underground-belt',
    name: 'Underground belt',
    category: 'crafting',
    time: 1,
    ingredients: [
      { name: 'iron-plate', amount: 10 },
      { name: 'transport-belt', amount: 5 },
    ],
    results: [{ name: 'underground-belt', amount: 2 }],
  },
  {
    id: 'fast-underground-belt',
    name: 'Fast underground belt',
    category: 'crafting',
    time: 2,
    ingredients: [
      { name: 'iron-gear-wheel', amount: 40 },
      { name: 'underground-belt', amount: 2 },
    ],
    results: [{ name: 'fast-underground-belt', amount: 2 }],
  },
  {
    id: 'splitter',
    name: 'Splitter',
    category: 'crafting',
    time: 1,
    ingredients: [
      { name: 'electronic-circuit', amount: 5 },
      { name: 'iron-plate', amount: 5 },
      { name: 'transport-belt', amount: 4 },
    ],
    results: [{ name: 'splitter', amount: 1 }],
  },
  {
    id: 'fast-splitter',
    name: 'Fast splitter',
    category: 'crafting',
    time: 2,
    ingredients: [
      { name: 'splitter', amount: 1 },
      { name: 'iron-gear-wheel', amount: 10 },
      { name: 'electronic-circuit', amount: 10 },
    ],
    results: [{ name: 'fast-splitter', amount: 1 }],
  },

  // Inserters
  {
    id: 'inserter',
    name: 'Inserter',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'electronic-circuit', amount: 1 },
      { name: 'iron-gear-wheel', amount: 1 },
      { name: 'iron-plate', amount: 1 },
    ],
    results: [{ name: 'inserter', amount: 1 }],
  },
  {
    id: 'fast-inserter',
    name: 'Fast inserter',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'electronic-circuit', amount: 2 },
      { name: 'iron-plate', amount: 2 },
      { name: 'inserter', amount: 1 },
    ],
    results: [{ name: 'fast-inserter', amount: 1 }],
  },
  {
    id: 'long-handed-inserter',
    name: 'Long-handed inserter',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'iron-gear-wheel', amount: 1 },
      { name: 'iron-plate', amount: 1 },
      { name: 'inserter', amount: 1 },
    ],
    results: [{ name: 'long-handed-inserter', amount: 1 }],
  },

  // Production and research machines
  {
    id: 'offshore-pump',
    name: 'Offshore pump',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'pipe', amount: 3 },
      { name: 'iron-gear-wheel', amount: 2 },
    ],
    results: [{ name: 'offshore-pump', amount: 1 }],
  },
  {
    id: 'electric-mining-drill',
    name: 'Electric mining drill',
    category: 'crafting',
    time: 2,
    ingredients: [
      { name: 'electronic-circuit', amount: 3 },
      { name: 'iron-gear-wheel', amount: 5 },
      { name: 'iron-plate', amount: 10 },
    ],
    results: [{ name: 'electric-mining-drill', amount: 1 }],
  },
  {
    id: 'assembling-machine-1',
    name: 'Assembling machine 1',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'electronic-circuit', amount: 3 },
      { name: 'iron-gear-wheel', amount: 5 },
      { name: 'iron-plate', amount: 9 },
    ],
    results: [{ name: 'assembling-machine-1', amount: 1 }],
  },
  {
    id: 'assembling-machine-3',
    name: 'Assembling machine 3',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'speed-module', amount: 4 },
      { name: 'assembling-machine-2', amount: 2 },
    ],
    results: [{ name: 'assembling-machine-3', amount: 1 }],
  },
  {
    id: 'electric-furnace',
    name: 'Electric furnace',
    category: 'crafting',
    time: 5,
    ingredients: [
      { name: 'steel-plate', amount: 10 },
      { name: 'advanced-circuit', amount: 5 },
      { name: 'stone-brick', amount: 10 },
    ],
    results: [{ name: 'electric-furnace', amount: 1 }],
  },
  {
    id: 'lab',
    name: 'Lab',
    category: 'crafting',
    time: 2,
    ingredients: [
      { name: 'electronic-circuit', amount: 10 },
      { name: 'iron-gear-wheel', amount: 10 },
      { name: 'transport-belt', amount: 4 },
    ],
    results: [{ name: 'lab', amount: 1 }],
  },
  {
    id: 'radar',
    name: 'Radar',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'electronic-circuit', amount: 5 },
      { name: 'iron-gear-wheel', amount: 5 },
      { name: 'iron-plate', amount: 10 },
    ],
    results: [{ name: 'radar', amount: 1 }],
  },

  // Power distribution
  {
    id: 'small-electric-pole',
    name: 'Small electric pole',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'wood', amount: 1 },
      { name: 'copper-cable', amount: 2 },
    ],
    results: [{ name: 'small-electric-pole', amount: 2 }],
  },
  {
    id: 'medium-electric-pole',
    name: 'Medium electric pole',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'iron-stick', amount: 4 },
      { name: 'steel-plate', amount: 2 },
      { name: 'copper-cable', amount: 2 },
    ],
    results: [{ name: 'medium-electric-pole', amount: 1 }],
  },
  {
    id: 'big-electric-pole',
    name: 'Big electric pole',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'iron-stick', amount: 8 },
      { name: 'steel-plate', amount: 5 },
      { name: 'copper-cable', amount: 4 },
    ],
    results: [{ name: 'big-electric-pole', amount: 1 }],
  },
  {
    id: 'substation',
    name: 'Substation',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'steel-plate', amount: 10 },
      { name: 'advanced-circuit', amount: 5 },
      { name: 'copper-cable', amount: 6 },
    ],
    results: [{ name: 'substation', amount: 1 }],
  },
  {
    id: 'solar-panel',
    name: 'Solar panel',
    category: 'crafting',
    time: 10,
    ingredients: [
      { name: 'steel-plate', amount: 5 },
      { name: 'electronic-circuit', amount: 15 },
      { name: 'copper-plate', amount: 5 },
    ],
    results: [{ name: 'solar-panel', amount: 1 }],
  },

  // Utility and defense
  {
    id: 'pipe',
    name: 'Pipe',
    category: 'crafting',
    time: 0.5,
    ingredients: [{ name: 'iron-plate', amount: 1 }],
    results: [{ name: 'pipe', amount: 1 }],
  },
  {
    id: 'repair-pack',
    name: 'Repair pack',
    category: 'crafting',
    time: 0.5,
    ingredients: [
      { name: 'electronic-circuit', amount: 2 },
      { name: 'iron-gear-wheel', amount: 2 },
    ],
    results: [{ name: 'repair-pack', amount: 1 }],
  },
  {
    id: 'stone-wall',
    name: 'Stone wall',
    category: 'crafting',
    time: 0.5,
    ingredients: [{ name: 'stone-brick', amount: 5 }],
    results: [{ name: 'stone-wall', amount: 1 }],
  },
  {
    id: 'gun-turret',
    name: 'Gun turret',
    category: 'crafting',
    time: 8,
    ingredients: [
      { name: 'iron-gear-wheel', amount: 10 },
      { name: 'copper-plate', amount: 10 },
      { name: 'iron-plate', amount: 20 },
    ],
    results: [{ name: 'gun-turret', amount: 1 }],
  },

  // Weapons and ammunition
  {
    id: 'firearm-magazine',
    name: 'Firearm magazine',
    category: 'crafting',
    time: 1,
    ingredients: [{ name: 'iron-plate', amount: 4 }],
    results: [{ name: 'firearm-magazine', amount: 1 }],
  },
  {
    id: 'submachine-gun',
    name: 'Submachine gun',
    category: 'crafting',
    time: 10,
    ingredients: [
      { name: 'iron-gear-wheel', amount: 10 },
      { name: 'copper-plate', amount: 5 },
      { name: 'iron-plate', amount: 10 },
    ],
    results: [{ name: 'submachine-gun', amount: 1 }],
  },
  {
    id: 'piercing-rounds-magazine',
    name: 'Piercing rounds magazine',
    category: 'crafting',
    time: 6,
    ingredients: [
      { name: 'firearm-magazine', amount: 2 },
      { name: 'steel-plate', amount: 1 },
      { name: 'copper-plate', amount: 2 },
    ],
    results: [{ name: 'piercing-rounds-magazine', amount: 2 }],
  },
  {
    id: 'grenade',
    name: 'Grenade',
    category: 'crafting',
    time: 8,
    ingredients: [
      { name: 'iron-plate', amount: 5 },
      { name: 'coal', amount: 10 },
    ],
    results: [{ name: 'grenade', amount: 1 }],
  },
  {
    id: 'shotgun-shell',
    name: 'Shotgun shell',
    category: 'crafting',
    time: 3,
    ingredients: [
      { name: 'copper-plate', amount: 2 },
      { name: 'iron-plate', amount: 2 },
    ],
    results: [{ name: 'shotgun-shell', amount: 1 }],
  },
  {
    id: 'piercing-shotgun-shell',
    name: 'Piercing shotgun shell',
    category: 'crafting',
    time: 8,
    ingredients: [
      { name: 'shotgun-shell', amount: 2 },
      { name: 'copper-plate', amount: 5 },
      { name: 'steel-plate', amount: 2 },
    ],
    results: [{ name: 'piercing-shotgun-shell', amount: 1 }],
  },
  {
    id: 'cannon-shell',
    name: 'Cannon shell',
    category: 'crafting',
    time: 8,
    ingredients: [
      { name: 'steel-plate', amount: 2 },
      { name: 'plastic-bar', amount: 2 },
      { name: 'explosives', amount: 1 },
    ],
    results: [{ name: 'cannon-shell', amount: 1 }],
  },
  {
    id: 'rocket',
    name: 'Rocket',
    category: 'crafting',
    time: 8,
    ingredients: [
      { name: 'explosives', amount: 1 },
      { name: 'iron-plate', amount: 2 },
    ],
    results: [{ name: 'rocket', amount: 1 }],
  },
];

export const MACHINES = {
  'assembling-machine-1': {
    name: 'Assembling machine 1',
    speed: 0.5,
    category: 'crafting',
  },
  'assembling-machine-2': {
    name: 'Assembling machine 2',
    speed: 0.75,
    category: 'crafting',
  },
  'assembling-machine-3': {
    name: 'Assembling machine 3',
    speed: 1.25,
    category: 'crafting',
  },
  'electric-furnace': {
    name: 'Electric furnace',
    speed: 2,
    category: 'smelting',
  },
};

export default { RECIPES, MACHINES };
