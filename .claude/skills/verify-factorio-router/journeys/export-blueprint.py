"""Export journey (features/export-blueprint.md): preview -> build list -> string -> Download + Copy.

Proves that the blueprint a user takes out of the app (downloaded file and clipboard)
is the same valid Factorio blueprint the preview, metrics, and build list describe.
Run: fr-verify drive export-blueprint.py
"""
import re


def title(name):
    s = name.replace("-", " ")
    return s[:1].upper() + s[1:]


def journey(page, ev):
    page.get_by_text("Layout ready", exact=True).wait_for()
    entities = int(page.locator(".metrics > div", has_text="entities").locator("strong").inner_text())
    footprint = page.get_by_text(re.compile(r"^Footprint: \d+ × \d+ tiles$")).inner_text()
    ev.note("ui_entities", entities)
    ev.note("ui_footprint", footprint)
    ev.expect(page.get_by_role("heading", name="Electronic circuit").count() == 1, "default line is Electronic circuit")
    ev.expect(page.get_by_role("img", name=f"Blueprint with {entities} entities").count() == 1,
              f"preview image label matches the {entities}-entity metric")
    ev.step("layout")

    preview = page.get_by_role("img", name=re.compile(r"^Blueprint with \d+ entities$"))
    page.get_by_role("button", name="Zoom in").click()
    ev.expect("150%" in (preview.get_attribute("style") or ""), "Zoom in scales preview to 150%")
    page.get_by_role("button", name="Fit").click()
    ev.expect("100%" in (preview.get_attribute("style") or ""), "Fit returns preview to 100%")

    page.get_by_role("tab", name="Build list").click()
    ev.expect(page.get_by_role("tab", name="Build list").get_attribute("aria-selected") == "true", "Build list tab selected")
    rows = page.locator(".materials-list > div")
    build_list = {rows.nth(i).locator("span").inner_text(): int(rows.nth(i).locator("strong").inner_text())
                  for i in range(rows.count())}
    ev.note("ui_build_list", build_list)
    ev.step("build-list")

    page.get_by_role("tab", name="Blueprint string").click()
    shown = page.get_by_label("Import this string in Factorio").input_value()
    ev.expect(shown.startswith("0") and len(shown) > 100, "Blueprint string tab shows an encoded string")
    ev.save("shown-string.txt", shown)
    ev.step("blueprint-string")

    downloaded = ev.download(lambda: page.get_by_role("button", name="Download").click(), "downloaded-blueprint.txt")
    page.get_by_role("status").filter(has_text="Blueprint file downloaded.").wait_for()
    ev.expect(ev.notes["download:downloaded-blueprint.txt"]["suggested_filename"] == "factorio-router-blueprint.txt",
              "download is named factorio-router-blueprint.txt")
    ev.expect(downloaded.read_text() == shown + "\n", "downloaded file equals the shown string")

    page.get_by_role("button", name="Copy blueprint").click()
    page.get_by_role("status").filter(has_text="Blueprint copied.").wait_for()
    clip = page.evaluate("navigator.clipboard.readText()")
    ev.save("clipboard.txt", clip)
    ev.expect(clip == shown, "clipboard holds the shown string")
    ev.step("copied")

    check = ev.blueprint(downloaded)
    ev.note("decoded", check)
    ev.expect(check["ok"], "downloaded blueprint passes schema + Factorio name validation")
    ev.expect(check.get("entityCount") == entities, f"decoded entity count {check.get('entityCount')} == UI metric {entities}")
    decoded_list = {title(k): v for k, v in check.get("entityCounts", {}).items()}
    ev.expect(decoded_list == build_list, "Build list matches decoded entity counts")
