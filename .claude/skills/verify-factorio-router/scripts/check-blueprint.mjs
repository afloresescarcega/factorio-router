#!/usr/bin/env node
// Decode and validate a blueprint string file with the repo's own validator.
// Usage: check-blueprint.mjs <file>   -> JSON summary on stdout; exit 1 when invalid.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const { decodeBlueprintString, validateBlueprintString } = await import(
  join(repo, "frontend", "validator", "validate.mjs")
);

const text = readFileSync(process.argv[2], "utf8");
const result = validateBlueprintString(text);
const summary = { file: process.argv[2], ok: result.ok, errors: result.errors };
if (result.ok) {
  const { blueprint } = decodeBlueprintString(text);
  const counts = {};
  for (const e of blueprint.entities ?? []) counts[e.name] = (counts[e.name] ?? 0) + 1;
  Object.assign(summary, {
    label: blueprint.label,
    version: blueprint.version,
    entityCount: blueprint.entities?.length ?? 0,
    entityCounts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
  });
}
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
process.exitCode = result.ok ? 0 : 1;
