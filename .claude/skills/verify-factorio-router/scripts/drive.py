#!/opt/homebrew/opt/python@3.13/bin/python3.13
"""Run a Playwright journey against a Factorio Router instance and record evidence.

    drive.py --url URL --out DIR journey.py   # run journey(page, ev) from journey.py
    drive.py --check --url URL --out DIR      # readiness probe used by `fr-verify launch/doctor`

A journey file defines `def journey(page, ev):`. `page` is a fresh Chromium page already
loaded at URL with clipboard access and downloads enabled. `ev` records evidence in DIR:

    ev.step("label")              screenshot + ARIA snapshot named NN-label.{png,aria.txt}
    ev.expect(cond, "message")    record a pass/fail assertion (failures make the run exit 1)
    ev.note("key", value)         add a value to result.json
    ev.save("name.txt", text)     write a text artifact
    ev.download(click_fn, "name") run click_fn, save the browser download as DIR/name
    ev.blueprint(path)            decode + validate a blueprint file via check-blueprint.mjs

Page errors and console errors land in DIR/console.log; any uncaught page error fails the run.
"""
import argparse
import importlib.util
import json
import pathlib
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

SCRIPTS = pathlib.Path(__file__).resolve().parent


class Evidence:
    def __init__(self, page, out):
        self.page, self.out = page, out
        self.n = 0
        self.checks, self.notes = [], {}

    def step(self, label):
        self.n += 1
        base = self.out / f"{self.n:02d}-{label}"
        self.page.screenshot(path=f"{base}.png", full_page=True)
        (base.parent / f"{base.name}.aria.txt").write_text(self.page.locator("body").aria_snapshot())
        return base

    def expect(self, cond, message):
        self.checks.append({"ok": bool(cond), "check": message})
        print(("ok   " if cond else "FAIL ") + message)
        return bool(cond)

    def note(self, key, value):
        self.notes[key] = value

    def save(self, name, text):
        (self.out / name).write_text(text)
        return self.out / name

    def download(self, click_fn, name):
        with self.page.expect_download() as info:
            click_fn()
        dl = info.value
        path = self.out / name
        dl.save_as(path)
        self.note(f"download:{name}", {"suggested_filename": dl.suggested_filename, "path": str(path)})
        return path

    def blueprint(self, path):
        res = subprocess.run(["node", str(SCRIPTS / "check-blueprint.mjs"), str(path)],
                             capture_output=True, text=True)
        summary = json.loads(res.stdout)
        self.save(pathlib.Path(path).name + ".check.json", json.dumps(summary, indent=2))
        return summary


def open_page(p, url, out):
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=url.rstrip("/"))
    page = ctx.new_page()
    log, page_errors = [], []
    page.on("console", lambda m: m.type in ("error", "warning") and log.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: (page_errors.append(str(e)), log.append(f"[pageerror] {e}")))
    page.goto(url)
    page.get_by_role("heading", name="Plan the line. See the blueprint.").wait_for()
    return browser, page, log, page_errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("journey", nargs="?")
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    started = time.time()
    with sync_playwright() as p:
        try:
            browser, page, log, page_errors = open_page(p, a.url, out)
        except Exception as e:
            (out / "result.json").write_text(json.dumps({"url": a.url, "error": f"could not load app: {e}"}, indent=2))
            print(f"FAIL could not load {a.url}: {str(e).splitlines()[0]}", file=sys.stderr)
            sys.exit(1)
        ev = Evidence(page, out)
        error = None
        try:
            if a.check:
                page.get_by_text("Layout ready", exact=True).wait_for(timeout=15000)
                ev.expect(page.get_by_role("img", name="Blueprint with").count() == 1, "default line renders a blueprint preview")
            else:
                spec = importlib.util.spec_from_file_location("journey", a.journey)
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                mod.journey(page, ev)
        except Exception as e:  # record, then fail below
            error = f"{type(e).__name__}: {e}"
            print("ERROR " + error, file=sys.stderr)
            try:
                ev.step("error-state")
            except Exception:
                pass
        finally:
            (out / "console.log").write_text("\n".join(log) + ("\n" if log else ""))
            browser.close()
    result = {"url": a.url, "journey": a.journey or "--check", "seconds": round(time.time() - started, 1),
              "checks": ev.checks, "notes": ev.notes, "page_errors": page_errors, "error": error}
    (out / "result.json").write_text(json.dumps(result, indent=2))
    ok = error is None and not page_errors and all(c["ok"] for c in ev.checks) and ev.checks
    print(f"{'PASS' if ok else 'FAIL'} evidence: {out}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
