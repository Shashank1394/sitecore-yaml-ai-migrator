import "dotenv/config";
import path from "node:path";
import type { AppConfig } from "./types.js";

function valueAfter(flag: string, args: string[]): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Expected a path after ${flag}.`);
  return value;
}

export function getConfig(args = process.argv.slice(2)): AppConfig {
  const batchSize = Number(process.env.BATCH_SIZE || 10);
  if (!Number.isInteger(batchSize) || batchSize <= 0) throw new Error("BATCH_SIZE must be a positive whole number.");
  return {
    batchSize,
    inputDirectory: path.resolve(valueAfter("--input", args) || "input"),
    outputDirectory: path.resolve(valueAfter("--output", args) || "output"),
    instruction: (() => {
      const value = valueAfter("--instruction", args);
      if (!value) throw new Error("--instruction is required. Pass the name of an instruction file, e.g. --instruction renderings-migrator");
      return value;
    })(),
  };
}
