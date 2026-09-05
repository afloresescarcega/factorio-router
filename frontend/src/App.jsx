import React, { useMemo, useState } from "react";
import { RECIPES, MACHINES } from "./recipeCatalog.js";
import {
  BELTS,
  DEFAULT_CONFIG,
  planProduction,
  title,
  formatRate,
} from "./planner.js";
import { createLayout } from "./layout.js";
import { encodeBlueprint } from "./blueprintFactory.js";
import { planHelmodString } from "./main.js";
import BlueprintPreview from "./BlueprintPreview.jsx";
import "./App.css";

function RecipeSelect({ value, onChange, label }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {RECIPES.map((recipe) => (
        <option key={recipe.id} value={recipe.id}>
          {recipe.name}
        </option>
      ))}
    </select>
  );
}
const initialConfig = () => ({
  ...DEFAULT_CONFIG,
  outputs: DEFAULT_CONFIG.outputs.map((output) => ({ ...output })),
});

export default function App() {
  const [config, setConfig] = useState(initialConfig);
  const [helmod, setHelmod] = useState("");
  const [importError, setImportError] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("layout");
  const update = (patch) => {
    setConfig((current) => ({ ...current, ...patch }));
    setStatus("");
  };
  const result = useMemo(() => {
    try {
      const plan = planProduction(config);
      const layout = plan.issues.length ? null : createLayout(plan);
      return {
        plan,
        layout,
        string: layout ? encodeBlueprint(layout.blueprint) : "",
      };
    } catch (error) {
      return { error: error.message };
    }
  }, [config]);
  const { plan, layout, string } = result;
  const updateOutput = (index, patch) =>
    update({
      outputs: config.outputs.map((output, i) =>
        i === index ? { ...output, ...patch } : output,
      ),
    });
  const updateMachine = (recipe, patch) =>
    update({
      machineOverrides: {
        ...config.machineOverrides,
        [recipe]: { ...config.machineOverrides[recipe], ...patch },
      },
    });
  async function copy() {
    try {
      await navigator.clipboard.writeText(string);
      setStatus(
        "Blueprint copied. Paste it into Import string in Factorio's blueprint library.",
      );
    } catch {
      setView("export");
      setStatus(
        "Clipboard access is unavailable. Select and copy the blueprint string below.",
      );
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([string + "\n"], { type: "text/plain" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "factorio-router-blueprint.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Blueprint file downloaded.");
  }
  function importLine(event) {
    event.preventDefault();
    setImportError("");
    try {
      const imported = planHelmodString(helmod, {
        belt: config.belt,
        maxMachines: config.maxMachines,
        layoutMode: config.layoutMode,
      });
      update({
        ...DEFAULT_CONFIG,
        outputs: imported.outputs.map(({ name, rate }) => ({
          recipe: name,
          rate,
        })),
        belt: config.belt,
        maxMachines: config.maxMachines,
        layoutMode: config.layoutMode,
        fromOre: true,
        externalItems: imported.inputs.map((input) => input.name),
        machineOverrides: Object.fromEntries(
          imported.units.map((unit) => [
            unit.recipe,
            { factory: unit.factory, count: unit.count },
          ]),
        ),
      });
      setStatus(
        "Helmod line imported. Its targets, inputs, and machine counts are now editable below. Modules and productivity settings are not imported.",
      );
    } catch (error) {
      setImportError(error.message);
    }
  }
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="./">
          <span className="brand-mark" aria-hidden="true">
            ↱
          </span>
          <span>
            FACTORIO<span className="brand-light"> / ROUTER</span>
          </span>
        </a>
        <span className="version-label">VANILLA 2.0 · SOLID ITEMS</span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">PRODUCTION WORKSPACE</p>
            <h1>Plan the line. See the blueprint.</h1>
            <p>
              Choose what to make, set your limits, and take the layout into
              Factorio.
            </p>
          </div>
          <button
            className="quiet"
            onClick={() => {
              update(initialConfig());
              setImportError("");
            }}
          >
            Reset example
          </button>
        </div>
        <div className="workspace">
          <aside className="configuration">
            <section className="panel">
              <div className="section-heading">
                <h2>
                  <span className="step">01</span> Output targets
                </h2>
                <span className="unit">ITEMS / MIN</span>
              </div>
              {config.outputs.map((output, i) => (
                <div className="output-row" key={i}>
                  <label className="sr-only" htmlFor={`rate-${i}`}>
                    Output rate {i + 1}
                  </label>
                  <RecipeSelect
                    label={`Output recipe ${i + 1}`}
                    value={output.recipe}
                    onChange={(recipe) => updateOutput(i, { recipe })}
                  />
                  <input
                    id={`rate-${i}`}
                    type="number"
                    min="0.01"
                    max="100000"
                    step="any"
                    value={output.rate}
                    onChange={(e) => updateOutput(i, { rate: e.target.value })}
                  />
                  <button
                    className="remove"
                    aria-label={`Remove output ${i + 1}`}
                    disabled={config.outputs.length === 1}
                    onClick={() =>
                      update({
                        outputs: config.outputs.filter(
                          (_, index) => index !== i,
                        ),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="text-button"
                disabled={config.outputs.length >= 20}
                onClick={() =>
                  update({
                    outputs: [
                      ...config.outputs,
                      { recipe: "iron-gear-wheel", rate: 60 },
                    ],
                  })
                }
              >
                + Add output
              </button>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={config.intermediates}
                  onChange={(e) => update({ intermediates: e.target.checked })}
                />
                Build intermediate products
              </label>
              <p className="help">
                Automatically include steps such as copper cable and gears.
              </p>
            </section>
            <section className="panel">
              <h2>
                <span className="step">02</span> Machines & transport
              </h2>
              <label className="field">
                Default assembler
                <select
                  value={config.assembler}
                  onChange={(e) =>
                    update({ assembler: e.target.value, machineOverrides: {} })
                  }
                >
                  {Object.entries(MACHINES)
                    .filter(([, machine]) => machine.category === "crafting")
                    .map(([id, machine]) => (
                      <option value={id} key={id}>
                        {machine.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="field-pair">
                <label className="field">
                  Belts
                  <select
                    value={config.belt}
                    onChange={(e) => update({ belt: e.target.value })}
                  >
                    {Object.entries(BELTS).map(([id, belt]) => (
                      <option key={id} value={id}>
                        {belt.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Machine budget
                  <input
                    type="number"
                    min="1"
                    max="200"
                    step="1"
                    value={config.maxMachines}
                    onChange={(e) => update({ maxMachines: e.target.value })}
                  />
                </label>
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={config.fromOre}
                  onChange={(e) => update({ fromOre: e.target.checked })}
                  disabled={!config.intermediates}
                />
                Include electric smelting from ore
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={config.layoutMode === "compact"}
                  onChange={(e) =>
                    update({
                      layoutMode: e.target.checked ? "compact" : "standard",
                    })
                  }
                />
                Compact layout
              </label>
              <p className="help">
                Try a smaller footprint with the same production targets and
                machine counts.
              </p>
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>
                  <span className="step">03</span> Input supply
                </h2>
                <span className="unit">LIMIT / MIN</span>
              </div>
              <p className="help">
                Leave a limit blank for unlimited supply. Feed each listed item
                at its marked belt entrance.
              </p>
              {plan?.inputs.map((input) => (
                <div className="input-row" key={input.name}>
                  <label htmlFor={`supply-${input.name}`}>
                    {title(input.name)}
                    <small>Needs {formatRate(input.rate)} / min</small>
                  </label>
                  <input
                    aria-label={`${title(input.name)} supply limit`}
                    id={`supply-${input.name}`}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Unlimited"
                    value={config.inputLimits[input.name] ?? ""}

                    onChange={(e) =>
                      update({
                        inputLimits: {
                          ...config.inputLimits,
                          [input.name]: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              ))}
              {!plan && (
                <p className="help">
                  Fix the targets above to calculate required inputs.
                </p>
              )}
              {config.externalItems.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => update({ externalItems: [] })}
                >
                  Build supplied intermediates again
                </button>
              )}
            </section>
            <details className="panel optional-import">
              <summary>Already have a Helmod export?</summary>
              <form onSubmit={importLine}>
                <p className="help">
                  Optional import for supported recipes and machine counts.
                  Fluids, burners, miners, and modded machines are not
                  supported.
                </p>
                <textarea
                  aria-label="Helmod export"
                  rows="4"
                  value={helmod}
                  onChange={(e) => setHelmod(e.target.value)}
                  placeholder="Paste a Helmod production line…"
                />
                <button type="submit" className="secondary">
                  Import machine counts
                </button>
                {importError && (
                  <p role="alert" className="error-text">
                    {importError}
                  </p>
                )}
              </form>
            </details>
          </aside>
          <div className="results">
            <section className="panel blueprint-panel">
              <div className="result-heading">
                <div>
                  <p className="eyebrow">LIVE BLUEPRINT</p>
                  <h2>
                    {plan
                      ? plan.outputs
                          .map((output) => title(output.name))
                          .join(" + ")
                      : "Your production line"}
                  </h2>
                </div>
                <span className={`status-chip ${layout ? "" : "invalid"}`}>
                  {layout ? "Layout ready" : "Check constraints"}
                </span>
              </div>
              {plan && (
                <div className="metrics">
                  <div>
                    <strong>{plan.machineCount}</strong>
                    <span>machines</span>
                  </div>
                  <div>
                    <strong>{plan.units.length}</strong>
                    <span>production steps</span>
                  </div>
                  <div>
                    <strong>
                      {layout?.blueprint.blueprint.entities.length ?? "—"}
                    </strong>
                    <span>entities</span>
                  </div>
                  <div>
                    <strong>{plan.inputs.length}</strong>
                    <span>input materials</span>
                  </div>
                </div>
              )}
              {result.error && (
                <div className="constraint-error" role="alert">
                  {result.error}
                </div>
              )}
              {!!plan?.issues.length && (
                <div className="constraint-error" role="alert">
                  <strong>This line exceeds your limits.</strong>
                  <ul>
                    {plan.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  <p>
                    Adjust the limits or reduce your output targets to generate
                    a blueprint.
                  </p>
                </div>
              )}
              <div
                className="view-tabs"
                role="tablist"
                aria-label="Blueprint views"
              >
                {[
                  ["layout", "Layout"],
                  ["materials", "Build list"],
                  ["export", "Blueprint string"],
                ].map(([id, label]) => (
                  <button
                    role="tab"
                    id={`tab-${id}`}
                    aria-controls={`view-${id}`}
                    aria-selected={view === id}
                    key={id}
                    onClick={() => setView(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={`view-${view}`}
                aria-labelledby={`tab-${view}`}
              >
                {!layout ? (
                  <div className="empty-preview">
                    <span aria-hidden="true">⌑</span>
                    <p>
                      The preview will appear when the line meets your
                      constraints.
                    </p>
                  </div>
                ) : view === "layout" ? (
                  <BlueprintPreview layout={layout} />
                ) : view === "materials" ? (
                  <div className="materials-list">
                    {layout.materials.map((item) => (
                      <div key={item.name}>
                        <span>{title(item.name)}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="export-panel">
                    <label htmlFor="blueprint-string">
                      Import this string in Factorio
                    </label>
                    <textarea
                      id="blueprint-string"
                      readOnly
                      value={string}
                      rows="9"
                      onFocus={(e) => e.target.select()}
                    />
                    <p className="help">
                      Copy the string, switch to Factorio, and use Import string
                      in the blueprint library. Supply the marked inputs and
                      connect power.
                    </p>
                  </div>
                )}
              </div>
              <div className="export-actions">
                <p>
                  {layout
                    ? `Footprint: ${layout.footprint.width} × ${layout.footprint.height} tiles`
                    : "Resolve the constraints to export."}
                </p>
                <button
                  className="secondary"
                  disabled={!layout}
                  onClick={download}
                >
                  Download
                </button>
                <button className="primary" disabled={!layout} onClick={copy}>
                  Copy blueprint <span aria-hidden="true">↗</span>
                </button>
              </div>
              <p role="status" aria-live="polite" className="action-status">
                {status}
              </p>
            </section>
            {plan && (
              <section className="panel production-panel">
                <div className="section-heading">
                  <h2>Production line</h2>
                  <span className="unit">AUTOMATIC SIZING</span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Recipe</th>
                        <th>Machine</th>
                        <th>Count</th>
                        <th>Items / min</th>
                        <th>
                          <span className="sr-only">Supply source</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.units.map((unit) => (
                        <tr key={unit.recipe}>
                          <th scope="row">
                            {title(unit.recipe)}
                            <small>
                              {Math.round(unit.utilization * 100)}% crafting use
                            </small>
                          </th>
                          <td>
                            <select
                              aria-label={`Machine for ${title(unit.recipe)}`}

                              value={unit.factory}
                              onChange={(e) =>
                                updateMachine(unit.recipe, {
                                  factory: e.target.value,
                                  count: "",
                                })
                              }
                            >
                              {Object.entries(MACHINES)
                                .filter(
                                  ([, machine]) =>
                                    machine.category ===
                                    MACHINES[unit.factory].category,
                                )
                                .map(([id, machine]) => (
                                  <option key={id} value={id}>
                                    {machine.name}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td>
                            <input
                              aria-label={`Count for ${title(unit.recipe)}`}
                              type="number"
                              min={unit.required || 1}
                              max="200"
                              step="1"
                              placeholder={String(unit.count)}
                              value={
                                config.machineOverrides[unit.recipe]?.count ??
                                ""
                              }

                              onChange={(e) =>
                                updateMachine(unit.recipe, {
                                  count: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td>
                            {formatRate(unit.crafts * unit.results[0].amount)}
                          </td>
                          <td>
                            {!config.outputs.some(
                              (output) => output.recipe === unit.recipe,
                            ) && (
                              <button
                                className="text-button"
                                onClick={() =>
                                  update({
                                    externalItems: [
                                      ...config.externalItems,
                                      unit.recipe,
                                    ],
                                  })
                                }
                              >
                                Supply externally
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="help">
                  Counts round up to whole machines. Leave a count blank for
                  automatic sizing. Supplying an intermediate externally removes
                  its production step.
                </p>
              </section>
            )}
            <p className="scope-note">
              {plan?.warnings[0] ||
                "Supports a curated catalog of vanilla solid-item recipes."}{" "}
              Fluids, modules, quality, mining, and Space Age layouts are
              outside this version.
            </p>
          </div>
        </div>
      </main>
      <footer>
        Factorio Router{" "}
        <span>Local calculations. No account. Helmod optional.</span>
      </footer>
    </div>
  );
}
