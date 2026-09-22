import type { AppConfig, InputYamlFile, Migration } from "./types.js";
import { writeMigratedFile } from "./file-manager.js";

export function batch<T>(items: T[], batchSize: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / batchSize) }, (_, index) =>
    items.slice(index * batchSize, (index + 1) * batchSize),
  );
}

/**
 * Remove the root-level `DB: master` line. Sitecore AI serialization does not
 * carry the source database, so it is dropped from every file the tool writes,
 * whether or not the migration converted it.
 *
 * This is a line-level removal rather than a YAML edit on purpose: files a
 * migration did not convert then pass through otherwise byte-for-byte, instead
 * of being reindented by a parse/serialize round trip. In Sitecore item YAML a
 * line starting at column 0 is always a root-level key, so this cannot match a
 * field value — those are always indented under `SharedFields` or `Languages`.
 */
export function stripDatabase(content: string): string {
  return content.replace(/^DB:[^\r\n]*(?:\r?\n|$)/m, "");
}

export async function migrateFiles(config: AppConfig, migration: Migration, files: InputYamlFile[]): Promise<void> {
  const batches = batch(files, config.batchSize);
  let converted = 0;
  let copied = 0;
  console.log(`Processing ${batches.length} batch(es).\n`);
  for (const [index, currentBatch] of batches.entries()) {
    console.log(`Processing batch ${index + 1}/${batches.length}...`);
    console.log(`Files: ${currentBatch.map((file) => file.fileName).join(", ")}`);
    try {
      for (const input of currentBatch) {
        const migrated = migration.migrate(input);
        // A migration returns null for files it does not convert. Those still go to
        // the output folder, so it is always a complete tree that can be pasted
        // straight into the Sitecore AI project.
        const file = migrated ?? {
          fileName: input.fileName,
          relativePath: input.relativePath,
          content: input.content,
        };
        await writeMigratedFile(config.outputDirectory, { ...file, content: stripDatabase(file.content) });
        if (migrated) {
          converted += 1;
          console.log(`Converted: ${migrated.fileName}`);
        } else {
          copied += 1;
          console.log(`Copied:    ${input.fileName}`);
        }
      }
    } catch (error) {
      throw new Error(`Batch ${index + 1}/${batches.length} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log(`Completed batch ${index + 1}.\n`);
  }
  console.log(`${converted} converted, ${copied} copied, ${files.length} file(s) total in output.`);
}
