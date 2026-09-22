import { isMap, isSeq, parseDocument } from "yaml";

import type { InputYamlFile, MigratedYamlFile, Migration } from "../types.js";

// ─── Template GUIDs — identify which type a file belongs to ──────────────────
const AVAILABLE_RENDERINGS_CONTAINER_TEMPLATE = "39a9ed72-407d-4440-ba50-30956834794e";
const AVAILABLE_RENDERINGS_SECTION_TEMPLATE   = "76da0a8d-fc7e-42b2-af1e-205b49e43f98";

// ─── New GUIDs written into the container file ────────────────────────────────
const AVAILABLE_RENDERINGS_NEW_PARENT   = "94da346e-163f-4e6e-bc33-93835b0df7c6";
const AVAILABLE_RENDERINGS_NEW_TEMPLATE = "26ec1d18-11b2-4dd9-8326-f6115f4fd7eb";

// ─── New Parent written into section files ────────────────────────────────────
const AVAILABLE_RENDERINGS_SECTION_PARENT = "dc039ea8-3e05-4176-9ed8-63b16081c0ee";

// ─── SharedFields written into the container file ────────────────────────────
const ORIGINATOR_FIELD_ID    = "f6d8a61c-2f84-4401-bd24-52d2068172bc";
const ORIGINATOR_FIELD_VALUE = "{10B60B73-66CD-4896-9F6D-9DDE5AE28C95}";

// ─── Path rewrite ─────────────────────────────────────────────────────────────
const OLD_PATH_BASE = /\/sitecore\/content\/Microsites\/EnterpriseComponents\/Presentation\//i;
const NEW_PATH_BASE = "/sitecore/content/library/enterprise-components/Presentation/";

function rewritePath(original: string): string {
  return original.replace(OLD_PATH_BASE, NEW_PATH_BASE);
}

function migrate(file: InputYamlFile): MigratedYamlFile | null {
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

  const templateValue = String(rootMap.get("Template") ?? "");

  // Skip any file whose template is not one we handle
  if (
    templateValue !== AVAILABLE_RENDERINGS_CONTAINER_TEMPLATE &&
    templateValue !== AVAILABLE_RENDERINGS_SECTION_TEMPLATE
  ) return null;

  // ─── Remove DB: master ────────────────────────────────────────────────────
  rootMap.delete("DB");

  // ─── Rewrite Path ─────────────────────────────────────────────────────────
  const originalPath = String(rootMap.get("Path") ?? "");
  rootMap.set("Path", rewritePath(originalPath));

  // ─── Level 1: Container file ──────────────────────────────────────────────
  if (templateValue === AVAILABLE_RENDERINGS_CONTAINER_TEMPLATE) {
    rootMap.set("Parent", AVAILABLE_RENDERINGS_NEW_PARENT);
    rootMap.set("Template", AVAILABLE_RENDERINGS_NEW_TEMPLATE);

    // Replace SharedFields entirely with a single __Originator field
    const originatorField = document.createNode({
      ID: ORIGINATOR_FIELD_ID,
      Hint: "__Originator",
      Value: ORIGINATOR_FIELD_VALUE,
    });
    rootMap.set("SharedFields", document.createNode([originatorField]));

    return {
      fileName: file.fileName,
      relativePath: file.relativePath,
      content: document.toString({ lineWidth: 0 }),
    };
  }

  // ─── Level 2: Section files ───────────────────────────────────────────────
  // Only Parent and Path change — everything else (ID, Template, SharedFields,
  // Languages) is preserved exactly as-is.
  rootMap.set("Parent", AVAILABLE_RENDERINGS_SECTION_PARENT);

  return {
    fileName: file.fileName,
    relativePath: file.relativePath,
    content: document.toString({ lineWidth: 0 }),
  };
}

export const availableRenderingsMigration: Migration = {
  id: "available-renderings",
  description: "Migrate Sitecore Available Renderings YAML files to the Headless library structure.",
  migrate,
};
