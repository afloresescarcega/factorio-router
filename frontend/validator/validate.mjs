// Blueprint string validator mirroring factorio-blueprint-editor's pipeline
// (packages/editor/src/core/bpString.ts): base64 -> inflate -> JSON.parse ->
// Ajv against its blueprintSchema.json, with name keywords checked against
// Factorio 2.0 data exported by the same project.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pako from 'pako';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, 'blueprintSchema.json'), 'utf-8'));
const names = JSON.parse(readFileSync(join(here, 'factorioNames.json'), 'utf-8'));

const sets = Object.fromEntries(Object.entries(names).map(([k, v]) => [k, new Set(v)]));
// The editor's snapshot is base-game-only. Add only the Space Age transport
// entities this planner emits, verified against Wube factorio-data 2.0.72:
// space-age/prototypes/entity/{transport-belts,entities}.lua.
for (const name of ['turbo-transport-belt', 'turbo-underground-belt', 'turbo-splitter', 'stack-inserter']) {
    sets.entities.add(name);
    sets.items.add(name);
}

const ajv = new Ajv({ verbose: true });
const nameKeyword = (keyword, check) =>
    ajv.addKeyword(keyword, { validate: check, errors: false, schema: false });
nameKeyword('entityName', d => sets.entities.has(d));
nameKeyword('itemName', d => sets.items.has(d));
nameKeyword('fluidName', d => sets.fluids.has(d));
nameKeyword('recipeName', d => sets.recipes.has(d));
nameKeyword('tileName', d => sets.tiles.has(d));
nameKeyword('itemFluidSignalRecipeEntityName', d =>
    sets.items.has(d) || sets.fluids.has(d) || sets.signals.has(d) || sets.recipes.has(d));

const validateSchema = ajv.compile(schema);

// Same decode as the editor: skip version char, base64, inflate, parse.
// A pako "incorrect data check" error here means the string is corrupted.
export function decodeBlueprintString(str) {
    const trimmed = str.replace(/\s/g, '');
    const compressed = Buffer.from(trimmed.slice(1), 'base64');
    const json = pako.inflate(compressed, { to: 'string' });
    return JSON.parse(json);
}

export function validateBlueprintString(str) {
    let data;
    try {
        data = decodeBlueprintString(str);
    } catch (e) {
        return { ok: false, errors: [`corrupted blueprint string: ${e.message || e}`] };
    }
    if (validateSchema(data)) {
        return { ok: true, errors: [] };
    }
    const errors = validateSchema.errors.map(e => {
        const value = typeof e.data === 'string' ? ` (${JSON.stringify(e.data)})` : '';
        return `${e.dataPath || '/'} ${e.keyword}: ${e.message}${value}`;
    });
    return { ok: false, errors };
}
