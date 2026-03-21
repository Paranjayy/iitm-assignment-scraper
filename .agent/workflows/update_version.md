---
description: How to update the extension version
---

When making significant changes to the IITM Extension (like adding new features or fixing major bugs), follow these steps to update the version:

1. Open `manifest.json`.
2. Locate the `"version"` field.
3. Increment the version number:
   - For bug fixes: Increment the patch (e.g., `1.0.0` -> `1.0.1`).
   - For new features: Increment the minor version (e.g., `1.0.1` -> `1.1.0`).
   - For major overhauls: Increment the major version (e.g., `1.1.0` -> `2.0.0`).
4. (Optional) Add a comment or update the description if needed.
