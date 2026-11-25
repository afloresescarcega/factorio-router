# Production line table

Below the results, the production table lists each recipe step with its machine, count, rate, and crafting utilization. The user can override a step's machine or machine count, or supply an intermediate from outside the line.

## Sub-features

- `pl-sizing` shows automatic counts as placeholders and `% crafting use`.
- `pl-count-override` sets a machine count; the total machine metric follows.
- `pl-machine-override` changes the machine for one recipe.
- `pl-supply-externally` removes a step and adds its item as an input.

## How to get to it (user POV)

- `Production line` panel: rows with `Machine for <Recipe>`, `Count for <Recipe>`, and a `Supply externally` button for non-target recipes.

## Driving it with fr-verify

Preconditions:

- Default line: `Copper cable` (2 machines) and `Electronic circuit` (4 machines), 6 total.

- **Count override.** Fill `get_by_role("spinbutton", name="Count for Electronic circuit")` with `8`. `expect(page.locator(".metrics > div", has_text="machines").locator("strong")).to_have_text("10")`. Download and confirm `entityCounts["assembling-machine-2"] == 10`. Clear the field to return to `6`.
- **Machine override.** Select `assembling-machine-3` in `Machine for Electronic circuit`; the exported blueprint contains `assembling-machine-3`.
- **Supply externally.** Click `get_by_role("row", name=re.compile("Copper cable")).get_by_role("button", name="Supply externally")`. The `Copper cable` row disappears, `production steps` drops to `1`, and `Copper cable supply limit` appears.

## Gotchas

- The count box's `min` is the required count. Entering less has not been probed; check what the app does (alert or ignored) before asserting either.
- Target recipes have no `Supply externally` button.
- The table is only rendered when a plan exists.
