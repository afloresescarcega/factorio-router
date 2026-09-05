// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import App from "./App.jsx";
import { decodeBlueprint } from "./blueprintFactory.js";
import { HelmodFactory } from "./helmodFactory.js";
import { entitySize } from "./layout.js";
import { MAX_OUTPUTS } from "./planner.js";

function showExport() {
  fireEvent.click(screen.getByRole("tab", { name: "Blueprint string" }));
  return screen.getByLabelText("Import this string in Factorio");
}

function footprint(entities) {
  const edges = entities.map((entity) => {
    const [width, height] = entitySize(entity);
    return {
      left: entity.position.x - width / 2,
      right: entity.position.x + width / 2,
      top: entity.position.y - height / 2,
      bottom: entity.position.y + height / 2,
    };
  });
  const width =
    Math.max(...edges.map((edge) => edge.right)) -
    Math.min(...edges.map((edge) => edge.left));
  const height =
    Math.max(...edges.map((edge) => edge.bottom)) -
    Math.min(...edges.map((edge) => edge.top));
  return { width, height, area: width * height };
}

test("starts with a usable native plan and a preview of its exported entities", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "Plan the line. See the blueprint." }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: /Blueprint with/ }),
  ).toBeInTheDocument();
  const data = decodeBlueprint(showExport().value);
  expect(
    data.blueprint.entities.some((e) => e.recipe === "electronic-circuit"),
  ).toBe(true);
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeEnabled();
});

test("changing rates updates the export; infeasible supply removes it until corrected", () => {
  render(<App />);
  const before = showExport().value;
  fireEvent.change(screen.getByLabelText("Output rate 1"), {
    target: { value: "120" },
  });
  expect(showExport().value).not.toBe(before);
  const limit = screen.getByLabelText("Iron plate supply limit");
  fireEvent.change(limit, { target: { value: "10" } });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "only 10/min is available",
  );
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeDisabled();
  expect(
    screen.queryByLabelText("Import this string in Factorio"),
  ).not.toBeInTheDocument();
  fireEvent.change(limit, { target: { value: "120" } });
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeEnabled();
});

test("compact layout reduces the exported footprint and can be switched back", () => {
  render(<App />);
  const control = screen.getByRole("checkbox", { name: "Compact layout" });
  expect(control).not.toBeChecked();
  const standardString = showExport().value;
  const standard = decodeBlueprint(standardString).blueprint;
  const standardSize = footprint(standard.entities);
  expect(screen.getByText(/Footprint:/)).toHaveTextContent(
    `Footprint: ${standardSize.width} × ${standardSize.height} tiles`,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Layout", exact: true }));
  expect(
    screen.getByText(`· ${standardSize.width} × ${standardSize.height} tiles`),
  ).toBeInTheDocument();
  fireEvent.click(control);
  const compact = decodeBlueprint(showExport().value).blueprint;
  const compactSize = footprint(compact.entities);
  expect(compactSize.area).toBeLessThan(standardSize.area);
  expect(screen.getByText(/Footprint:/)).toHaveTextContent(
    `Footprint: ${compactSize.width} × ${compactSize.height} tiles`,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Layout", exact: true }));
  expect(
    screen.getByText(`· ${compactSize.width} × ${compactSize.height} tiles`),
  ).toBeInTheDocument();
  const recipes = (blueprint) =>
    blueprint.entities.map((entity) => entity.recipe).filter(Boolean).sort();
  expect(recipes(compact)).toEqual(recipes(standard));
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeEnabled();
  fireEvent.click(control);
  expect(showExport().value).toBe(standardString);
  fireEvent.click(control);
  fireEvent.click(screen.getByRole("button", { name: "Reset example" }));
  expect(control).not.toBeChecked();
  expect(showExport().value).toBe(standardString);
});

test("invalid manual machine counts can be corrected without losing their controls", () => {
  render(<App />);
  const count = screen.getByLabelText("Count for Electronic circuit");
  fireEvent.change(count, { target: { value: "-1" } });
  expect(screen.getByRole("alert")).toHaveTextContent("whole number");
  fireEvent.change(screen.getByLabelText("Count for Electronic circuit"), {
    target: { value: "4" },
  });
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeEnabled();
});

test("users can add outputs, supply an intermediate externally, and reset", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Add output/ }));
  expect(screen.getByLabelText("Output recipe 2")).toBeInTheDocument();
  const row = screen.getByRole("row", { name: /Copper cable/ });
  fireEvent.click(
    within(row).getByRole("button", { name: "Supply externally" }),
  );
  expect(
    screen.getByLabelText("Copper cable supply limit"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset example" }));
  expect(screen.queryByLabelText("Output recipe 2")).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Copper cable supply limit"),
  ).not.toBeInTheDocument();
});

