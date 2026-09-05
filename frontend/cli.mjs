#!/usr/bin/env node
// Shared planner CLI: Helmod on stdin by default, or native config with --plan.
import { readFileSync } from "node:fs";
import { planHelmodString } from "./src/main.js";
import { planProduction, DEFAULT_CONFIG } from "./src/planner.js";
import { createLayout } from "./src/layout.js";
import { encodeBlueprint } from "./src/blueprintFactory.js";
import { validateBlueprintString } from "./validator/validate.mjs";

try {
  const input = readFileSync(0, "utf8").trim();
  const overrides = process.argv.includes("--compact")
    ? { layoutMode: "compact" }
    : {};
  const plan = process.argv.includes("--plan")
    ? planProduction({ ...DEFAULT_CONFIG, ...JSON.parse(input), ...overrides })
    : planHelmodString(input, overrides);
  const layout = createLayout(plan);
  const encoded = encodeBlueprint(layout.blueprint);
  const result = validateBlueprintString(encoded);
  if (!result.ok)
    throw new Error(
      "Blueprint failed validation:\n" + result.errors.join("\n"),
    );
  if (process.argv.includes("--debug"))
    process.stderr.write(
      JSON.stringify({ plan, blueprint: layout.blueprint }, null, 2) + "\n",
    );
  process.stderr.write("Blueprint passed schema + name validation.\n");
  process.stdout.write(encoded + "\n");
} catch (error) {
  process.stderr.write(error.message + "\n");
  process.exitCode = 1;
}
