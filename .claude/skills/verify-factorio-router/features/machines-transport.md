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
- **Compact.** Record the `Footprint: W × H tiles` text, check `Compact layout`, wait for the footprint text to change, and record it again. Machine count stays the same.

## Gotchas

- `Belts` has no exact accessible name (the label wraps the select, so the name includes option text). Use the `^Belts` regex.
- Unchecking Space Age resets the belt to `Yellow belt` and both stack heights to 1, converting rates to match. Re-select the belt after toggling Space Age off.
- On the default line, compact is not smaller (standard `45 × 39` vs compact `44 × 40` on one probe). Use a bigger line such as 84 splitters/min from ore with assembling machine 3 and blue belts to show a large reduction; assert only that the footprint changes and machine count is preserved.
- Changing `Default assembler` clears machine overrides from the production table.
