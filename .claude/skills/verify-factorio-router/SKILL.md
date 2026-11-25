---
name: verify-factorio-router
description: Launch and drive the Factorio Router web app (Vite + React blueprint planner in frontend/) in headless Chromium, plus its Node CLI, and capture proof — screenshots, ARIA snapshots, the downloaded/copied blueprint string decoded and schema-validated. Use when you need to prove a UI or planner change works the way a user would see it, not just that unit tests pass.
---

# Verify Factorio Router

Factorio Router is a single-page browser app: the user picks output targets, machines, belts, and input limits, and the app plans a production line, previews it, and exports a Factorio 2.0 blueprint string (Copy / Download). All computation is client-side; there is no backend, account, database, or persisted state — every page load starts from the default example line (60 electronic circuits/min, assembling machine 2, yellow belt, Space Age off).

- **Primary surface:** the web UI served by Vite from `frontend/`.
- **Secondary surface:** `frontend/cli.mjs` (same planner; Helmod string or native JSON on stdin, blueprint string on stdout). See `features/cli-planner.md`.
- The published site (GitHub Pages) is not a verification target; always drive a local instance of the checkout under test.

Everything goes through one helper, `scripts/fr-verify` (bash), which wraps `scripts/drive.py` (Python Playwright) and `scripts/check-blueprint.mjs` (repo validator). Paths below are relative to the repo root.

```sh
V=.claude/skills/verify-factorio-router/scripts/fr-verify
```

**Shell state does not persist between tool calls.** Re-`export FR_RUN_ID=...` (and re-set `V`) in every Bash call that uses the helper.

## Requirements

- Node 22.13+ or 24+ (`node -v`). `launch` runs `npm ci` in `frontend/` if `node_modules` is missing.
- Python Playwright under Homebrew Python 3.13 with Chromium installed: `/opt/homebrew/opt/python@3.13/bin/python3.13 -c "import playwright"`. Override the interpreter with `FR_PYTHON=/path/to/python`. If Chromium is missing: `$FR_PYTHON -m playwright install chromium`.

## Launch

```sh
out=$($V launch) && echo "$out" && eval "$(echo "$out" | grep '^export')"
```

- Picks a free port, starts `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port <port> --strictPort` from `frontend/`, and records pid/port/log/SHA under `$TMPDIR/fr-verify/<run>/`.
- Ready = Vite printed `Local:`, the URL answers, **and** a headless browser loaded the page and saw the `Layout ready` status chip plus a `Blueprint with N entities` preview. Only then does it print `ready: http://127.0.0.1:<port>/ (pid …)` and `export FR_RUN_ID=<run>`. Any other outcome exits non-zero with the log path.
- Takes ~5 s. Each launch is a separate run id, port, and evidence dir, so parallel runs never share an instance. Never drive the user's own `npm start` on 5173 (`.claude/launch.json`); launch your own.
- Vite serves the working tree live with HMR: edits made after launch are picked up on the next page load (each `drive` opens a fresh page), so you don't need to relaunch after editing source.

## Doctor

Run first, and again whenever anything looks off:

```sh
export FR_RUN_ID=<run>; $V doctor
```

Read-only. Checks: our PID alive; that PID (not some other process) listens on the port; the instance serves this checkout; the HTML `<title>` is `Factorio Router`; a fresh browser renders `Layout ready`. Prints launched SHA vs HEAD and dirty-file count (informational — Vite serves uncommitted edits). Any `FAIL` → exit 1: clean up and relaunch instead of driving it.

## Drive

```sh
export FR_RUN_ID=<run>; $V drive export-blueprint.py          # a shipped journey in journeys/
export FR_RUN_ID=<run>; $V drive /path/to/my-journey.py        # your own journey
```

A journey is a Python file defining `def journey(page, ev):`. `page` is a fresh 1440×1000 Chromium page already showing the default line, with clipboard read/write granted and downloads enabled. `ev` records evidence:

| call | effect |
| --- | --- |
| `ev.step("label")` | full-page `NN-label.png` + `NN-label.aria.txt` (ARIA snapshot) |
| `ev.expect(cond, "msg")` | records a check; any false check makes the run FAIL |
| `ev.note(key, value)` | adds a value to `result.json` |
| `ev.save("name.txt", text)` | writes a text artifact |
| `ev.download(lambda: <click>, "name.txt")` | saves the browser download; filename recorded in notes |
| `ev.blueprint(path)` | decodes + validates a blueprint file; returns `{ok, errors, label, entityCount, entityCounts}` |

Uncaught page errors fail the run; console errors/warnings go to `console.log`. On an exception the helper screenshots `NN-error-state` and FAILs.

Stable handles (all verified against the running app — prefer these over CSS):

