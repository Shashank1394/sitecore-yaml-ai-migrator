import { getConfig } from "./config.js";
import { clearDirectory, ensureDirectories, readYamlFiles } from "./file-manager.js";
import { getMigration } from "./migration-registry.js";
import { migrateFiles } from "./migrator.js";

async function main(): Promise<void> {
  const config = getConfig();
  const migration = getMigration(config.instruction);
  await ensureDirectories(config.inputDirectory);
  await clearDirectory(config.outputDirectory);
  const files = await readYamlFiles(config.inputDirectory);
  console.log("Sitecore YAML Migrator\n======================");
  console.log(`\nInput directory: ${config.inputDirectory}\nOutput directory: ${config.outputDirectory}\nInstruction: ${migration.id} — ${migration.description}\nBatch size: ${config.batchSize}\n`);
  if (!files.length) { console.log("No YAML files found in the input directory. Nothing to migrate."); return; }
  console.log(`Found ${files.length} YAML file(s).`);
  await migrateFiles(config, migration, files);
  console.log("Migration completed.");
}

main().catch((error: unknown) => {
  console.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
