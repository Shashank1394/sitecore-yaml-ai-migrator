# Available Renderings Migration Plan

Based on a diff between `input/` and `output-samples/`. Review and remove anything
you don't want before asking me to create the instruction file.

---

## Two file types in the input

| Level | Example | Template GUID |
|---|---|---|
| **1 — Container** | `Available Renderings.yml` (root) | `39a9ed72-407d-4440-ba50-30956834794e` |
| **2 — Section** | `Available Renderings/Cards.yml` | `76da0a8d-fc7e-42b2-af1e-205b49e43f98` |

---

## Changes — Level 1: Container file (`Available Renderings.yml`)

### 1. `ID` — unchanged
- The item ID is always preserved as-is: `d3df4284-914e-469d-b59f-047a221fb400`

### 2. Update `Parent`
- **From:** `2a6f91c7-bbe8-40bf-a642-fe8082c01e37`
- **To:** `94da346e-163f-4e6e-bc33-93835b0df7c6`

### 3. Update `Template`
- **From:** `39a9ed72-407d-4440-ba50-30956834794e`
- **To:** `26ec1d18-11b2-4dd9-8326-f6115f4fd7eb`

### 4. Rewrite `Path`
- Replace base: `/sitecore/content/Microsites/EnterpriseComponents/Presentation/`
  → `/sitecore/content/library/enterprise-components/Presentation/`
- Path will be quoted.

### 5. Remove `DB: master`

### 6. Replace entire `SharedFields`
- Remove the existing two shared fields (`IsShared`, `Group renderings in sections`).
- Replace with a single field:
  ```yaml
  - ID: "f6d8a61c-2f84-4401-bd24-52d2068172bc"
    Hint: __Originator
    Value: "{10B60B73-66CD-4896-9F6D-9DDE5AE28C95}"
  ```

### 7. Languages — leave entirely unchanged

---

## Changes — Level 2: Section files (e.g. `Cards.yml`, `Forms.yml`)

### 8. `ID` — unchanged
- Each section's item ID is always preserved as-is.

### 9. `Parent` — unchanged
- Section files already point to the container's ID (`d3df4284-...`).
- Since the container ID is not changing, this relationship is already correct
  and requires no update.

### 10. `Template` — unchanged
- `76da0a8d-fc7e-42b2-af1e-205b49e43f98` stays the same on all section files.

### 11. Rewrite `Path`
- Same base-path replacement as rule 4.
- The section name at the end (e.g. `Cards`, `Forms`) is preserved as-is.
- Path will be quoted.

### 12. Remove `DB: master`

### 13. Remove `Type: TreelistEx` from the `Renderings` shared field
- The `ID`, `Hint`, and `Value` of that field are kept unchanged.

### 14. Languages — leave entirely unchanged

---

## Not changed

- `ID` on any file
- `Parent` on section files (relationship is preserved via the unchanged container ID)
- File names (no renaming at either level)
- `Renderings` field values (the GUID list is kept as-is)
- All `Languages` blocks on all file types

## Not part of this migration

- `BranchID` fields visible in some output samples — these are set by Sitecore after
  import and are not introduced by this migration.
- `__Shared revision`, `__Originator` on section files — runtime metadata, not added.
