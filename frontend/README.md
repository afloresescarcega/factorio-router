# Factorio Router frontend

The frontend is a Vite + React application. It plans a vanilla solid-item
production line locally, previews the resulting layout, and exports a Factorio
blueprint string. Helmod import is optional.

[Open the published app](https://afloresescarcega.github.io/factorio-router/).

Use Node.js 22.13+ or 24+. From this directory:

```sh
npm ci
npm run start
```

The development server runs at <http://localhost:5173>. Build the deployable
static files with:

```sh
npm run build
```

The output is written to `dist/`. Run the unit tests once with `npm test`, use
`npm run test:watch` for watch mode, and generate LCOV coverage with
`npm run test:coverage`.

The Helmod-compatible CLI remains available for scripted imports:

```sh
node cli.mjs < helmod-export.txt > blueprint.txt
node cli.mjs --compact < helmod-export.txt > compact-blueprint.txt
```

The app's **Compact layout** option and the CLI's `--compact` flag use the same
optional placement strategy. Native JSON plans also accept
`"layoutMode": "compact"`; the default remains `"standard"`.

For the complete native workflow, CLI examples, supported recipes, and layout assumptions, see the [project README](../README.md).
