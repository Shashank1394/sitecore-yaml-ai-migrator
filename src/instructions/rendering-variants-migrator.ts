import path from "node:path";
import { isMap, isSeq, parseDocument } from "yaml";

import type { InputYamlFile, MigratedYamlFile, Migration } from "../types.js";

// ─── Template GUIDs — identify which type a file belongs to ──────────────────
const RENDERING_VARIANTS_FOLDER_TEMPLATE = "e1a3b30c-77bc-4f6c-a008-d01b3371235d";
const RENDERING_VARIANT_TEMPLATE         = "fb3e3034-33f8-4ce8-be98-dd05010f4c22";

// ─── New GUIDs written into migrated files ────────────────────────────────────
const HEADLESS_VARIANTS_PARENT_ID        = "39685c31-1101-4436-b443-29978f234999";
const HEADLESS_VARIANTS_FOLDER_TEMPLATE  = "49c111d0-6867-4798-a724-1f103166e6e9";

// ─── Path rewrite ─────────────────────────────────────────────────────────────
const OLD_PATH_BASE = /\/sitecore\/content\/Microsites\/EnterpriseComponents\/Presentation\/Rendering Variants\//i;
const NEW_PATH_BASE = "/sitecore/content/library/enterprise-components/Presentation/Headless Variants/";

/** Rewrite the Path value: replace the old base segment with the new one. */
function rewritePath(original: string): string {
  return original.replace(OLD_PATH_BASE, NEW_PATH_BASE);
}

// ─── Leading digit → word mapping ────────────────────────────────────────────
const LEADING_DIGIT_WORDS: Record<string, string> = {
  "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four",
  "5": "Five", "6": "Six", "7": "Seven", "8": "Eight", "9": "Nine",
};

/**
 * Convert a variant filename (without extension) to a PascalCase identifier.
 *
 * Rules:
 * - Split on `-`, `_`, or whitespace; capitalise the first letter of each word;
 *   strip any remaining non-alphanumeric characters; join with no separator.
 * - If the very first character of the whole result is a digit, replace that
 *   leading digit with its English word so the result never starts with a number.
 * - Digits embedded anywhere else are left as-is.
 *
 * Examples:
 *   "2-in-row"            → "TwoInRow"
 *   "split-50"            → "Split50"
 *   "Blog Cards"          → "BlogCards"
 *   "tall_wide"           → "TallWide"
 *   "Fullwidth-CTA"       → "FullwidthCTA"
 *   "NoColourBlock_"      → "NoColourBlock"  (trailing separator stripped)
 */
function toPascalCase(name: string): string {
  const pascal = name
    .split(/[-_\s]+/)
    .map((word) => {
      // Strip any characters that are not alphanumeric
      const clean = word.replace(/[^a-zA-Z0-9]/g, "");
      return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "";
    })
    .join("");

  // Replace a leading single digit with its word equivalent
  return pascal.replace(/^\d/, (d) => LEADING_DIGIT_WORDS[d] ?? d);
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

  // ─── Skip any file whose template is not one we handle ───────────────────
  if (templateValue !== RENDERING_VARIANTS_FOLDER_TEMPLATE && templateValue !== RENDERING_VARIANT_TEMPLATE) return null;

  // ─── Remove DB: master ────────────────────────────────────────────────────
  rootMap.delete("DB");

  // ─── Rewrite Path ─────────────────────────────────────────────────────────
  const originalPath = String(rootMap.get("Path") ?? "");
  const newPath = rewritePath(originalPath);
  rootMap.set("Path", newPath);

  // ─── Level 1: Variant group ───────────────────────────────────────────────
  if (templateValue === RENDERING_VARIANTS_FOLDER_TEMPLATE) {
    rootMap.set("Parent", HEADLESS_VARIANTS_PARENT_ID);
    rootMap.set("Template", HEADLESS_VARIANTS_FOLDER_TEMPLATE);

    // Remove Type: TreelistEx from Compatible Renderings shared field
    const sharedFields = rootMap.get("SharedFields", true);
    if (isSeq(sharedFields)) {
      for (const field of sharedFields.items) {
        if (!isMap(field)) continue;
        const fieldMap = field as unknown as {
          get(key: string): unknown;
          delete(key: string): void;
        };
        if (fieldMap.get("Hint") === "Compatible Renderings") {
          fieldMap.delete("Type");
        }
      }
    }

    // File name and folder are preserved as-is for level-1 files
    return {
      fileName: file.fileName,
      relativePath: file.relativePath,
      content: document.toString({ lineWidth: 0 }),
    };
  }

  // ─── Level 2: Variant child ───────────────────────────────────────────────
  if (templateValue === RENDERING_VARIANT_TEMPLATE) {
    const baseName = path.basename(file.fileName, path.extname(file.fileName));
    const pascalName = toPascalCase(baseName);
    const newFileName = `${pascalName}.yml`;

    // Rewrite the path leaf segment to the new PascalCase name
    const newPathWithLeaf = newPath.replace(
      new RegExp(`${escapeRegex(baseName)}$`),
      pascalName,
    );
    rootMap.set("Path", newPathWithLeaf);

    // Add __Display name as an unversioned field under the "en" language entry,
    // using the original input filename (without extension) as the value.
    const languages = rootMap.get("Languages", true);
    if (isSeq(languages)) {
      for (const lang of languages.items) {
        if (!isMap(lang)) continue;
        const langMap = lang as unknown as {
          get(key: string, keepScalar?: boolean): unknown;
          set(key: string, value: unknown): void;
        };
        if (String(langMap.get("Language")) !== "en") continue;

        const displayNameField = document.createNode({
          ID: "b5e02ad9-d56f-4c41-a065-a133db87bdeb",
          Hint: "__Display name",
          Value: baseName,
        });
        const existingFields = langMap.get("Fields", true);
        if (isSeq(existingFields)) {
          existingFields.items.push(displayNameField);
        } else {
          // Insert "Fields" before "Versions" so unversioned fields appear first
          const langNode = lang as unknown as import("yaml").YAMLMap;
          const versionsIndex = langNode.items.findIndex(
            (pair) => isMap(pair) === false && String((pair as import("yaml").Pair).key) === "Versions",
          );
          const fieldsNode = document.createNode([displayNameField]);
          const fieldsPair = document.createPair("Fields", fieldsNode);
          if (versionsIndex >= 0) {
            langNode.items.splice(versionsIndex, 0, fieldsPair);
          } else {
            langNode.items.push(fieldsPair);
          }
        }
        break;
      }
    }

    // Compute new relativePath: original folder + new PascalCase file name
    const dir = path.dirname(file.relativePath);
    const newRelativePath = dir === "." ? newFileName : `${dir}/${newFileName}`;

    return {
      fileName: newFileName,
      relativePath: newRelativePath,
      content: document.toString({ lineWidth: 0 }),
    };
  }

  // ─── Unrecognised template — pass through unchanged ──────────────────────
  return {
    fileName: file.fileName,
    relativePath: file.relativePath,
    content: document.toString({ lineWidth: 0 }),
  };
}

/** Escape special regex characters in a literal string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const renderingVariantsMigration: Migration = {
  id: "rendering-variants",
  description: "Migrate Sitecore rendering variant YAML files to the Headless Variants structure.",
  migrate,
};
