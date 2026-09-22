# Sitecore YAML Migrator

Converts Sitecore XP serialized YAML items into their Sitecore AI (headless) equivalents, ready to push with `ser push`.

Each migration is plain TypeScript: files are parsed, specific GUIDs, paths, and fields are rewritten, and everything else is preserved. Input files are never modified. Results are written to `output/`.

## Setup

Install Node.js and pnpm, then run:

```bash
pnpm install
copy .env.example .env
```

`BATCH_SIZE` controls how many files are grouped per progress log entry and defaults to 10.

## Run

Put `.yml` or `.yaml` files anywhere under `input/`. Nested folders are supported and preserved under `output/`. Then pick a migration and run it:

```bash
pnpm dev -- --instruction renderings
```

`--instruction` is required. Custom paths are optional:

```bash
pnpm dev -- --instruction data --input ./input --output ./output
```

`output/` is emptied at the start of every run.

## Available migrations

| `--instruction` | What it migrates |
|---|---|
| `renderings` | Renderings to the JSON Rendering template, adding `componentName` |
| `rendering-variants` | Rendering Variants to the Headless Variants structure |
| `available-renderings` | Available Renderings to the headless library structure |
| `styles` | Styles items to the headless library structure |
| `data` | Data items to the headless library structure |

Files a migration does not recognise are skipped and reported in the run log.

## Adding a migration

1. Create `src/instructions/<name>-migrator.ts` exporting a `Migration`: an `id`, a `description`, and a `migrate(file)` that returns the new file or `null` to skip it.
2. Register it in the `migrations` array in `src/migration-registry.ts`.

The `id` is what `--instruction` matches, so `--instruction <name>` and `--instruction <name>-migrator` both resolve to it.
