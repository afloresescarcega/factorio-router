import { HelmodFactory } from './helmodFactory';
import { decodeBlueprint } from './blueprintFactory';
import { processHelmodString } from './main';

// Helper: build an encoded Helmod export string from a plain JS object shaped
// like Helmod's export data, the same way the real Helmod mod would.
function encodeHelmodData(data) {
  return HelmodFactory.encodeHelmod(data);
}

function recipeNode(name, factoryName, count) {
  return { type: 'recipe', name, factory: { name: factoryName, count } };
}

let logSpy, warnSpy, errorSpy;
beforeEach(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('processHelmodString error handling', () => {
  test('throws when no recipe nodes are present in the data', () => {
    const encoded = encodeHelmodData({ block: { name: 'not a recipe' } });
    expect(() => processHelmodString(encoded)).toThrow(
      /No recipes with factories found/
    );
  });

  test('wraps corrupted/non-base64 input in a descriptive error', () => {
    expect(() => processHelmodString('not valid base64 !!! %%%')).toThrow(
      /Failed to process Helmod string/
    );
  });

  test('wraps an empty string input in a descriptive error', () => {
    expect(() => processHelmodString('')).toThrow(/Failed to process Helmod string/);
  });
});

describe('processHelmodString basic conversion', () => {
  test('converts a single recipe unknown to the vanilla recipe graph', () => {
    const encoded = encodeHelmodData({
      root: recipeNode('totally-fake-recipe', 'assembling-machine-1', 1),
    });

    const result = processHelmodString(encoded);
    expect(typeof result).toBe('string');
    expect(result[0]).toBe('0');

    const decoded = decodeBlueprint(result);
    expect(decoded.blueprint.item).toBe('blueprint');
    expect(decoded.blueprint.icons[0].signal.name).toBe('assembling-machine-1');
    expect(decoded.blueprint.label).toContain('totally-fake-recipe');

    const machine = decoded.blueprint.entities.find(e => e.name === 'assembling-machine-1');
    expect(machine).toBeDefined();
    // Recipe not found in vanilla graph => no ingredients, still gets recipe set
    // (assembling machines accept an explicit recipe).
    expect(machine.recipe).toBe('totally-fake-recipe');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not in vanilla data')
    );
  });

  test('does not set a recipe on furnaces, mining drills or pumpjacks', () => {
    const encoded = encodeHelmodData({
      a: recipeNode('unknown-a', 'stone-furnace', 1),
      b: recipeNode('unknown-b', 'electric-mining-drill', 1),
      c: recipeNode('unknown-c', 'pumpjack', 1),
    });

    const decoded = decodeBlueprint(processHelmodString(encoded));
    const furnace = decoded.blueprint.entities.find(e => e.name === 'stone-furnace');
    const drill = decoded.blueprint.entities.find(e => e.name === 'electric-mining-drill');
    const pump = decoded.blueprint.entities.find(e => e.name === 'pumpjack');
    expect(furnace.recipe).toBeUndefined();
    expect(drill.recipe).toBeUndefined();
    expect(pump.recipe).toBeUndefined();
  });

  test('rounds up fractional factory counts and defaults invalid counts to 1', () => {
    const encoded = encodeHelmodData({
      // 2.4 factories => ceil to 3
      furnace: recipeNode('iron-plate', 'stone-furnace', 2.4),
      // Non-numeric count => NaN => defaults to 1
      assembler: recipeNode('iron-gear-wheel', 'assembling-machine-1', 'not-a-number'),
    });

    const decoded = decodeBlueprint(processHelmodString(encoded));
    const furnaces = decoded.blueprint.entities.filter(e => e.name === 'stone-furnace');
    const assemblers = decoded.blueprint.entities.filter(e => e.name === 'assembling-machine-1');
    expect(furnaces.length).toBe(3);
    expect(assemblers.length).toBe(1);
    // Furnace produces iron-plate consumed by the assembler => intermediate bus.
    expect(assemblers[0].recipe).toBe('iron-gear-wheel');
  });

  test('routes a chain of recipes through an intermediate bus', () => {
    const encoded = encodeHelmodData({
      producer: recipeNode('iron-plate', 'stone-furnace', 1),
      consumer: recipeNode('iron-gear-wheel', 'assembling-machine-1', 1),
    });

    const decoded = decodeBlueprint(processHelmodString(encoded));
    const entities = decoded.blueprint.entities;
    expect(entities.some(e => e.name === 'transport-belt')).toBe(true);
    expect(entities.some(e => e.name === 'inserter')).toBe(true);
    expect(entities.some(e => e.name === 'medium-electric-pole')).toBe(true);
    expect(entities.some(e => e.name === 'splitter')).toBe(true);
  });
});

