import React, { useDeferredValue, useMemo, useState } from "react";
import { RECIPES, MACHINES, isFluidName } from "./recipeCatalog.js";
import {
  BELTS,
  DEFAULT_CONFIG,
  MAX_MACHINES,
  MAX_OUTPUTS,
  canCraft,
  planProduction,
  productivityFor,
  recipeById,
  title,
  formatRate,
} from "./planner.js";
import { createLayout } from "./layout.js";
import { encodeBlueprint } from "./blueprintFactory.js";
import { planHelmodString } from "./main.js";
import BlueprintPreview from "./BlueprintPreview.jsx";
import {
  RATE_UNITS,
  convertRateUnit,
  fluidRateScale,
  numericRate,
  rateScale,
  requiredLanes,
} from "./transport.js";
import "./App.css";

// Mirror Factorio's crafting-menu tabs so players find items where the game puts them.
const RECIPE_GROUPS = [
  ["Logistics", /belt|splitter|inserter|pole|substation|pipe|pump/],
  ["Production", /drill|assembling|furnace|^lab$|radar|solar|repair/],
  ["Combat", /wall|turret|magazine|gun|grenade|shell|rocket/],
  ["Intermediate products", /./],
];
const GROUPED_RECIPES = RECIPE_GROUPS.map(([name]) => [name, []]);
for (const recipe of RECIPES) {
  const index = RECIPE_GROUPS.findIndex(([, pattern]) => pattern.test(recipe.id));
  GROUPED_RECIPES[index][1].push(recipe);
}
// Intermediates first: they are what most lines are built to make.
const GROUP_ORDER = [3, 0, 1, 2];

