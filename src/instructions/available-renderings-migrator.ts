import { isMap, parseDocument } from "yaml";

import type { InputYamlFile, MigratedYamlFile, Migration } from "../types.js";

// ─── The only two values to change per target instance ───────────────────────

/**
 * New parent for every Available Renderings item: the ID of the
 * "Available Renderings" folder that already exists in the Sitecore AI library.
 */
const NEW_PARENT_ID = "dc039ea8-3e05-4176-9ed8-63b16081c0ee";

/** Library path that replaces the XP path base in every item's `Path`. */
const NEW_PATH_BASE = "/sitecore/content/library/enterprise-components/Presentation/";

// ─── Structural — should not need editing ────────────────────────────────────

/** Every Available Renderings item sits on this template. */
const AVAILABLE_RENDERINGS_TEMPLATE = "76da0a8d-fc7e-42b2-af1e-205b49e43f98";

/** The XP path base that NEW_PATH_BASE replaces. */
const OLD_PATH_BASE = /\/sitecore\/content\/Microsites\/EnterpriseComponents\/Presentation\//i;

/** The subset of the `yaml` map API this migration uses. */
type YamlMapping = {
  get(key: string, keepScalar?: boolean): unknown;
  set(key: string, value: unknown): void;
};

function migrate(file: InputYamlFile): MigratedYamlFile | null {
  const document = parseDocument(file.content, { prettyErrors: true });
  if (document.errors.length) throw new Error(`${file.relativePath} is not valid YAML: ${document.errors[0].message}`);

  const root = document.contents;
  if (!isMap(root)) throw new Error(`${file.relativePath} must contain a YAML mapping.`);
  const rootMap = root as unknown as YamlMapping;

  // The parent "Available Renderings" folder already exists in Sitecore AI, so it
  // is not expected in the input. Anything that is not an Available Renderings
  // item is copied to the output folder untouched.
  if (String(rootMap.get("Template") ?? "") !== AVAILABLE_RENDERINGS_TEMPLATE) return null;

  rootMap.set("Parent", NEW_PARENT_ID);
  rootMap.set("Path", String(rootMap.get("Path") ?? "").replace(OLD_PATH_BASE, NEW_PATH_BASE));

  return { fileName: file.fileName, relativePath: file.relativePath, content: document.toString({ lineWidth: 0 }) };
}

export const availableRenderingsMigration: Migration = {
  id: "available-renderings",
  description: "Repoint Available Renderings items at the Sitecore AI library parent and path.",
  migrate,
};
