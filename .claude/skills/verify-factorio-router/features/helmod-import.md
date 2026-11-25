# Helmod import, reset, and undo

A user with a Helmod production-line export can paste it to load its targets, inputs, and machine counts as an editable line. `Reset example` restores the default line, and `Undo` reverts the last import or reset.

## Sub-features

- `helmod-import` loads a valid export and reports it in the status line.
- `helmod-error` rejects invalid text with an alert.
- `reset-example` restores the default line.
- `undo` reverts the last import or reset.

## How to get to it (user POV)

- Collapsible `Already have a Helmod export?` panel at the bottom left: `Helmod export` textarea and `Import machine counts` button.
- `Reset example` button at top right; `Undo` text button next to the status line after an import or reset.

## Driving it with fr-verify

Preconditions:

- Default line. The repo's sample export is `frontend/examples/legacy-helmod.txt` (an electronic-circuit line).

- **Import.** Click `get_by_text("Already have a Helmod export?")`, fill `get_by_role("textbox", name="Helmod export")` with the file contents, and click `Import machine counts`. Status starts with `Helmod line imported. Its targets, inputs, and machine counts are now editable below.`; heading `Electronic circuit`; `ev.step("imported")`.
- **Undo.** Click `Undo`; status `Previous line restored.`
- **Error.** Fill the textarea with `garbage` and submit; `get_by_role("alert")` reads `Invalid Helmod export. Paste the complete production-line export string.`
- **Reset.** Change any setting, click `Reset example`; status `Example line restored.` and the baseline metrics return.

## Gotchas

- The sample export makes the same product as the default line, so prove the import by its status message and the imported machine counts (production table), not just the heading.
- An electromagnetic-plant import turns Space Age on automatically.
- Paths in `pathlib.Path(...)` inside a journey resolve from the shell's working directory; run `fr-verify drive` from the repo root.
