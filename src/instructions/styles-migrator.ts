import path from "node:path";
import { isMap, parseDocument } from "yaml";

import type { InputYamlFile, MigratedYamlFile, Migration } from "../types.js";

// ─── New values written into every file ───────────────────────────────────────
const NEW_PARENT_ID = "2EE1431D-BADD-48E7-B255-DD907FA67E2C";

// ─── Path rewrite ─────────────────────────────────────────────────────────────
const OLD_PATH_BASE = /\/sitecore\/content\/Microsites\/EnterpriseComponents\/Presentation\//i;
const NEW_PATH_BASE = "/sitecore/content/library/enterprise-components/Presentation/";

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

  // ─── Remove DB: master ──────────────────────────────────────────────────
  rootMap.delete("DB");

  // ─── Update Parent — root-level files only ──────────────────────────────
  // Files inside subfolders already point to their correct parent (the root
  // file above them) and must not be changed.
  const isRootFile = path.dirname(file.relativePath) === ".";
  if (isRootFile) {
    rootMap.set("Parent", NEW_PARENT_ID);
  }

  // ─── Rewrite Path ───────────────────────────────────────────────────────
  const originalPath = String(rootMap.get("Path") ?? "");
  rootMap.set("Path", rewritePath(originalPath));

  return {
    fileName: file.fileName,
    relativePath: file.relativePath,
    content: document.toString({ lineWidth: 0 }),
  };
}

export const stylesMigration: Migration = {
  id: "styles",
  description: "Update Parent ID and rewrite Path for Sitecore Styles items to the Headless library structure.",
  migrate,
};
