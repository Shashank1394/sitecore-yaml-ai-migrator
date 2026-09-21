import path from "node:path";
import { isMap, isSeq, parseDocument } from "yaml";

import type { InputYamlFile, MigratedYamlFile, Migration } from "../types.js";

const JSON_RENDERING_TEMPLATE = "04646a89-996f-4ee7-878a-ffdbf1f0ef0d";
const PARAMETERS_TEMPLATE_FIELD = "a77e8568-1ab3-44f1-a664-b7c37ec7810d";
const COMPONENT_NAME_FIELD = "037fe404-dd19-4bf7-8e30-4dadf68b27b0";
const REMOVED_HINTS = new Set(["RenderingViewPath", "Rendering Contents Resolver", "Controller Action", "Controller"]);

/** Derive the componentName value from the file name: strip extension, remove spaces. */
function componentNameFromFile(fileName: string): string {
  return path.basename(fileName, path.extname(fileName)).replace(/\s+/g, "");
}

function migrate(file: InputYamlFile): MigratedYamlFile {
  const document = parseDocument(file.content, { prettyErrors: true });
  if (document.errors.length) throw new Error(`${file.relativePath} is not valid YAML: ${document.errors[0].message}`);
  const root = document.contents;
  if (!isMap(root)) throw new Error(`${file.relativePath} must contain a YAML mapping.`);

  (root as unknown as { set(key: string, value: string): void }).set("Template", JSON_RENDERING_TEMPLATE);
  const sharedFields = root.get("SharedFields", true);
  if (isSeq(sharedFields)) {
    // Filter out removed hints and update Parameters Template ID.
    sharedFields.items = sharedFields.items.filter((field: { get: (arg0: string) => any; set: (arg0: string, arg1: string) => void; }) => {
      if (!isMap(field)) return true;
      const hint = field.get("Hint");
      if (hint === "Parameters Template") field.set("ID", PARAMETERS_TEMPLATE_FIELD);
      return !REMOVED_HINTS.has(String(hint));
    });

    // Prepend the componentName field at the top of SharedFields.
    const componentNameEntry = document.createNode({
      ID: COMPONENT_NAME_FIELD,
      Hint: "componentName",
      Value: componentNameFromFile(file.fileName),
    });
    sharedFields.items.unshift(componentNameEntry);
  }
  return { fileName: file.fileName, relativePath: file.relativePath, content: document.toString({ lineWidth: 0 }) };
}

export const renderingsMigration: Migration = {
  id: "renderings",
  description: "Convert Sitecore renderings to the JSON Rendering template.",
  migrate,
};
