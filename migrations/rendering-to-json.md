# Sitecore Rendering YAML Migration

Apply the requested conversion to every supplied Sitecore rendering YAML file.

1. Change top-level `Template` to `04646a89-996f-4ee7-878a-ffdbf1f0ef0d`.
2. In `SharedFields`, change only the `ID` of `Hint: Parameters Template` to `a77e8568-1ab3-44f1-a664-b7c37ec7810d`.
3. Remove complete `SharedFields` entries for `RenderingViewPath`, `Rendering Contents Resolver`, `Controller Action`, and `Controller`.
4. Preserve all unrelated content and return complete YAML.
