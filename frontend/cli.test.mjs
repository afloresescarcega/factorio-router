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
