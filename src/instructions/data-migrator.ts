import path from "node:path";
import { isMap, parseDocument } from "yaml";

import type { InputYamlFile, MigratedYamlFile, Migration } from "../types.js";

// ─── Update these values before running ───────────────────────────────────────
const NEW_PARENT_ID = "B2A08F42-2F05-413C-B752-A140BD57814B";
const OLD_PATH_BASE = /\/sitecore\/content\/Microsites\/EnterpriseComponents\/Data\//i;
const NEW_PATH_BASE = "/sitecore/content/library/enterprise-components/Data/";

function rewritePath(original: string): string {
  return original.replace(OLD_PATH_BASE, NEW_PATH_BASE);
}

function migrate(file: InputYamlFile): MigratedYamlFile {
  const document = parseDocument(file.content, { prettyErrors: true });
  if (document.errors.length) {
    throw new Error(`${file.relativePath} is not valid YAML: ${document.errors[0].message}`);
  }
  const root = document.contents;
  if (!isMap(root)) throw new Error(`${file.relativePath} must contain a YAML mapping.`);

  const rootMap = root as unknown as {
    get(key: string, keepScalar?: boolean): unknown;
    set(key: string, value: unknown): void;
    delete(key: string): void;
  };

  // ─── Remove DB: master ────────────────────────────────────────────────────
  rootMap.delete("DB");

  // ─── Update Parent — root-level files only ────────────────────────────────
  // Root files sit directly in the input folder or one subfolder deep with no
  // further nesting. A nested file's dirname contains a path separator
  // (e.g. "Data/ContactSpecialist"), while a root file's dirname is either
  // "." or a single folder name with no separator (e.g. "Data").
  const dir = path.dirname(file.relativePath);
  const isRootFile = !dir.includes(path.sep) && !dir.includes("/");
  if (isRootFile) {
    rootMap.set("Parent", NEW_PARENT_ID);
  }

  // ─── Rewrite Path ─────────────────────────────────────────────────────────
  const originalPath = String(rootMap.get("Path") ?? "");
  rootMap.set("Path", rewritePath(originalPath));

  return {
    fileName: file.fileName,
    relativePath: file.relativePath,
    content: document.toString({ lineWidth: 0 }),
  };
}

export const dataMigration: Migration = {
  id: "data",
  description: "Update Parent ID of root-level files and rewrite Path for all files.",
  migrate,
};
