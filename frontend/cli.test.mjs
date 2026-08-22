// Tests for the stdin->stdout CLI wrapper. cli.mjs is a top-level script
// with import-time side effects (it reads stdin immediately), so it's
// exercised end-to-end via child_process rather than imported directly.
// Run with: node --test cli.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HelmodFactory } from './src/helmodFactory.js';
import { decodeBlueprint } from './src/blueprintFactory.js';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = join(here, 'cli.mjs');

function runCli(input, args = []) {
  return spawnSync('node', [cliPath, ...args], {
    input,
    encoding: 'utf-8',
  });
}

function validHelmodInput() {
  return HelmodFactory.encodeHelmod({
    root: {
      type: 'recipe',
      name: 'iron-gear-wheel',
      factory: { name: 'assembling-machine-1', count: 1 },
    },
  });
}

describe('cli.mjs', () => {
  test('prints a valid blueprint string and exits 0 for valid input', () => {
    const result = runCli(validHelmodInput());
    assert.equal(result.status, 0);
    const stdout = result.stdout.trim();
    assert.equal(stdout[0], '0');
    // Should decode to an actual blueprint object.
    const decoded = decodeBlueprint(stdout);
    assert.equal(decoded.blueprint.item, 'blueprint');
    // Non-debug runs keep stdout clean (no console.log noise mixed in).
    assert.equal(stdout.split('\n').length, 1);
    assert.match(result.stderr, /Blueprint passed schema \+ name validation\./);
  });

  test('dumps decoded stages to stderr under --debug, blueprint string as the last stdout line', () => {
    const result = runCli(validHelmodInput(), ['--debug']);
    assert.equal(result.status, 0);
    assert.match(result.stderr, /=== decoded helmod data ===/);
    assert.match(result.stderr, /=== round-trip decoded blueprint ===/);
    // Under --debug, main.js's own console.log calls are left active (they
    // write verbose JSON dumps to stdout too), so unlike the non-debug case
    // stdout isn't a single clean line -- but the final line is still the
    // blueprint string.
    const lines = result.stdout.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    assert.equal(lastLine[0], '0');
    assert.doesNotThrow(() => decodeBlueprint(lastLine));
  });

  test('exits non-zero and reports schema validation failures for an invalid blueprint', () => {
    const badInput = HelmodFactory.encodeHelmod({
      root: {
        type: 'recipe',
        name: 'iron-gear-wheel',
        factory: { name: 'not-a-real-factory', count: 1 },
      },
    });
    const result = runCli(badInput);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Blueprint failed validation:/);
    assert.match(result.stderr, /itemFluidSignalRecipeEntityName|entityName/);
  });

  test('exits non-zero for input that cannot be decoded at all', () => {
    const result = runCli('not a valid helmod export string !!!');
    assert.notEqual(result.status, 0);
  });
});
