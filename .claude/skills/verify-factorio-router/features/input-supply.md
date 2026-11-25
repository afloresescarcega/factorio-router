# Input supply limits

The planner lists every material the line consumes and how much it needs. The user can cap the supply of each; a cap below demand blocks export with an explicit error until fixed. Intermediates supplied externally appear here with a `Build in line` button.

## Sub-features

- `input-needs` shows each input with `Needs N / min` (unit follows `Rate units`; fluids show a `pipe` tag and fluid units).
- `input-limit-ok` accepts a limit at or above demand.
- `input-limit-short` flags a limit below demand, shows `limit is N short`, and raises an alert.
- `input-build-in-line` moves an externally supplied intermediate back into the line.
- `input-build-all` (`Build supplied intermediates again`) restores all external intermediates.

## How to get to it (user POV)

- Panel `03 Input supply`: one row per input with a number box (placeholder `Unlimited`).

## Driving it with fr-verify

Preconditions:

- Default line: inputs `Iron plate` (needs 60 / min) and `Copper plate` (needs 90 / min).

- **Short limit.** Fill `get_by_role("spinbutton", name="Iron plate supply limit")` with `30`. Wait for `Check constraints`. `get_by_role("alert")` contains `Iron plate needs 60/min, but only 30/min is available.` The preview area says `No blueprint yet. Fix the limits listed above and the preview returns.` `ev.step("short")`.
- **Recover.** Clear the field (`fill("")`) or set `60`. Wait for `Layout ready`; Download is enabled again.
- **External intermediate.** In the production table, click `Supply externally` on the `Copper cable` row. `expect(get_by_role("spinbutton", name="Copper cable supply limit")).to_have_count(1)`. Click `Build in line`; the count returns to `0`.
- **Fluids.** Set `Output recipe 1` to `plastic-bar`; a `Petroleum gas` row (with the `pipe` tag) appears and the downloaded blueprint contains `pipe` / `pipe-to-ground` and `chemical-plant`.

## Gotchas

- The input field's accessible name is the `aria-label` `<Item> supply limit`, not the visible row label (which also contains `Needs …`).
- A limit is compared after unit conversion. In `belts` mode the number is belts, not items.
- Inputs only render when a plan exists; with a broken target the panel shows `Fix the targets above to calculate required inputs.`
