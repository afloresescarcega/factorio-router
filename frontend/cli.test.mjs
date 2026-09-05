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

test("CLI fails cleanly on invalid or infeasible inputs without emitting a blueprint", () => {
  for (const [input, args] of [
    ["bad!", []],
    ["{", ["--plan"]],
    [JSON.stringify({ inputLimits: { "iron-plate": 0 } }), ["--plan"]],
  ]) {
    const result = run(input, args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.length > 0);
  }
});
