import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InputYamlFile, MigratedYamlFile } from "./types.js";

const YAML_EXTENSION = /\.ya?ml$/i;

export async function ensureDirectories(...directories: string[]): Promise<void> {
  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })));
}

/** Delete all contents of a directory (but keep the directory itself). */
export async function clearDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name);
    return rm(entryPath, { recursive: true, force: true });
  }));
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

export async function writeMigratedFile(outputDirectory: string, file: MigratedYamlFile): Promise<void> {
  const relativePath = file.relativePath ?? file.fileName;
  const destination = path.resolve(outputDirectory, relativePath);
  if (!YAML_EXTENSION.test(relativePath) || !destination.startsWith(`${path.resolve(outputDirectory)}${path.sep}`)) {
    throw new Error(`Migration returned an invalid YAML path: ${relativePath}`);
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, file.content, "utf8");
}
