import { renderingsMigration } from "./instructions/renderings-migrator.js";
import { renderingVariantsMigration } from "./instructions/rendering-variants-migrator.js";
import type { Migration } from "./types.js";

const migrations: Migration[] = [renderingsMigration, renderingVariantsMigration];

export function getMigration(instruction: string): Migration {
  const normalized = instruction.trim().replace(/\\/g, "/").split("/").pop()
    ?.replace(/\.tsx?$/i, "").replace(/-migrator$/i, "").toLowerCase();
  const migration = migrations.find((candidate) => candidate.id === normalized);
  if (!migration) {
    throw new Error(`Unknown instruction "${instruction}". Available instructions: ${migrations.map((item) => item.id).join(", ")}.`);
  }
  return migration;
}

export function availableMigrations(): Migration[] { return [...migrations]; }
