# CLI planner

`frontend/cli.mjs` runs the same planner as the web app from a terminal. It reads a Helmod export (default) or native JSON (`--plan`) on stdin, validates the blueprint, and prints the blueprint string on stdout.

## Sub-features

- `cli-plan` plans native JSON (`--plan`).
- `cli-compact` applies compact placement (`--compact`).
- `cli-helmod` converts a Helmod export (no flag).
- `cli-debug` dumps the plan and blueprint JSON to stderr (`--debug`).
- `cli-error` exits 1 with a message for invalid input.

## How to get to it (user POV)

- `cd frontend && node cli.mjs [--plan] [--compact] [--debug] < input`.

## Driving it with fr-verify

Preconditions:

- A launched run (`FR_RUN_ID` exported) for the evidence dir; the CLI itself does not use the server. Run from the repo root.

- **Native plan.** Run `$V cli --plan < frontend/examples/circuits.json`. Exit `0`; stderr ends with `Blueprint passed schema + name validation.`; transcript in `.verify-artifacts/<run>/cli-<time>/`.
- **Validate output.** Run `$V blueprint .verify-artifacts/<run>/cli-<time>/stdout.txt`. `ok: true` with entity counts.
- **Compact.** Run `$V cli --plan --compact < frontend/examples/splitters-compact.json` and compare its decoded entity count and bounds with the non-compact run.
- **Helmod.** Run `$V cli < frontend/examples/legacy-helmod.txt`. Exit `0`.
- **Error.** Run `echo '{"outputs":[]}' | $V cli --plan`. Non-zero exit, message on stderr, `exit-code.txt` records it.

## Gotchas

- stderr always includes several Ajv `$ref: keywords ignored …` warnings before the result line; they're not errors.
- Paths in `examples/` are relative to `frontend/`, but `$V cli` reads stdin from your shell, so use `frontend/examples/...` from the repo root.
- The CLI and UI share planner code but not defaults for every field (the CLI merges `DEFAULT_CONFIG` with the JSON). Don't treat a CLI pass as proof of UI behavior.