- Outputs: `get_by_role("combobox", name="Output recipe 1")` (values are recipe ids, e.g. `electronic-circuit`), `get_by_role("spinbutton", name="Output rate 1")`, `get_by_role("button", name="+ Add output")`, `get_by_role("button", name="Remove output 2")`, `get_by_role("combobox", name="Rate units")` (`items/min`, `items/s`, `belts`).
- Settings: `get_by_role("checkbox", name=...)` for `Build intermediate products`, `Space Age`, `Include electric smelting from ore`, `Compact layout`; `get_by_label("Default assembler")`; `get_by_role("combobox", name=re.compile(r"^Belts"))`; `get_by_label("Machine budget")`; with Space Age on: `get_by_role("combobox", name="Electronics machine")`, `get_by_text("Belt stacking")` (a `<details>` summary — click to open) then `get_by_label("Input stacks")` / `get_by_label("Output stacks")`.
- Inputs: `get_by_role("spinbutton", name="<Item> supply limit")` (e.g. `Iron plate supply limit`), `get_by_role("button", name="Build in line")`, `get_by_role("button", name="Build supplied intermediates again")`.
- Results: status chip text `Layout ready` / `Check constraints`; heading = output names joined with ` + `; `get_by_role("alert")` for constraint errors; tabs `get_by_role("tab", name="Layout" | "Build list" | "Blueprint string")`; preview `get_by_role("img", name=re.compile(r"^Blueprint with \d+ entities$"))`; `Zoom in` / `Fit` / `Zoom out` buttons; `get_by_label("Import this string in Factorio")` (blueprint textarea); text `Footprint: W × H tiles`; buttons `Download`, `Copy blueprint`; `get_by_role("status")` for action messages; `Undo`; `Reset example`.
- Production table: `get_by_role("combobox", name="Machine for <Recipe>")`, `get_by_role("spinbutton", name="Count for <Recipe>")`, `get_by_role("row", name=re.compile("<Recipe>")).get_by_role("button", name="Supply externally")`.
- Metrics have no ARIA handle: `page.locator(".metrics > div", has_text="entities").locator("strong")` (also `machines`, `production steps`, `input materials`).
- Helmod: `get_by_text("Already have a Helmod export?")` (click to open), `get_by_role("textbox", name="Helmod export")`, `get_by_role("button", name="Import machine counts")`.

**The plan renders from a deferred copy of the config (`useDeferredValue`).** After any input change, wait for the end state with `from playwright.sync_api import expect` (`expect(loc).to_have_text(...)`, `to_have_value`, `to_have_count`) or `locator.wait_for()` — never read a metric immediately after `fill`/`select_option`; you will get the previous plan.

## Evidence

Everything lands in `.verify-artifacts/<run>/` at the repo root (gitignored; `$V where` prints it):

- `launch-check/` — the readiness probe's result.
- `<journey-name>/` — numbered screenshots + ARIA snapshots, `result.json` (checks, notes, page errors), `console.log`, and any saved/downloaded files.
- `cli-<time>/` — `command.txt`, `stdin.txt`, `stdout.txt`, `stderr.txt`, `exit-code.txt` from `$V cli`.
- `vite.log` — copied in at cleanup.

Proof standards:

- Drive the real user path: click the controls a user clicks. Don't call planner functions, set React state, or construct blueprint strings yourself to "prove" UI behavior.
- Capture the action and the result: `ev.step` before and after the change, plus `ev.expect` on the specific end state (heading, metric, alert text, footprint).
- Verify the side effect, not just the screen. The product's output is the blueprint string: save the Download and/or clipboard contents and run `ev.blueprint(...)` (or `$V blueprint <file>`) — it must be `ok: true`, and entity counts must agree with what the UI claims (metric, preview label, Build list). A green status message alone is not proof.
- No mocks are needed: there is no backend. The one external fetch is Google Fonts; offline, the page falls back to system fonts and still works (expect a console warning, not a failure).
- Report a failure honestly with its evidence path. Don't loosen a journey's checks to get a PASS.

## Cleanup

```sh
export FR_RUN_ID=<run>; $V cleanup
```

Kills only the PID this run recorded (SIGTERM, then SIGKILL after 5 s), copies `vite.log` into the evidence dir, and deletes `$TMPDIR/fr-verify/<run>/`. It never kills by process name and never touches `.verify-artifacts/`. Run it after every run, including failed ones. Delete old evidence dirs yourself only when the user no longer needs them.

## Helpers

- `scripts/fr-verify launch|doctor|drive <journey>|blueprint <file>|cli [args] < stdin|cleanup|where` — run with no args for usage.
- `scripts/drive.py --url URL --out DIR <journey.py>` (or `--check`) — normally called via `fr-verify drive`; usable directly against any URL.
- `scripts/check-blueprint.mjs <file>` — `node` it on any file containing a blueprint string; prints JSON, exits 1 if invalid. It reuses `frontend/validator/validate.mjs`, so `frontend/node_modules` must exist. Ajv prints `$ref: keywords ignored…` lines on stderr; they're harmless.
- `journeys/export-blueprint.py` — the reference journey: default line → preview zoom → Build list → Blueprint string → Download + Copy → decode and cross-check counts.

## Feature map

`features/README.md` indexes one file per user-facing feature with entry points, driving recipes, and end-state proof. A verification of a feature covers every entry point its file lists.
