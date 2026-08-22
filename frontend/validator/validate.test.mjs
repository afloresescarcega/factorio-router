// Tests for the blueprint-string validator (schema + Factorio name checks).
// Run with Node's built-in test runner: node --test validator/validate.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateBlueprintString, decodeBlueprintString } from './validate.mjs';
import { encodeBlueprint } from '../src/blueprintFactory.js';

function validBlueprint(overrides = {}) {
  return {
    blueprint: {
      icons: [{ signal: { type: 'item', name: 'transport-belt' }, index: 1 }],
      entities: [
        { entity_number: 1, name: 'transport-belt', position: { x: 0, y: 0 }, direction: 4 },
      ],
      item: 'blueprint',
      version: 281479275151360,
      ...overrides,
    },
  };
}

describe('decodeBlueprintString', () => {
  test('decodes a valid encoded blueprint string back into an object', () => {
    const bp = validBlueprint();
    const decoded = decodeBlueprintString(encodeBlueprint(bp));
    assert.deepEqual(decoded, bp);
  });

  test('tolerates surrounding whitespace/newlines in the string', () => {
    const bp = validBlueprint();
    const encoded = encodeBlueprint(bp);
    const withWhitespace = `  ${encoded.slice(0, 10)}\n${encoded.slice(10)}  \n`;
    const decoded = decodeBlueprintString(withWhitespace);
    assert.deepEqual(decoded, bp);
  });

  test('throws on corrupted/invalid data', () => {
    assert.throws(() => decodeBlueprintString('0not-valid-deflate-data'));
  });
});

describe('validateBlueprintString', () => {
  test('accepts a well-formed blueprint with valid entity names', () => {
    const result = validateBlueprintString(encodeBlueprint(validBlueprint()));
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
  });

  test('rejects an entity with a name unknown to Factorio', () => {
    const bp = validBlueprint();
    bp.blueprint.entities[0].name = 'not-a-real-entity';
    const result = validateBlueprintString(encodeBlueprint(bp));
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
    assert.match(result.errors[0], /entityName/);
  });

  test('rejects a blueprint missing required fields (icons)', () => {
    const bp = validBlueprint();
    delete bp.blueprint.icons;
    const result = validateBlueprintString(encodeBlueprint(bp));
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
  });

  test('rejects a recipe name unknown to Factorio', () => {
    const bp = validBlueprint();
    bp.blueprint.entities[0].name = 'assembling-machine-1';
    bp.blueprint.entities[0].recipe = 'not-a-real-recipe';
    const result = validateBlueprintString(encodeBlueprint(bp));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => /recipeName/.test(e)));
  });

  test('returns a corrupted-string error for garbage input instead of throwing', () => {
    const result = validateBlueprintString('0not-valid-base64-!!!');
    assert.equal(result.ok, false);
    assert.match(result.errors[0], /corrupted blueprint string/);
  });

  test('reports errors with a non-string data value without crashing', () => {
    const bp = validBlueprint();
    // entity_number must be an integer; make it a string to trigger a
    // schema error where e.data is not itself a string.
    bp.blueprint.entities[0].entity_number = 'one';
    const result = validateBlueprintString(encodeBlueprint(bp));
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
  });
});
