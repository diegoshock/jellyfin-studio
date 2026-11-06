# Metadata panel and startup branding repair

The Studio metadata manager at `/metadata` now uses a contained, scrollable two-column layout below the shared toolbar. Its folder tree no longer uses the legacy fixed 3.25-rem top offset. The editor occupies the remaining column and shows a localized selection prompt while no item is selected. On screens up to 800 px, the tree and editor stack and a persistent Folders button returns focus to the tree. Scrolling and autofocus stay inside the panel rather than moving the document beneath the fixed header. Native metadata fields, validation and Save behavior are retained; the layout overrides are restricted to Studio.

The initial `.splashLogo` in the common startup stylesheet now uses the existing Jellyfin silhouette as a mask filled with Studio red (`#8e203b`). This applies before the theme or JavaScript loads and removes the desktop override that briefly restored the original gradient banner. No library images or server data are changed.

Validation covers the metadata empty state, expanding a library, selecting a movie, header clearance, contained scrolling, mobile folder navigation and overflow at 1920/919/800/390/320 px. Native metadata Save was exercised and restored in an isolated instance; the Dark theme was checked to retain its native editor. The splash was checked with JavaScript blocked at 1920 and 390 px, verifying a red fill, an active silhouette mask and no blue/purple background image. Production compilation, ESLint and Stylelint pass.

Screenshots: `docs/screenshots/metadata-empty-1920.png`, `metadata-editor-1920.png`, `metadata-editor-390.png`, `red-startup-logo-1920.png` and `red-startup-logo-390.png`.
