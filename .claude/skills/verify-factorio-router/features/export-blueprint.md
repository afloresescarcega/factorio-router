# Export a blueprint

Once the line meets its constraints, the user inspects the generated layout, reviews the build list of entities, and takes the blueprint string into Factorio by copying it to the clipboard or downloading it as a text file.

## Sub-features

- `export-preview` shows an SVG preview labeled `Blueprint with N entities`, with `Zoom in`, `Fit`, and `Zoom out`.
- `export-build-list` lists each entity with its count.
- `export-string` shows the encoded string in a read-only textarea.
- `export-download` saves `factorio-router-blueprint.txt` containing the string plus a newline.
- `export-copy` writes the string to the clipboard, with a fallback to the string tab when clipboard access is denied.
- `export-blocked` disables Download and Copy while constraints fail.

## How to get to it (user POV)

- Results panel tabs `Layout`, `Build list`, and `Blueprint string` (also reachable with ArrowLeft/ArrowRight on a focused tab).
- `Download` and `Copy blueprint` buttons at the bottom of the results panel.

## Driving it with fr-verify

Preconditions:

- Default line, status chip `Layout ready`.

- **Shipped journey.** Run `fr-verify drive export-blueprint.py`. It passes 12 checks on the default line (211 entities, standard footprint `44 × 40 tiles` with `Compact layout` off, at commit 82dcdd1).
- **Preview.** Read the `entities` metric, then `expect(page.get_by_role("img", name=f"Blueprint with {n} entities")).to_have_count(1)`. Click `Zoom in`; the img `style` contains `150%`. Click `Fit`; it returns to `100%`.
- **Build list.** Click `get_by_role("tab", name="Build list")`; its `aria-selected` is `true` and `.materials-list > div` rows hold name/count pairs.
- **Keyboard tabs.** Focus the `Layout` tab and press `ArrowRight`; `Build list` becomes selected.
- **String.** Click the `Blueprint string` tab; `get_by_label("Import this string in Factorio").input_value()` starts with `0`.
- **Download.** `ev.download(lambda: page.get_by_role("button", name="Download").click(), "bp.txt")`. Status reads `Blueprint file downloaded.`; the file equals the shown string plus `\n`; its suggested filename is `factorio-router-blueprint.txt`.
- **Copy.** Click `Copy blueprint`. Status reads `Blueprint copied. Paste it into Import string in Factorio's blueprint library.`; `page.evaluate("navigator.clipboard.readText()")` equals the shown string.
- **Validate.** `ev.blueprint(path)` returns `ok: true`; `entityCount` equals the metric and the preview label; `entityCounts` (titled like `Assembling machine 2`) equals the Build list.
- **Blocked export.** Set `Iron plate supply limit` to `30`; wait for `Check constraints`; `Download` and `Copy blueprint` are disabled and the panel says `Resolve the constraints to export.`

## Gotchas

- `drive.py` grants clipboard permissions, so the clipboard-denied fallback (`Clipboard access is unavailable…` and a switch to the string tab) needs a context without `clipboard-write`; write a custom journey with `drive.py`'s pattern if you must prove it.
- The Build list uses titled names (`Fast inserter`), the decoded blueprint uses ids (`fast-inserter`). Convert with the journey's `title()` before comparing.
- Footprint and entity counts change with layout code. Assert consistency between views, not the literal 211, unless the task is about that number.
