# Rendering Variants Migration Plan

Based on a diff between the input files and `output-sample`, with adjustments per review.
Languages section is untouched for all file types.

---

## Three file types in the input

| Level | Example | Identifies by |
|---|---|---|
| **1 — Variant group** | `Promo Cards.yml` (root) | `Template: e1a3b30c-...` |
| **2 — Variant child** | `Promo Cards/2-in-row.yml` | `Template: fb3e3034-...` |
| **3 — Variant definition** | `Promo Cards/2-in-row/PromoCards.yml` or `Scriban.yml` | `Template: 8fcd3cfe-...` |

---

## Changes — Level 1: Variant group files (e.g. `Promo Cards.yml`)

### 1. Update `Parent` GUID
- **From:** `968854b0-942b-4eb3-89a0-1fe8e2e86f82`
- **To:** `39685c31-1101-4436-b443-29978f234999`

### 2. Update `Template` GUID
- **From:** `e1a3b30c-77bc-4f6c-a008-d01b3371235d`
- **To:** `49c111d0-6867-4798-a724-1f103166e6e9`

### 3. Rewrite `Path`
- Replace base: `.../Microsites/EnterpriseComponents/Presentation/Rendering Variants/`
  → `/sitecore/content/library/enterprise-components/Presentation/Headless Variants/`
- Component name at the end is preserved as-is.
- Path will be quoted.

### 4. Remove `DB: master`

### 5. Remove `Type: TreelistEx` from the `Compatible Renderings` shared field
- `ID`, `Hint`, and `Value` are kept unchanged.

---

## Changes — Level 2: Variant child files (e.g. `Promo Cards/2-in-row.yml`)

### 6. Rename output file
- Convert the input filename (without extension) to PascalCase by splitting on `-` or
  spaces, capitalising each word, and joining with no separator.
- Examples: `2-in-row` → `TwoInRow.yml`, `3-in-row` → `ThreeInRow.yml`,
  `4-in-row` → `FourInRow.yml`, `split-50` → `Split50.yml`, `3 in row` → `3InRow.yml`
- No special cases — all names follow the PascalCase rule consistently.

### 7. Rewrite `Path`
- Same base-path replacement as rule 3.
- The leaf segment is replaced with the new PascalCase name (without extension).

### 8. Remove `DB: master`

### 9. Languages — leave entirely unchanged

---

## Changes — Level 3: Variant definition files (e.g. `PromoCards.yml`, `Scriban.yml`)

### 10. Rewrite `Path`
- Same base-path replacement as rule 3.
- The full path tail is preserved (component name + variant name + definition filename).

### 11. Remove `DB: master`

### 12. Languages — leave entirely unchanged

---

## Not changed

- `ID` on any file
- `SharedFields` contents beyond removing `Type: TreelistEx` on level-1 files
- All `Languages` blocks on all file types
- File names for level-1 and level-3 files
