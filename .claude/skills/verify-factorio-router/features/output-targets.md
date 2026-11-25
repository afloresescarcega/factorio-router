# Output targets

The user chooses which items to produce and at what rate, optionally several at once, and can switch the whole workspace between items/min, items/s, and full-belt units. The results heading, plan, and blueprint follow the targets.

## Sub-features

- `outputs-recipe` changes the recipe of a target.
- `outputs-rate` changes a target rate and shows lane-usage feedback (`… % of output lane` or `N output lanes (auto-split)`).
- `outputs-add` adds a target (first unused of `iron-gear-wheel`, then catalog order); the cap is 58.
- `outputs-remove` removes a target; the last one cannot be removed.
- `outputs-units` converts every target and supply limit between `items/min`, `items/s`, and `belts`.
- `outputs-intermediates` toggles building intermediates in the line.
- `outputs-autosplit` batches into parallel sections when any material exceeds one lane.

## How to get to it (user POV)

- Panel `01 Output targets` on the left: recipe dropdown, rate box, remove (×) button, `+ Add output`, the `Rate units` dropdown, and the `Build intermediate products` checkbox.

## Driving it with fr-verify

Preconditions:

- Default line.

- **Add a target.** Click `+ Add output`. `Output recipe 2` has value `iron-gear-wheel`. Fill `Output rate 2` with `120`. Wait for the heading `Electronic circuit + Iron gear wheel`.
- **Change recipe.** `get_by_role("combobox", name="Output recipe 1").select_option("iron-gear-wheel")` is refused if that recipe is already used by another row (the option is disabled); pick an unused one such as `copper-cable`.
- **Remove.** Click `Remove output 2`; the heading returns to `Electronic circuit`. With one row, `Remove output 1` is disabled.
- **Units.** Select `items/s` in `Rate units`; `Output rate 1` reads `1`. Select `belts`; a help line `1 output belt = …` appears. Return to `items/min`; it reads `60` again.
- **Auto-split.** Set `Output rate 1` to `1200`. Rate feedback shows `N output lanes (auto-split)` and a note `Auto-batched into N parallel sections` appears (role `note`).
- **Intermediates.** Uncheck `Build intermediate products`; `Copper cable supply limit` appears as an input, production steps drop to `1`, and `Include electric smelting from ore` becomes disabled.
- **Proof.** `ev.step` after each change, then Download and `ev.blueprint` to show the exported entity counts changed with the target.

## Gotchas

- Results lag input changes (deferred render). Wait on the heading or metric text.
- More than 3 targets changes the heading to `N output targets` and shows `N / 58 targets`.
- Clearing a rate to empty or `0` yields a plan error, not a crash; assert the `alert` text rather than expecting `Layout ready`.
