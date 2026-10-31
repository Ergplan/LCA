# LCA Workbench — product mock

Interactive UI mock of a carbon life cycle assessment (LCA) application for a refinery, prepared for ADNOC RFT 6000151329 (*Software for Carbon Life Cycle Assessment (LCA) for Three Years*). All figures are illustrative sample data.

Open `index.html` in a browser. It is a single self-contained file (internet is only needed for the Manrope font).

## What is in it

- **Overview:** dashboard with a live isometric site map (18 data collection points, pipelines, vehicles, stock), command & control centre, site map with a 36-month player.
- **Footprints:** products with a value-chain trace (steps, Sankey, contribution tree, shipment footprints), study library with review workflow, study setup, model workspace, carbon formulas, calculation runs, emissions analysis, scenarios.
- **Data:** inventory, data import with validation, supplier data, data connectors, background databases.
- **Outputs:** reports, footprint exchange (PACT-style).
- **Administration:** users & access (RBAC), audit log, operations (performance, backup, documentation), HSE & policies, licence & exit, requirements & acceptance (traceability to the requirements baseline v0.1 and a market benchmark), subscription & support.
- A guided tour (**▶ Tour**), light/dark mode and three Strata themes.

## Layout

```
index.html                 built single-file mock (commit after rebuilding)
src/head.html, body.html   page shell and styles
src/01-…06-*.js            application code, concatenated in order
vendor/strata-charts.min.js Strata Charts v1.1.1 bundle
tools/build.sh             rebuilds index.html from src/ and vendor/
vercel.json                static hosting config (noindex header)
```

## Build

```bash
./tools/build.sh
```

## Deploy

Import the repo in Vercel (framework preset: Other, no build command, output directory: root), or run `npx vercel deploy --prod` from the repo root.
