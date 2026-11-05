# Studio libraries overview

The Studio theme places a Tofa-inspired library overview above the existing Jellyfin library controls at `/dashboard/libraries`. The original add, scan-all, cards, menus, rename, images, edit and remove flows remain below it on the same scrollable page. Other themes retain the original presentation.

The overview contains a heading and Add Library action, four catalog metrics, a proportional library distribution, and one table row per configured library with its paths and native Scan / Manage actions. Empty libraries and failed requests have explicit states. On narrow screens the table scrolls inside its own container; the page and original controls fit the viewport.

## Measurements

`GET /Studio/Libraries` requires administrator elevation and reads the indexed catalog through `ILibraryManager`. It does not walk media directories or contact metadata providers. Summaries are cached for up to 60 seconds. Library IDs, names and configured paths form the cache key, so a changed library configuration obtains a new summary. The browser refreshes once per minute while visible.

- Titles include movies, series, audio, audiobooks, music videos, generic videos, books and photos. Episodes are displayed separately and contribute to storage, not the title count. Seasons and other folder containers are excluded.
- Registered bytes sum the primary indexed sizes of filesystem media items, deduplicated by path within each library. They exclude artwork, cache, sidecar files and additional versions not separately indexed. Unknown sizes produce a lower-bound label and an incomplete-file count. This is not a filesystem usage measurement. A title present in multiple libraries contributes to each library's own totals and distribution.
- Free and total capacity come from the existing system storage endpoint. Shared devices are counted once; aggregate capacity is withheld when devices or capacity cannot be identified.
- Added in 7 days uses the indexed `DateCreated` over a rolling seven-day interval. Today and the seven daily bars use UTC calendar days. They represent catalog dates, not an independent ingestion audit trail.
- Identified means a title has at least one nonempty provider ID. An unidentified count is not a verified metadata error, and having an ID does not certify that the match is correct. Empty catalogs do not show a fabricated percentage.

## Validation

Web type checking, ESLint, Stylelint and the production bundle pass. The web suite contains 214 passing tests, including multiple-library totals, series/episode separation, unknown sizes, empty catalogs, failed requests and native action dispatch. The server builds without warnings or errors. The isolated instance was checked against the native Items API with three synthetic movies and one synthetic series/episode, including denied anonymous access. Browser verification covers 1920, 1600, 999, 390 and 320 px, scrolling to the original options and opening/cancelling native add, manage and scan dialogs without changing production libraries.

Screenshots are in `docs/screenshots/libraries-dashboard-1920.png`, `libraries-dashboard-390.png` and `libraries-original-options-1920.png`.
