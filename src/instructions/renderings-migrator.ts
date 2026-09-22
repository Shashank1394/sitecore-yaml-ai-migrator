import path from "node:path";
import { isMap, isSeq, parseDocument } from "yaml";

import type { InputYamlFile, MigratedYamlFile, Migration } from "../types.js";

// ─── Templates ────────────────────────────────────────────────────────────────
// Only items on the XP rendering template hold real rendering information.
// Everything else in the input tree is a rendering *folder* and is skipped.
const XP_RENDERING_TEMPLATE   = "2a3e91a0-7987-44b5-ab34-35c2d9de83b9";
const JSON_RENDERING_TEMPLATE = "04646a89-996f-4ee7-878a-ffdbf1f0ef0d";

// ─── Shared field IDs ─────────────────────────────────────────────────────────
const PARAMETERS_TEMPLATE_FIELD_ID = "a77e8568-1ab3-44f1-a664-b7c37ec7810d";
const COMPONENT_NAME_FIELD_ID      = "037fe404-dd19-4bf7-8e30-4dadf68b27b0";

/** XP-only shared fields that have no meaning in a headless JSON rendering. */
const REMOVED_HINTS = new Set(["RenderingViewPath", "Rendering Contents Resolver", "Controller Action", "Controller"]);

/** The subset of the `yaml` map API this migration uses. */
type YamlMapping = {
  get(key: string, keepScalar?: boolean): unknown;
  set(key: string, value: unknown): void;
};

/** Derive the componentName value from the file name: "Case Study.yml" → "CaseStudy". */
function componentNameFromFile(fileName: string): string {
  return path.basename(fileName, path.extname(fileName)).replace(/\s+/g, "");
}

function migrate(file: InputYamlFile): MigratedYamlFile | null {
  const document = parseDocument(file.content, { prettyErrors: true });
  if (document.errors.length) throw new Error(`${file.relativePath} is not valid YAML: ${document.errors[0].message}`);

  const root = document.contents;
  if (!isMap(root)) throw new Error(`${file.relativePath} must contain a YAML mapping.`);
  const rootMap = root as unknown as YamlMapping;

  // ─── Leave folder items alone ───────────────────────────────────────────
  // Rendering folders carry a different template and no SharedFields, so they
  // have nothing to convert. Identifying renderings by template (rather than by
  // how deep they sit) keeps this correct no matter how the tree was serialized.
  // Returning null copies the file to the output folder untouched.
  if (String(rootMap.get("Template") ?? "") !== XP_RENDERING_TEMPLATE) return null;

  // ─── 1. Point the item at the JSON Rendering template ───────────────────
  rootMap.set("Template", JSON_RENDERING_TEMPLATE);

  const sharedFields = rootMap.get("SharedFields", true);
  if (isSeq(sharedFields)) {
    // ─── 2. Re-ID Parameters Template   4. Drop XP-only fields ────────────
    sharedFields.items = sharedFields.items.filter((field: unknown) => {
      if (!isMap(field)) return true;
      const fieldMap = field as unknown as YamlMapping;
      const hint = String(fieldMap.get("Hint") ?? "");
      if (hint === "Parameters Template") fieldMap.set("ID", PARAMETERS_TEMPLATE_FIELD_ID);
      return !REMOVED_HINTS.has(hint);
    });

    // ─── 3. Prepend componentName ─────────────────────────────────────────
    sharedFields.items.unshift(document.createNode({
      ID: COMPONENT_NAME_FIELD_ID,
      Hint: "componentName",
      Value: componentNameFromFile(file.fileName),
    }));
  }

  return { fileName: file.fileName, relativePath: file.relativePath, content: document.toString({ lineWidth: 0 }) };
}

export const renderingsMigration: Migration = {
  id: "renderings",
  description: "Convert XP renderings to the JSON Rendering template, skipping rendering folders.",
  migrate,
};
