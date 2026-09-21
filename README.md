# Sitecore YAML AI Migrator

Migrates batches of Sitecore serialized YAML files with an OpenRouter model. Input files are never changed; generated files are written to `output/`.

## Setup

Install Node.js and pnpm, then run:

```bash
pnpm install
copy .env.example .env
```

Add an OpenRouter API key and a supported model to `.env`. You can choose any OpenRouter model available to your account. `BATCH_SIZE` defaults to 10.

## Run

Put `.yml` or `.yaml` files anywhere under `input/`; nested folders are supported and preserved under `output/`. Then run:

```bash
pnpm dev
```

Optional paths are supported:

```bash
pnpm dev -- --input ./input --output ./output --instructions ./migrations/rendering-to-json.md
```

For another migration type, create or edit a Markdown instruction file and pass it with `--instructions`. This first phase does not include advanced validation, diffs, or automatic rollback.
