import { isFluidName } from "./recipeCatalog.js";

// Rates are normalized to items/min (or fluid/min) before sizing or checking constraints.
// Belt speeds and stack inserters: Wube factorio-data, tag 2.0.72,
// space-age/prototypes/entity/{transport-belts,entities}.lua.
export const BELTS = {
  "transport-belt": {
    name: "Yellow belt", underground: "underground-belt", splitter: "splitter", laneRate: 450,
  },
  "fast-transport-belt": {
    name: "Red belt", underground: "fast-underground-belt", splitter: "fast-splitter", laneRate: 900,
  },
  "express-transport-belt": {
    name: "Blue belt", underground: "express-underground-belt", splitter: "express-splitter", laneRate: 1350,
  },
  "turbo-transport-belt": {
    name: "Green belt (Space Age)", underground: "turbo-underground-belt", splitter: "turbo-splitter", laneRate: 1800,
  },
};

// Conservative single-pipe budget matching one normal-quality Factorio 2.0 pump (1,200 fluid/s).
export const PIPE_RATE = 72000;

export const RATE_UNITS = ["items/min", "items/s", "belts"];

// Allow conversion roundoff, without treating a zero supply as enough for a
// small positive target or accepting an intentionally over-capacity rate.
export const rateExceeds = (rate, capacity) =>
  rate - capacity > 64 * Number.EPSILON * Math.max(Math.abs(rate), Math.abs(capacity));

export function requiredLanes(rate, capacity) {
  if (!rateExceeds(rate, capacity)) return 1;
  const estimate = Math.max(2, Math.ceil(rate / capacity));
  if (!rateExceeds(rate, (estimate - 1) * capacity)) return estimate - 1;
  return estimate;
}

export function numericRate(value) {
  return typeof value === "number" || (typeof value === "string" && value.trim() !== "")
    ? Number(value)
    : NaN;
}

export function transportSettings(config = {}) {
  const belt = config.belt ?? "transport-belt";
  if (!Object.hasOwn(BELTS, belt)) throw new Error("Choose a supported belt tier.");
  const spaceAge = config.spaceAge === true;
  const rateUnit = config.rateUnit ?? "items/min";
  if (!RATE_UNITS.includes(rateUnit))
    throw new Error("Choose items/min, items/s, or belts for rate units.");
  const settings = { belt, rateUnit, spaceAge };
  for (const [key, label] of [["inputStackSize", "Input"], ["outputStackSize", "Output"]]) {
    const value = config[key] === undefined ? 1 : numericRate(config[key]);
    if (!Number.isInteger(value) || value < 1 || value > 4)
      throw new Error(`${label} belt stack size must be a whole number between 1 and 4.`);
    settings[key] = value;
  }
  if (!spaceAge && belt === "turbo-transport-belt")
    throw new Error("Enable Space Age to use Green belts.");
  if (!spaceAge && settings.inputStackSize > 1)
    throw new Error("Enable Space Age to use input belt stacking.");
  if (!spaceAge && settings.outputStackSize > 1)
    throw new Error("Enable Space Age to use output belt stacking.");
  return settings;
}

export function rateScale(unit, belt, stackSize) {
  if (unit === "items/min") return 1;
  if (unit === "items/s") return 60;
  // A belt equivalent always means BOTH lanes at the selected stack height.
  if (unit === "belts" && Object.hasOwn(BELTS, belt))
    return BELTS[belt].laneRate * 2 * stackSize;
  throw new Error("Choose items/min, items/s, or belts for rate units.");
}

export function fluidRateScale(unit) {
  if (unit === "items/min") return 1;
  // Fluids travel by pipe, not belt; in belts mode, display and enter them in fluid/s.
  if (unit === "items/s" || unit === "belts") return 60;
  throw new Error("Choose items/min, items/s, or belts for rate units.");
}

export function convertRateUnit(config, rateUnit) {
  const current = transportSettings(config);
  const convert = (value, fromScale, toScale) => {
    const number = numericRate(value);
    // Keep incomplete/invalid edits invalid when changing units.
    if (!Number.isFinite(number)) return value;
    return (number * fromScale) / toScale;
  };
  const fromOut = rateScale(current.rateUnit, current.belt, current.outputStackSize);
  const toOut = rateScale(rateUnit, current.belt, current.outputStackSize);
  const fromIn = rateScale(current.rateUnit, current.belt, current.inputStackSize);
  const toIn = rateScale(rateUnit, current.belt, current.inputStackSize);
  const fromFluid = fluidRateScale(current.rateUnit);
  const toFluid = fluidRateScale(rateUnit);
  return {
    ...config,
    rateUnit,
    outputs: config.outputs.map((output) => ({
      ...output, rate: convert(output.rate, fromOut, toOut),
    })),
    inputLimits: Object.fromEntries(Object.entries(config.inputLimits || {}).map(
      ([name, value]) => [
        name,
        isFluidName(name)
          ? convert(value, fromFluid, toFluid)
          : convert(value, fromIn, toIn),
      ],
    )),
  };
}