test("copy failure offers a selectable string and no false success message", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Copy blueprint/ }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Clipboard access is unavailable",
  );
  expect(
    screen.getByLabelText("Import this string in Factorio"),
  ).toBeInTheDocument();
});

test("Helmod imports become editable native targets and machine counts", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Compact layout" }));
  const encoded = HelmodFactory.encodeHelmod({
    root: {
      type: "recipe",
      name: "iron-gear-wheel",
      factory: { name: "assembling-machine-1", count: 2 },
    },
  });
  fireEvent.change(screen.getByLabelText("Helmod export"), {
    target: { value: encoded },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Import machine counts" }),
  );
  expect(screen.getByLabelText("Output recipe 1")).toHaveValue(
    "iron-gear-wheel",
  );
  expect(screen.getByLabelText("Output rate 1")).toHaveValue(90);
  expect(screen.getByLabelText("Count for Iron gear wheel")).toHaveValue(2);
  expect(screen.getByLabelText("Count for Iron gear wheel")).toBeEnabled();
  expect(screen.getByRole("checkbox", { name: "Compact layout" })).toBeChecked();
  fireEvent.change(screen.getByLabelText("Output rate 1"), {
    target: { value: "45" },
  });
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeEnabled();
  expect(
    decodeBlueprint(showExport().value).blueprint.entities.filter(
      (entity) => entity.recipe === "iron-gear-wheel",
    ),
  ).toHaveLength(2);
});

test("rate units convert targets and supply together without changing the blueprint", () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Iron plate supply limit"), { target: { value: "60" } });
  const original = showExport().value;
  fireEvent.change(screen.getByLabelText("Rate units"), { target: { value: "items/s" } });
  expect(screen.getByLabelText("Output rate 1")).toHaveValue(1);
  expect(screen.getByLabelText("Iron plate supply limit")).toHaveValue(1);
  expect(showExport().value).toBe(original);
  fireEvent.change(screen.getByLabelText("Rate units"), { target: { value: "belts" } });
  expect(screen.getByLabelText("Output rate 1").valueAsNumber).toBeCloseTo(1 / 15, 10);
  expect(screen.getByText(/Enter a fraction or multiple/)).toHaveTextContent("at most 0.5 belts");
  expect(showExport().value).toBe(original);
  fireEvent.change(screen.getByLabelText("Rate units"), { target: { value: "items/min" } });
  expect(screen.getByLabelText("Output rate 1")).toHaveValue(60);
  expect(showExport().value).toBe(original);
});