describe('processHelmodString ingredient lane handling', () => {
  test('uses all three ingredient lanes (including long-handed inserters) for a 3-ingredient recipe', () => {
    // speed-module-2 needs exactly 3 item ingredients: speed-module,
    // advanced-circuit, processing-unit.
    const encoded = encodeHelmodData({
      root: recipeNode('speed-module-2', 'assembling-machine-2', 1),
    });
    const decoded = decodeBlueprint(processHelmodString(encoded));
    const entities = decoded.blueprint.entities;
    expect(entities.some(e => e.name === 'long-handed-inserter' && e.direction === 6)).toBe(true);
    expect(entities.some(e => e.name === 'long-handed-inserter' && e.direction === 2)).toBe(true);
  });

  test('warns and truncates to 3 lanes when a recipe has more than 3 item ingredients', () => {
    // bulk-inserter needs 4+ item ingredients.
    const encoded = encodeHelmodData({
      root: recipeNode('bulk-inserter', 'assembling-machine-2', 1),
    });
    processHelmodString(encoded);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('only the first 3 item ingredients get a belt lane')
    );
  });

  test('warns about unrouted fluid ingredients', () => {
    // sulfuric-acid needs sulfur + iron-plate (items) and water (fluid).
    const encoded = encodeHelmodData({
      root: recipeNode('sulfuric-acid', 'chemical-plant', 1),
    });
    processHelmodString(encoded);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('fluid ingredients not routed')
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('water'));
  });
});

describe('processHelmodString bus limits and column wrapping', () => {
  test('wraps a factory count greater than 15 into multiple columns', () => {
    const encoded = encodeHelmodData({
      root: recipeNode('unknown-big', 'assembling-machine-2', 20),
    });
    const decoded = decodeBlueprint(processHelmodString(encoded));
    const machines = decoded.blueprint.entities.filter(e => e.name === 'assembling-machine-2');
    expect(machines.length).toBe(20);
    const xs = new Set(machines.map(m => m.position.x));
    // 20 splits into a column of 15 at x=0 and a column of 5 at x=10.
    expect(xs.has(0)).toBe(true);
    expect(xs.has(10)).toBe(true);
  });

  test('drops buses beyond the first 3 distinct consumed items and warns', () => {
    // Chain: copper-ore -(furnace)-> copper-plate -(assembler)-> copper-cable
    // -(assembler)-> electronic-circuit, which also needs external iron-plate.
    // That is 4 distinct consumed items overall (copper-ore, copper-plate,
    // iron-plate, copper-cable) which exceeds the 3-bus limit.
    const encoded = encodeHelmodData({
      a: recipeNode('copper-plate', 'stone-furnace', 1),
      b: recipeNode('copper-cable', 'assembling-machine-1', 1),
      c: recipeNode('electronic-circuit', 'assembling-machine-2', 1),
    });

    const decoded = decodeBlueprint(processHelmodString(encoded));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('More than 3 items consumed')
    );
    // With multiple bus rows in play, at least one bus sits off the -4 row,
    // which routes through underground belts instead of plain belts.
    expect(decoded.blueprint.entities.some(e => e.name === 'underground-belt')).toBe(true);
    // An externally-fed bus gets a constant-combinator label.
    expect(decoded.blueprint.entities.some(e => e.name === 'constant-combinator')).toBe(true);
  });
});

describe('processHelmodString recursive extraction', () => {
  test('finds recipe nodes nested at arbitrary depth, ignoring non-recipe nodes', () => {
    const encoded = encodeHelmodData({
      wrapper: {
        list: {
          1: { type: 'block', name: 'ignored' },
          2: recipeNode('iron-gear-wheel', 'assembling-machine-1', 1),
        },
        note: 'irrelevant string node',
        flag: true,
      },
    });
    const decoded = decodeBlueprint(processHelmodString(encoded));
    expect(decoded.blueprint.entities.some(e => e.name === 'assembling-machine-1')).toBe(true);
  });
});