function RecipeSelect({ value, onChange, label, selected }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {GROUP_ORDER.map((index) => {
        const [group, recipes] = GROUPED_RECIPES[index];
        return (
          <optgroup key={group} label={group}>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id} disabled={recipe.id !== value && selected.includes(recipe.id)}>
                {recipe.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

const VIEWS = [
  ["layout", "Layout"],
  ["materials", "Build list"],
  ["export", "Blueprint string"],
];

function perSecond(rate) {
  return `${formatRate(rate)} ${rate === 1 ? "item" : "items"}/s`;
}
function inputUnitLabel(isFluid, rateUnit) {
  if (isFluid) return rateUnit === "items/min" ? "fluid/min" : "fluid/s";
  if (rateUnit === "belts") return "belts";
  return rateUnit === "items/s" ? "/ sec" : "/ min";
}
function formatBottleneckSummary(plan) {
  const top = plan.bottlenecks?.[0];
  if (!top) return "";
  const capacity = top.type === "fluid" ? top.pipeCapacity : top.laneCapacity;
  const unit =
    top.type === "fluid"
      ? "per pipe"
      : `per ${BELTS[plan.belt].name.toLowerCase()} lane`;
  const extra = plan.bottlenecks.length - 1;
  const materialWord = extra === 1 ? "material" : "materials";
  const extraText =
    extra > 0
      ? ` (${extra} other ${materialWord} also over one lane)`
      : "";
  return `${title(top.name)} needs ${formatRate(top.rate)}/min (${formatRate(capacity)}/min ${unit})${extraText}.`;
}
function inputSupplyHint(plan) {
  if (plan?.sections > 1) {
    return `Total demand is split evenly across ${plan.sections} parallel sections — feed each section's marked entrance on the west edge.`;
  }
  const fluidSuffix = plan?.inputs.some((input) => input.type === "fluid")
    ? " and each fluid at its marked pipe entrance."
    : ".";
  return `Feed each listed item at its marked belt entrance${fluidSuffix}`;
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
  // Reset and import replace the whole line; keep the previous one so either can be undone.
  const [undoConfig, setUndoConfig] = useState(null);
  const update = (patch) => {
    setConfig((current) => ({ ...current, ...patch }));
    setStatus("");
    setUndoConfig(null);
  };
  const replaceConfig = (next, message) => {
    const previous = config;
    update(next);
    setUndoConfig(previous);
    setStatus(message);
  };
  const undo = () => {
    setConfig(undoConfig);
    setUndoConfig(null);
    setStatus("Previous line restored.");
  };
  // Planning and the SVG preview are heavy for large lines; let inputs update
  // first and recompute in a low-priority render that typing can interrupt.
  const plannedConfig = useDeferredValue(config);
  const result = useMemo(() => {
    try {
      const plan = planProduction(plannedConfig);
      const layout = plan.issues.length ? null : createLayout(plan);
      return {
        plan,
        layout,
        string: layout ? encodeBlueprint(layout.blueprint) : "",
      };
    } catch (error) {
      return { error: error.message };
    }
  }, [plannedConfig]);
  const { plan, layout, string } = result;
  const inputScale = rateScale(config.rateUnit, config.belt, config.inputStackSize);
  const outputScale = rateScale(config.rateUnit, config.belt, config.outputStackSize);
  const outputLaneCapacity = BELTS[config.belt].laneRate * config.outputStackSize;
  const selectedRecipes = config.outputs.map((output) => output.recipe);
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
  const setSpaceAge = (enabled) => {
    if (enabled) {
      update({ spaceAge: true });
      return;
    }
    const nextBelt = DEFAULT_CONFIG.belt;
    const nextInputStackSize = DEFAULT_CONFIG.inputStackSize;
    const nextOutputStackSize = DEFAULT_CONFIG.outputStackSize;
    const convertRate = (value, oldScale, newScale) => {
      const rate = numericRate(value);
      return Number.isFinite(rate) ? (rate * oldScale) / newScale : value;
    };
    const oldInputScale = rateScale(config.rateUnit, config.belt, config.inputStackSize);
    const oldOutputScale = rateScale(config.rateUnit, config.belt, config.outputStackSize);
    const nextInputScale = rateScale(config.rateUnit, nextBelt, nextInputStackSize);
    const nextOutputScale = rateScale(config.rateUnit, nextBelt, nextOutputStackSize);
    const machineOverrides = Object.fromEntries(
      Object.entries(config.machineOverrides).filter(
        ([, override]) => !MACHINES[override?.factory]?.spaceAge,
      ),
    );
    update({
      spaceAge: false,
      belt: nextBelt,
      inputStackSize: nextInputStackSize,
      outputStackSize: nextOutputStackSize,
      electronicsMachine: DEFAULT_CONFIG.electronicsMachine ?? "assembling",
      outputs: config.outputs.map((output) => ({
        ...output,
        rate: convertRate(output.rate, oldOutputScale, nextOutputScale),
      })),
      inputLimits: Object.fromEntries(
        Object.entries(config.inputLimits).map(([name, value]) => [
          name,
          isFluidName(name)
            ? value
            : convertRate(value, oldInputScale, nextInputScale),
        ]),
      ),
      machineOverrides,
    });
  };
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
        inputStackSize: config.inputStackSize,
        outputStackSize: config.outputStackSize,
        spaceAge: config.spaceAge,
      });
      const usesSpaceAge = Boolean(
        imported.spaceAge ||
          config.spaceAge ||
          config.belt === "turbo-transport-belt" ||
          config.inputStackSize > 1 ||
          config.outputStackSize > 1 ||
          imported.units.some((unit) => MACHINES[unit.factory]?.spaceAge),
      );
      const ignoredEffects = imported.warnings.some((warning) =>
        warning.startsWith("Helmod modules, beacons"),
      );
      replaceConfig({
        ...DEFAULT_CONFIG,
        outputs: imported.outputs.map(({ name, rate }) => ({
          recipe: name,
          rate: rate / outputScale,
        })),
        belt: config.belt,
        maxMachines: config.maxMachines,
        layoutMode: config.layoutMode,
        rateUnit: config.rateUnit,
        inputStackSize: config.inputStackSize,
        outputStackSize: config.outputStackSize,
        spaceAge: usesSpaceAge,
        fromOre: true,
        externalItems: imported.inputs.map((input) => input.name),
        machineOverrides: Object.fromEntries(
          imported.units.map((unit) => [
            unit.recipe,
            { factory: unit.factory, count: unit.count },
          ]),
        ),
      },
        `Helmod line imported. Its targets, inputs, and machine counts are now editable below. Built-in plant productivity is included where recipes allow it.${ignoredEffects ? " Helmod modules, beacons, and non-normal quality were ignored." : ""}`,
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
            <svg viewBox="0 0 64 64" width="18" height="18">
              <path d="M15 51V21h29m-8-7 8 7-8 7" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="square" />
            </svg>
          </span>
          <span>
            FACTORIO<span className="brand-light"> / ROUTER</span>
          </span>
        </a>
        <span className="version-label">
          FACTORIO 2.0{config.spaceAge ? " · SPACE AGE" : ""} · BELTS &amp; PIPES
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <h1>Plan the line. See the blueprint.</h1>
            <p>
              Choose what to make, set your limits, and take the layout into
              Factorio.
            </p>
          </div>
          <button
            className="quiet"
            onClick={() => {
              replaceConfig(initialConfig(), "Example line restored.");
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
                <select
                  className="rate-unit-select"
                  aria-label="Rate units"
                  value={config.rateUnit}
                  onChange={(e) => update(convertRateUnit(config, e.target.value))}
                >
                  {RATE_UNITS.map((unit) => <option key={unit} value={unit}>{unit === "belts" ? "Belts" : unit}</option>)}
                </select>
              </div>
              {config.rateUnit === "belts" && (
                <p className="help">
                  Enter a fraction or multiple of a full belt. 1 output belt = {formatRate(outputScale / 60)} items/s
                  ({formatRate(outputScale)} items/min) at the selected tier and output stack size.
                  Rates above one lane (0.5 belts) automatically split into parallel sections.
                </p>
              )}
              <div className="output-targets">
              {config.outputs.map((output, i) => (
                <div className="output-target" key={i}>
                <div className="output-row">
                  <label className="sr-only" htmlFor={`rate-${i}`}>
                    Output rate {i + 1}
                  </label>
                  <RecipeSelect
                    label={`Output recipe ${i + 1}`}
                    selected={selectedRecipes}
                    value={output.recipe}
                    onChange={(recipe) => updateOutput(i, { recipe })}
                  />
                  <input
                    id={`rate-${i}`}
                    type="number"
                    min="0"
                    max={100000 / outputScale}
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
                    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                    </svg>
                  </button>
                </div>
                {numericRate(output.rate) > 0 && (() => {
                  const perMinute = Number(output.rate) * outputScale;
                  const lanes = requiredLanes(perMinute, outputLaneCapacity);
                  return (
                    <p className={`rate-feedback ${lanes > 1 ? "multi-lane" : ""}`}>
                      {perSecond(perMinute / 60)} · {formatRate(perMinute)} items/min
                      {lanes > 1 ? (
                        <>
                          {" · "}
                          <strong>{lanes} output lanes</strong> (auto-split)
                        </>
                      ) : (
                        <>
                          {" · "}
                          {formatRate((perMinute / outputLaneCapacity) * 100)}% of output lane
                        </>
                      )}
                    </p>
                  );
                })()}
                </div>
              ))}
              </div>
              <button
                className="text-button"
                disabled={config.outputs.length >= MAX_OUTPUTS}
                onClick={() =>
                  update({
                    outputs: [
                      ...config.outputs,
                      {
                        recipe: ["iron-gear-wheel", ...RECIPES.map((recipe) => recipe.id)].find((id) => !selectedRecipes.includes(id)),
                        rate: 60 / outputScale,
                      },
                    ],
                  })
                }
              >
                + Add output
              </button>
              {config.outputs.length > 3 && <span className="target-count">{config.outputs.length} / {MAX_OUTPUTS} targets</span>}
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={config.intermediates}
                  onChange={(e) => update({ intermediates: e.target.checked })}
                />
                Build intermediate products
              </label>
              <p className="help">
                Automatically include steps such as copper cable, gears, and plastic.
              </p>
            </section>
            <section className="panel">
              <h2>
                <span className="step">02</span> Machines & transport
              </h2>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={Boolean(config.spaceAge)}
                  onChange={(e) => setSpaceAge(e.target.checked)}
                />{" "}
                Space Age
              </label>
              <label className="field">
                Default assembler
                <select
                  value={config.assembler}
                  onChange={(e) =>
                    update({ assembler: e.target.value, machineOverrides: {} })
                  }
                >
                  {Object.entries(MACHINES)
                    .filter(
                      ([id, machine]) =>
                        (!machine.spaceAge || config.spaceAge) &&
                        machine.categories?.includes("crafting") &&
                        RECIPES.some((recipe) => canCraft(id, recipe)),
                    )
                    .map(([id, machine]) => (
                      <option value={id} key={id}>
                        {machine.name}
                      </option>
                    ))}
                </select>
              </label>
              {config.spaceAge && (
                <label className="field">
                  Electronics machine{" "}
                  <select
                    aria-label="Electronics machine"
                    value={config.electronicsMachine ?? "assembling"}
                    onChange={(e) => update({ electronicsMachine: e.target.value })}
                  >
                    <option value="assembling">Assembler</option>
                    <option value="electromagnetic-plant">Electromagnetic plant</option>
                  </select>
                </label>
              )}
              <div className="field-pair">
                <label className="field">
                  Belts
                  <select
                    value={config.belt}
                    onChange={(e) => {
                      if (Object.hasOwn(BELTS, e.target.value))
                        update({ belt: e.target.value });
                    }}
                  >
                    {Object.entries(BELTS)
                      .filter(([id]) => config.spaceAge || id !== "turbo-transport-belt")
                      .map(([id, belt]) => (
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
                    max={MAX_MACHINES}
                    step="1"
                    value={config.maxMachines}
                    onChange={(e) => update({ maxMachines: e.target.value })}
                  />
                </label>
              </div>
              {config.spaceAge && <details className="stacking-options">
                <summary>Belt stacking <span>{config.inputStackSize > 1 || config.outputStackSize > 1 ? `${config.inputStackSize}× in · ${config.outputStackSize}× out` : "Optional · Space Age"}</span></summary>
                <div className="field-pair">
                  {[["inputStackSize", "Input stacks"], ["outputStackSize", "Output stacks"]].map(([key, label]) => (
                    <label className="field" key={key}>
                      {label}
                      <select value={config[key]} onChange={(e) => update({ [key]: Number(e.target.value) })}>
                        <option value={1}>Unstacked</option>
                        {[2, 3, 4].map((size) => <option key={size} value={size}>{size} items high</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="help">Inputs must arrive already stacked. Output stacking adds stack inserters to every machine, including intermediates. Input inserter speeds stay conservative.</p>
                <p className="help">2 high requires Stack inserter research; 3 / 4 high require Transport belt capacity 1 / 2. Stack outputs wait for a full batch.</p>
              </details>}
              {config.belt === "turbo-transport-belt" && <p className="help">Green belts require Space Age and Turbo transport belt research.</p>}
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
                <span className="unit">{config.rateUnit === "belts" ? "BELT LIMIT" : `LIMIT / ${config.rateUnit === "items/s" ? "SEC" : "MIN"}`}</span>
              </div>
              <p className="help">
                Leave a limit blank for unlimited supply.{" "}
                {inputSupplyHint(plan)}
                {config.inputStackSize > 1 && ` Supply all belt inputs in stacks of at least ${config.inputStackSize}.`}
                {config.rateUnit === "belts" && ` 1 input belt = ${formatRate(inputScale / 60)} items/s at ${config.inputStackSize} item${config.inputStackSize === 1 ? "" : "s"} high.`}
              </p>
              {plan?.inputs.map((input) => {
                const isFluid = input.type === "fluid";
                const scale = isFluid ? fluidRateScale(config.rateUnit) : inputScale;
                const need = input.rate / scale;
                const limit = numericRate(config.inputLimits[input.name]);
                const short = Number.isFinite(limit) && limit < need * (1 - 1e-9);
                const unitLabel = inputUnitLabel(isFluid, config.rateUnit);
                const canBuildLocally =
                  config.intermediates &&
                  config.externalItems.includes(input.name) &&
                  Object.hasOwn(recipeById, input.name);
                return (
                <div className={`input-row ${short ? "over-limit" : ""}`} key={input.name}>
                  <div className="input-meta">
                    <label htmlFor={`supply-${input.name}`}>
                      {title(input.name)}
                      {isFluid && (
                        <>
                          {" "}
                          <span className="fluid-tag">pipe</span>
                        </>
                      )}
                      <small>
                        Needs {formatRate(need)} {unitLabel}
                        {plan.sections > 1 &&
                          ` · ${plan.sections} ${isFluid ? "pipes" : "lanes"} of ${formatRate(need / plan.sections)}`}
                        {short && <strong> · limit is {formatRate(need - limit)} short</strong>}
                      </small>
                    </label>
                    {canBuildLocally && (
                      <button
                        type="button"
                        className="text-button inline-build-button"
                        onClick={() =>
                          update({
                            externalItems: config.externalItems.filter(
                              (item) => item !== input.name,
                            ),
                          })
                        }
                      >
                        Build in line
                      </button>
                    )}
                  </div>
                  <input
                    aria-label={`${title(input.name)} supply limit`}
                    id={`supply-${input.name}`}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Unlimited"
                    value={config.inputLimits[input.name] ?? ""}
                    aria-invalid={short || undefined}
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
                );
              })}
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
                  Fluid-output recipes, burners, miners, and modded machines are
                  not supported.
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
                <h2>
                  {plan
                    ? plan.outputs.length > 3 ? `${plan.outputs.length} output targets` : plan.outputs
                        .map((output) => title(output.name))
                        .join(" + ")
                    : "Your production line"}
                </h2>
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
              {plan && plan.sections > 1 && !plan.issues.length && (
                <div className="section-notice" role="note">
                  <strong>
                    Auto-batched into {plan.sections} parallel sections
                  </strong>
                  <p>
                    {formatBottleneckSummary(plan)} Each section runs at 1/
                    {plan.sections} rate with its own west input and east output
                    lanes, wired into one power grid.
                  </p>
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
                {VIEWS.map(([id, label], index) => (
                  <button
                    role="tab"
                    id={`tab-${id}`}
                    aria-controls={view === id ? `view-${id}` : undefined}
                    aria-selected={view === id}
                    tabIndex={view === id ? 0 : -1}
                    key={id}
                    onClick={() => setView(id)}
                    onKeyDown={(e) => {
                      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
                      if (!step) return;
                      e.preventDefault();
                      const [next] = VIEWS[(index + step + VIEWS.length) % VIEWS.length];
                      setView(next);
                      e.currentTarget.parentElement.querySelector(`#tab-${next}`)?.focus();
                    }}
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
                    <svg viewBox="0 0 48 42" width="48" height="42" aria-hidden="true">
                      <path d="M24 3 45 39H3Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                      <path d="M24 16v11" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                      <circle cx="24" cy="33" r="2.2" fill="currentColor" />
                    </svg>
                    <p>
                      {plan?.issues.length
                        ? "No blueprint yet. Fix the limits listed above and the preview returns."
                        : "The preview will appear when the line meets your constraints."}
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
              <div className="action-status-row">
                <p role="status" aria-live="polite" className="action-status">
                  {status}
                </p>
                {undoConfig && (
                  <button className="text-button" onClick={undo}>
                    Undo
                  </button>
                )}
              </div>
            </section>
            {plan && (
              <section className="panel production-panel">
                <div className="section-heading">
                  <h2>Production line</h2>
                  <span className="unit">
                    {plan.sections > 1
                      ? `AUTOMATIC SIZING · ${plan.sections} PARALLEL SECTIONS`
                      : "AUTOMATIC SIZING"}
                  </span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Recipe</th>
                        <th>Machine</th>
                        <th>Count</th>
                        <th>{config.rateUnit === "belts" ? "Belts" : config.rateUnit === "items/s" ? "Items / sec" : "Items / min"}</th>
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
                              {plan.sections > 1 &&
                                unit.sectionCounts &&
                                (() => {
                                  const min = Math.min(...unit.sectionCounts);
                                  const max = Math.max(...unit.sectionCounts);
                                  const perSection =
                                    min === max ? String(min) : `${min}–${max}`;
                                  return ` · ${perSection} per section`;
                                })()}
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
                                  ([id, machine]) =>
                                    canCraft(id, recipeById[unit.recipe]) &&
                                    (config.spaceAge || !machine.spaceAge),
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
                              max={MAX_MACHINES}
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
                            {formatRate(
                              (unit.crafts *
                                unit.results[0].amount *
                                (1 +
                                  productivityFor(
                                    recipeById[unit.recipe],
                                    unit.factory,
                                  ))) /
                                outputScale,
                            )}
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
              {plan?.warnings.join(" ") ||
                "Supports a curated catalog of vanilla and Space Age crafting recipes, including piped fluid inputs."}{" "}
              Fluid-output recipes, research bonuses, modules, beacons, quality,
              mining, and other Space Age machines and recipes are outside this
              version.
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