test("green belts and independent stacking generate real entities and recover safely from overload", () => {
  render(<App />);
  expect(screen.getByText("Belt stacking").closest("details")).not.toHaveAttribute("open");
  fireEvent.change(screen.getByLabelText("Output recipe 1"), { target: { value: "copper-cable" } });
  fireEvent.change(screen.getByLabelText("Belts"), { target: { value: "turbo-transport-belt" } });
  fireEvent.change(screen.getByLabelText("Input stacks"), { target: { value: "4" } });
  fireEvent.change(screen.getByLabelText("Output stacks"), { target: { value: "4" } });
  fireEvent.change(screen.getByLabelText("Rate units"), { target: { value: "belts" } });
  fireEvent.change(screen.getByLabelText("Output rate 1"), { target: { value: "0.5" } });
  const exported = decodeBlueprint(showExport().value).blueprint;
  expect(exported.entities.some((entity) => entity.name === "turbo-transport-belt")).toBe(true);
  expect(exported.entities.filter((entity) => entity.name === "stack-inserter").every((entity) => entity.override_stack_size === 4)).toBe(true);
  expect(screen.getByText(/120 items\/s · 7,200 items\/min/)).toHaveTextContent("100% of output lane");
  fireEvent.change(screen.getByLabelText("Output rate 1"), { target: { value: "0.501" } });
  expect(screen.getByRole("alert")).toHaveTextContent("one lane");
  expect(screen.queryByLabelText("Import this string in Factorio")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Output rate 1"), { target: { value: "0.5" } });
  expect(showExport().value).toBeTruthy();
  // Output stacks are still 4 high, but the external input can no longer carry the demand.
  fireEvent.change(screen.getByLabelText("Input stacks"), { target: { value: "1" } });
  expect(screen.getByRole("alert")).toHaveTextContent("Copper plate needs 3,600/min");
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Input stacks"), { target: { value: "2" } });
  expect(showExport().value).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reset example" }));
  expect(screen.getByLabelText("Belts")).toHaveValue("transport-belt");
  expect(screen.getByLabelText("Rate units")).toHaveValue("items/min");
  expect(screen.getByLabelText("Input stacks")).toHaveValue("1");
  expect(screen.getByLabelText("Output stacks")).toHaveValue("1");
});

test("blank rate stays invalid across units and can be corrected", () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Output rate 1"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Rate units"), { target: { value: "items/s" } });
  expect(screen.getByLabelText("Output rate 1")).toHaveValue(null);
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Output rate 1"), { target: { value: "1" } });
  expect(screen.getByRole("button", { name: /Copy blueprint/ })).toBeEnabled();
});

test("all catalog targets can be added without duplicate selections or an oversized title", () => {
  render(<App />);
  // Keep the preview hidden while editing a large invalid plan.
  fireEvent.change(screen.getByLabelText("Machine budget"), { target: { value: "1" } });
  for (let i = 1; i < MAX_OUTPUTS; i++) fireEvent.click(screen.getByRole("button", { name: /Add output/ }));
  const recipes = screen.getAllByRole("combobox", { name: /Output recipe/ });
  expect(recipes).toHaveLength(MAX_OUTPUTS);
  expect(new Set(recipes.map((select) => select.value)).size).toBe(MAX_OUTPUTS);
  expect(screen.getByRole("button", { name: /Add output/ })).toBeDisabled();
  expect(screen.getByRole("heading", { name: `${MAX_OUTPUTS} output targets` })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove output 2" }));
  expect(screen.getByRole("button", { name: /Add output/ })).toBeEnabled();
}, 15000);

test("Helmod import keeps Space Age settings and converts canonical rates to the selected unit", () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Belts"), { target: { value: "turbo-transport-belt" } });
  fireEvent.change(screen.getByLabelText("Input stacks"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Output stacks"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Rate units"), { target: { value: "items/s" } });
  fireEvent.change(screen.getByLabelText("Helmod export"), { target: { value: HelmodFactory.encodeHelmod({
    type: "recipe", name: "copper-cable", factory: { name: "assembling-machine-3", count: 2 },
  }) } });
  fireEvent.click(screen.getByRole("button", { name: "Import machine counts" }));
  expect(screen.getByLabelText("Output rate 1")).toHaveValue(6);
  expect(screen.getByLabelText("Input stacks")).toHaveValue("2");
  expect(screen.getByLabelText("Output stacks")).toHaveValue("3");
  const blueprint = decodeBlueprint(showExport().value).blueprint;
  expect(blueprint.entities.filter((entity) => entity.name === "stack-inserter")).toHaveLength(2);
});
