# Factorio Router verification map

This directory is the maintained source for verifying the user-facing behavior of Factorio Router. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `fr-verify launch` (see `../SKILL.md`) and export the printed `FR_RUN_ID` in every shell call.
- `fr-verify doctor` passes with no `FAIL` lines.
- Every journey starts from a fresh page load, which is always the default example line: output `Electronic circuit` at `60` items/min, `Assembling machine 2`, `Yellow belt`, machine budget `200`, intermediates on, smelting off, compact off, Space Age off, no input limits. The status chip reads `Layout ready`, the metrics read `6` machines and `2` production steps, and the inputs are `Iron plate` (needs 60 / min) and `Copper plate` (needs 90 / min).
- There is no persisted state, so no fixture restore is needed between journeys.
- Never drive an instance this run did not launch.

## Driving conventions

- Journeys are Python files defining `journey(page, ev)`, run with `fr-verify drive <file>`.
- Use the ARIA handles listed in `../SKILL.md`. Metrics are the one place a CSS locator (`.metrics > div`) is needed.
- The plan updates from a deferred config. After each input change, wait on the expected end state with Playwright `expect(...)` or `wait_for()`; never read results immediately.
- Treat recipe ids (`electronic-circuit`) as `select_option` values and display names (`Electronic circuit`) as accessible-name text.

## Proof and skip reporting

- Capture the action and the result: `ev.step` before and after, plus `ev.expect` on the specific end state.
- When a feature changes the plan, prove the exported blueprint changed too: Download it and run `ev.blueprint(...)`; check `ok` and the relevant entity counts.
- CLI proof is the `fr-verify cli` transcript (command, stdin, stdout, stderr, exit code) plus `fr-verify blueprint` on stdout.
- Record which entry point each artifact came from. Do not report an entry point as verified through a different one.
- If a journey cannot reach its precondition, report the failure with the attempted command and the unmet precondition.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior, then exactly four H2 sections in order: `Sub-features`, `How to get to it (user POV)`, `Driving it with fr-verify`, `Gotchas`. Keep implementation details out except where they explain a driving trap.

## Features

- [Export a blueprint](./export-blueprint.md) covers the preview, build list, blueprint string tab, Download, and Copy. **Has a shipped journey.**
- [Output targets](./output-targets.md) covers choosing recipes and rates, adding and removing targets, and rate units.
- [Machines and transport](./machines-transport.md) covers assembler, belts, machine budget, Space Age, the electromagnetic plant, belt stacking, smelting, and compact layout.
- [Input supply limits](./input-supply.md) covers supply limits, constraint errors, and external intermediates.
- [Production line table](./production-line.md) covers per-recipe machine and count overrides and supplying an intermediate externally.
- [Helmod import, reset, and undo](./helmod-import.md) covers importing a Helmod export, import errors, Reset example, and Undo.
- [CLI planner](./cli-planner.md) covers `frontend/cli.mjs` with native JSON and Helmod input.
