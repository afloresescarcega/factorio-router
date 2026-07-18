#!/usr/bin/env node
// Glue CLI: pipe a Helmod export string in, get a blueprint string out.
// Usage: node cli.mjs < input.txt        (blueprint string on stdout)
//        node cli.mjs --debug < input.txt (also dumps decoded stages to stderr)
import { HelmodFactory } from './src/helmodFactory.js';
import { decodeBlueprint } from './src/blueprintFactory.js';
import { processHelmodString } from './src/main.js';

const debug = process.argv.includes('--debug');
if (!debug) {
    // main.js logs verbosely; keep stdout clean so it's just the blueprint string
    console.log = () => {};
    console.warn = () => {};
}

const input = (await import('node:fs')).readFileSync(0, 'utf-8').trim();

if (debug) {
    const helmodData = HelmodFactory.decodeHelmod(input);
    process.stderr.write('=== decoded helmod data ===\n');
    process.stderr.write(JSON.stringify(helmodData, null, 2) + '\n');
}

const blueprintString = processHelmodString(input);

if (debug) {
    process.stderr.write('=== round-trip decoded blueprint ===\n');
    process.stderr.write(JSON.stringify(decodeBlueprint(blueprintString), null, 2) + '\n');
}

process.stdout.write(blueprintString + '\n');
