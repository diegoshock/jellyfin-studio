# Studio libraries overview

The Studio theme places a Tofa-inspired library overview above the existing Jellyfin library controls at `/dashboard/libraries`. Complete library settings are embedded below it on the same scrollable page, automatically loaded and expanded for every library. Studio no longer shows poster cards, the duplicate red Add button or an editor modal in this section. Manage scrolls to the corresponding form. Other themes retain the original presentation.

Each settings section uses the dark Studio / Tofa palette, subtle borders, a compact folder list, the full native options editor and a neutral Save Changes button. Rename, image editing and library removal remain available as text actions. Settings save explicitly per library; failed saves retain the edits. Folder additions and confirmed removals retain the native immediate update behavior. Each editor has independent state and namespaced control IDs, so simultaneous libraries cannot share settings or label targets. Query refreshes do not discard unsaved edits.

The overview contains a heading and Add Library action, four catalog metrics, a proportional library distribution, and one table row per configured library with its paths and native Scan / Manage actions. Empty libraries and failed requests have explicit states. On narrow screens the table scrolls inside its own container; the page and original controls fit the viewport.

## Measurements

`GET /Studio/Libraries` requires administrator elevation and reads the indexed catalog through `ILibraryManager`. It does not walk media directories or contact metadata providers. Summaries are cached for up to 60 seconds. Library IDs, names and configured paths form the cache key, so a changed library configuration obtains a new summary. The browser refreshes once per minute while visible.

- Titles include movies, series, audio, audiobooks, music videos, generic videos, books and photos. Episodes are displayed separately and contribute to storage, not the title count. Seasons and other folder containers are excluded.
- Registered bytes sum the primary indexed sizes of filesystem media items, deduplicated by path within each library. They exclude artwork, cache, sidecar files and additional versions not separately indexed. Unknown sizes produce a lower-bound label and an incomplete-file count. This is not a filesystem usage measurement. A title present in multiple libraries contributes to each library's own totals and distribution.
- Free and total capacity come from the existing system storage endpoint. Shared devices are counted once; aggregate capacity is withheld when devices or capacity cannot be identified.
- Added in 7 days uses the indexed `DateCreated` over a rolling seven-day interval. Today and the seven daily bars use UTC calendar days. They represent catalog dates, not an independent ingestion audit trail.
- Identified means a title has at least one nonempty provider ID. An unidentified count is not a verified metadata error, and having an ID does not certify that the match is correct. Empty catalogs do not show a fabricated percentage.

## Validation

Web type checking, ESLint, Stylelint and the production bundle pass. The web suite contains 218 passing tests, including immediate initialization of simultaneous editors, preservation of drafts on query refresh, independent saves, retained options, failed-save recovery and disabled saves after loading failures. The isolated browser instance covers movie and series settings at 1920, 1600, 999, 390 and 320 px, unique field IDs, no poster cards or editor modal, scrolling from Manage, and an actual native settings save/restore without cross-library state. No production library settings were changed.

Screenshots: `docs/screenshots/libraries-inline-options-1920.png` and `libraries-inline-options-390.png`.
