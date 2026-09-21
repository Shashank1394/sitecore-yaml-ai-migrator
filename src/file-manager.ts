import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InputYamlFile, MigratedYamlFile } from "./types.js";

const YAML_EXTENSION = /\.ya?ml$/i;

export async function ensureDirectories(...directories: string[]): Promise<void> {
  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })));
}

export async function readYamlFiles(inputDirectory: string): Promise<InputYamlFile[]> {
  const filePaths: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(entryPath);
      else if (entry.isFile() && YAML_EXTENSION.test(entry.name)) filePaths.push(entryPath);
    }));
  }
  await visit(inputDirectory);
  filePaths.sort((a, b) => a.localeCompare(b));
  return Promise.all(filePaths.map(async (filePath) => ({
    fileName: path.basename(filePath),
    filePath,
    relativePath: path.relative(inputDirectory, filePath),
    content: await readFile(filePath, "utf8"),
  })));
}

export async function readInstructions(instructionsPath: string): Promise<string> {
  try { return await readFile(instructionsPath, "utf8"); }
  catch (error) { throw new Error(`Could not read migration instructions at ${instructionsPath}: ${error instanceof Error ? error.message : String(error)}`); }
}

export async function writeMigratedFile(outputDirectory: string, file: MigratedYamlFile): Promise<void> {
  const relativePath = file.relativePath ?? file.fileName;
  const destination = path.resolve(outputDirectory, relativePath);
  if (!YAML_EXTENSION.test(relativePath) || !destination.startsWith(`${path.resolve(outputDirectory)}${path.sep}`)) {
    throw new Error(`Migration returned an invalid YAML path: ${relativePath}`);
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, file.content, "utf8");
}
