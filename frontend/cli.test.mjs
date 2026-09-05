import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { HelmodFactory } from "./src/helmodFactory.js";
import { decodeBlueprint } from "./src/blueprintFactory.js";

const run = (input, args = []) =>
  spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./cli.mjs", import.meta.url)), ...args],
    { input, encoding: "utf8" },
  );
const helmod = HelmodFactory.encodeHelmod({
  root: {
    type: "recipe",
    name: "iron-gear-wheel",
    factory: { name: "assembling-machine-1", count: 1 },
  },
});

test("native CLI normalizes second and belt units and validates Space Age entities", () => {
  for (const [rateUnit, rate] of [["items/min", 7200], ["items/s", 120], ["belts", 0.5]]) {
    const result = run(JSON.stringify({
      belt: "turbo-transport-belt", inputStackSize: 4, outputStackSize: 4,
      rateUnit, outputs: [{ recipe: "copper-cable", rate }], layoutMode: "compact",
    }), ["--plan"]);
    assert.equal(result.status, 0, result.stderr);
    const blueprint = decodeBlueprint(result.stdout.trim()).blueprint;
    assert.match(blueprint.description, /7,200\/min/);
    assert.ok(blueprint.entities.some((entity) => entity.name === "turbo-underground-belt"));
    const inserters = blueprint.entities.filter((entity) => entity.name === "stack-inserter");
    assert.equal(inserters.length, 40);
    assert.ok(inserters.every((entity) => entity.override_stack_size === 4));
  }
});

test("native CLI never emits blueprints for invalid Space Age constraints", () => {
  for (const patch of [
    { outputStackSize: 5 }, { inputStackSize: 1.5 }, { rateUnit: "belt/s" },
    { outputs: [{ recipe: "copper-cable", rate: 0.501 }] },
    { inputStackSize: 1 }, { inputLimits: { "copper-plate": 0.249 } },
  ]) {
    const result = run(JSON.stringify({
      belt: "turbo-transport-belt", rateUnit: "belts", inputStackSize: 4, outputStackSize: 4,
      outputs: [{ recipe: "copper-cable", rate: 0.5 }], ...patch,
    }), ["--plan"]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.length > 0);
  }
});

test("CLI accepts optional Helmod and keeps stdout clean even in debug mode", () => {
  for (const args of [[], ["--debug"]]) {
    const result = run(helmod, args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim().split("\n").length, 1);
    assert.equal(
      decodeBlueprint(result.stdout.trim()).blueprint.item,
      "blueprint",
    );
    assert.match(result.stderr, /passed schema/);
  }
});

test("CLI accepts a native production plan with no Helmod", () => {
  const result = run(
    JSON.stringify({ outputs: [{ recipe: "electronic-circuit", rate: 60 }] }),
    ["--plan"],
  );
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    decodeBlueprint(result.stdout.trim()).blueprint.entities.some(
      (entity) => entity.recipe === "electronic-circuit",
    ),
  );
});

test("CLI supports compact native configuration and --compact for both input formats", () => {
  const input = { outputs: [{ recipe: "electronic-circuit", rate: 60 }] };
  const standard = run(JSON.stringify(input), ["--plan"]);
  const compact = run(JSON.stringify(input), ["--plan", "--compact"]);
  const configured = run(JSON.stringify({ ...input, layoutMode: "compact" }), [
    "--plan",
  ]);
  for (const result of [standard, compact, configured])
    assert.equal(result.status, 0, result.stderr);
  assert.equal(compact.stdout, configured.stdout);
  assert.notEqual(compact.stdout, standard.stdout);
  const compactHelmod = run(helmod, ["--compact", "--debug"]);
  assert.equal(compactHelmod.status, 0, compactHelmod.stderr);
  assert.match(compactHelmod.stderr, /"layoutMode": "compact"/);
  assert.notEqual(compactHelmod.stdout, run(helmod).stdout);
  assert.equal(
    decodeBlueprint(compactHelmod.stdout.trim()).blueprint.entities.filter(
      (entity) => entity.recipe === "iron-gear-wheel",
    ).length,
    1,
  );
});

test("CLI fails cleanly on invalid or infeasible inputs without emitting a blueprint", () => {
  for (const [input, args] of [
    ["bad!", []],
    ["{", ["--plan"]],
    [JSON.stringify({ inputLimits: { "iron-plate": 0 } }), ["--plan"]],
    [JSON.stringify({ layoutMode: "unknown" }), ["--plan"]],
  ]) {
    const result = run(input, args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.length > 0);
  }
});
