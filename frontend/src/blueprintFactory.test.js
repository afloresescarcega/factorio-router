import { encodeBlueprint, decodeBlueprint } from './blueprintFactory';

describe('blueprintFactory', () => {
  test('round-trips a simple blueprint object', () => {
    const blueprint = {
      blueprint: {
        icons: [{ signal: { type: 'item', name: 'iron-plate' }, index: 1 }],
        entities: [
          { entity_number: 1, name: 'transport-belt', position: { x: 0, y: 0 }, direction: 4 },
        ],
        item: 'blueprint',
        label: 'Test blueprint',
        version: 281479275151360,
      },
    };

    const encoded = encodeBlueprint(blueprint);
    expect(typeof encoded).toBe('string');
    // Version prefix character, per Factorio's blueprint string format.
    expect(encoded[0]).toBe('0');

    const decoded = decodeBlueprint(encoded);
    expect(decoded).toEqual(blueprint);
  });

  test('round-trips nested structures, booleans, negative numbers and nulls', () => {
    const blueprint = {
      blueprint: {
        entities: [
          {
            entity_number: 1,
            name: 'constant-combinator',
            position: { x: -3.5, y: 12 },
            control_behavior: {
              filters: [{ signal: { type: 'item', name: 'copper-plate' }, count: -1, index: 1 }],
              enabled: false,
            },
            note: null,
          },
        ],
        item: 'blueprint',
        version: 0,
      },
    };

    const decoded = decodeBlueprint(encodeBlueprint(blueprint));
    expect(decoded).toEqual(blueprint);
  });

  test('round-trips an empty entities array', () => {
    const blueprint = { blueprint: { entities: [], item: 'blueprint', version: 1 } };
    const decoded = decodeBlueprint(encodeBlueprint(blueprint));
    expect(decoded).toEqual(blueprint);
  });

  test('chunks large payloads without corrupting the data', () => {
    // Build a blueprint large enough to exceed the 0x8000-byte chunk size
    // used internally when converting the deflated bytes to a binary string.
    const entities = [];
    for (let i = 0; i < 5000; i++) {
      entities.push({
        entity_number: i + 1,
        name: 'transport-belt',
        position: { x: i, y: 0 },
        direction: 4,
      });
    }
    const blueprint = { blueprint: { entities, item: 'blueprint', version: 1 } };

    const encoded = encodeBlueprint(blueprint);
    const decoded = decodeBlueprint(encoded);
    expect(decoded.blueprint.entities.length).toBe(5000);
    expect(decoded).toEqual(blueprint);
  });
});
