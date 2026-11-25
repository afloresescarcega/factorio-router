# Machines and transport

The user picks the default assembler tier, belt tier, and machine budget, and can turn on Space Age to unlock green belts, belt stacking, and the electromagnetic plant for electronics. Smelting from ore and compact placement change what the layout contains and how big it is.

## Sub-features

- `mt-assembler` changes the default assembler (clears per-recipe overrides).
- `mt-belt` changes belt tier (turbo only with Space Age).
- `mt-budget` sets the machine budget; plans needing more machines fail.
- `mt-space-age` toggles Space Age (header gains `· SPACE AGE`).
- `mt-em-plant` switches electronics recipes to the electromagnetic plant.
- `mt-stacking` sets input/output stack heights (Space Age only).
- `mt-ore` adds electric smelting from ore.
- `mt-compact` switches to compact placement and changes the footprint.

## How to get to it (user POV)

- Panel `02 Machines & transport`: `Default assembler`, `Belts`, `Machine budget`, checkboxes `Space Age`, `Include electric smelting from ore`, `Compact layout`; with Space Age on, `Electronics machine` and the collapsible `Belt stacking` section.

## Driving it with fr-verify

Preconditions:

- Default line.

- **Space Age.** `get_by_role("checkbox", name="Space Age").check()`. The header text becomes `FACTORIO 2.0 · SPACE AGE · BELTS & PIPES` and `Electronics machine` appears.
- **EM plant.** Select `electromagnetic-plant` in `Electronics machine`. `expect(get_by_role("combobox", name="Machine for Electronic circuit")).to_have_value("electromagnetic-plant")`. Download and confirm `ev.blueprint(...)["entityCounts"]` has `electromagnetic-plant`.
- **Stacking.** Click `get_by_text("Belt stacking")`, select `2` in `get_by_label("Output stacks")`. The summary reads `Belt stacking` then `1× in · 2× out`; the exported blueprint contains `stack-inserter`.
- **Belts.** `get_by_role("combobox", name=re.compile(r"^Belts")).select_option("fast-transport-belt")`; the blueprint's belts become `fast-transport-belt`. `turbo-transport-belt` is only an option while Space Age is on.
- **Budget.** Fill `Machine budget` with `3`; wait for `Check constraints` and an `alert`. Restore `200`.
- **Ore.** Check `Include electric smelting from ore`; inputs become ores and `Electric furnace` rows appear in the production table.
- **Compact.** Record the `Footprint: W × H tiles` text, check `Compact layout`, wait for the footprint text to change, and record it again. On the default line it goes from `44 × 40` to `20 × 20`; the `machines` metric stays `6`.

## Gotchas

- `Belts` has no exact accessible name (the label wraps the select, so the name includes option text). Use the `^Belts` regex.
- Unchecking Space Age resets the belt to `Yellow belt` and both stack heights to 1, converting rates to match. Re-select the belt after toggling Space Age off.
- On a fresh default line (commit 82dcdd1) the footprint is `44 × 40 tiles` standard and `20 × 20 tiles` compact, with 6 machines in both. Measure from a fresh page: toggling Space Age, stacking, or belts first changes the standard footprint (one earlier probe read `45 × 39` after those changes). Assert that compact is smaller and the machine count is unchanged, not the literal sizes, unless the task is about layout size.
- Changing `Default assembler` clears machine overrides from the production table.
