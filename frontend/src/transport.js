// Rates are normalized to items/min before sizing or checking constraints.
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

export const RATE_UNITS = ["items/min", "items/s", "belts"];

// Allow conversion roundoff, without treating a zero supply as enough for a
// small positive target or accepting an intentionally over-capacity rate.
export const rateExceeds = (rate, capacity) =>
  rate - capacity > 64 * Number.EPSILON * Math.max(Math.abs(rate), Math.abs(capacity));

export function numericRate(value) {
  return typeof value === "number" || (typeof value === "string" && value.trim() !== "")
    ? Number(value)
    : NaN;
}

export function transportSettings(config = {}) {
  const belt = config.belt ?? "transport-belt";
  if (!Object.hasOwn(BELTS, belt)) throw new Error("Choose a supported belt tier.");
  const rateUnit = config.rateUnit ?? "items/min";
  if (!RATE_UNITS.includes(rateUnit))
    throw new Error("Choose items/min, items/s, or belts for rate units.");
  const settings = { belt, rateUnit };
  for (const [key, label] of [["inputStackSize", "Input"], ["outputStackSize", "Output"]]) {
    const value = config[key] === undefined ? 1 : numericRate(config[key]);
    if (!Number.isInteger(value) || value < 1 || value > 4)
      throw new Error(`${label} belt stack size must be a whole number between 1 and 4.`);
    settings[key] = value;
  }
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

export function convertRateUnit(config, rateUnit) {
  const current = transportSettings(config);
  const convert = (value, stackSize) => {
    const number = numericRate(value);
    // Keep incomplete/invalid edits invalid when changing units.
    if (!Number.isFinite(number)) return value;
    return number * rateScale(current.rateUnit, current.belt, stackSize) /
      rateScale(rateUnit, current.belt, stackSize);
  };
  return {
    ...config,
    rateUnit,
    outputs: config.outputs.map((output) => ({
      ...output, rate: convert(output.rate, current.outputStackSize),
    })),
    inputLimits: Object.fromEntries(Object.entries(config.inputLimits || {}).map(
      ([name, value]) => [name, convert(value, current.inputStackSize)],
    )),
  };
}
