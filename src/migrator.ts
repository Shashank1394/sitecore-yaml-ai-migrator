import type { AppConfig, InputYamlFile, Migration } from "./types.js";
import { writeMigratedFile } from "./file-manager.js";

export function batch<T>(items: T[], batchSize: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / batchSize) }, (_, index) =>
    items.slice(index * batchSize, (index + 1) * batchSize),
  );
}

export async function migrateFiles(config: AppConfig, migration: Migration, files: InputYamlFile[]): Promise<void> {
  const batches = batch(files, config.batchSize);
  console.log(`Processing ${batches.length} batch(es).\n`);
  for (const [index, currentBatch] of batches.entries()) {
    console.log(`Processing batch ${index + 1}/${batches.length}...`);
    console.log(`Files: ${currentBatch.map((file) => file.fileName).join(", ")}`);
    try {
      for (const input of currentBatch) {
        const file = migration.migrate(input);
        if (file === null) {
          console.log(`Skipped:   ${input.fileName}`);
          continue;
        }
        await writeMigratedFile(config.outputDirectory, file);
        console.log(`Generated: ${file.fileName}`);
      }
    } catch (error) {
      throw new Error(`Batch ${index + 1}/${batches.length} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log(`Completed batch ${index + 1}.\n`);
  }
}
