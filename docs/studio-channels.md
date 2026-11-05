# Studio Channels

The Studio viewer at `/studio/live` uses a Tofa-inspired full-width programme header and a horizontal electronic programme guide. The former switches and setup list have moved to the administrator page `/dashboard/channels`, linked from the settings drawer and settings search.

## Configuration

The administrator page provides Overview, Channels, Sources, Guide, Recordings, Categories and Settings sections. Channel forms expose a name, unique number, category, enabled switch and either a movie genre with an optional source library, or a selected series. Series can be searched by name. Changes are drafts until Save Changes succeeds; failed saves retain the form. Removing a channel only changes the draft lineup, never the media library.

`GET /Studio/Channels` requires authentication. `POST /Studio/Channels` requires administrator elevation and validates unique channel IDs/numbers, bounded names, valid kinds, valid series/library IDs, 1–6 guide hours and a maximum of 100 channels. The named configuration factory persists the lineup as `studiochannels.xml` in the Jellyfin configuration directory, retained by the existing Unraid configuration volume. The initial configuration leaves existing personal genre/marathon preferences usable until an administrator explicitly saves a shared lineup. An empty saved lineup stays empty.

Channels use the existing indexed media and native player, not a separate streaming server. They require known positive runtimes. The schedule derives from stable catalog order and an absolute clock; a series uses season and episode order. Tuning recalculates the current programme and offset immediately before playback, queues the remaining titles and sets Repeat All. Changes to available titles/durations can change the derived schedule. Future programme selection previews its details and offers playback from the beginning.

## Guide and access

The guide supports channel/programme search, category filters, personal pinned category tabs, previous/next half-hour navigation and Now. Time labels use the device locale and timezone. The guide is bounded to 500 programme cells per channel to handle malformed very short runtimes without hanging the page. On mobile the timeline scrolls inside its own container.

Catalog requests always use the current user ID. Before querying a configured library directly, the client verifies the user's explicit library policy and, when needed, their Views (including accounts with grouped library views). Before querying a series' episodes, it verifies the series against the user's accessible root series catalog, rather than relying on a direct ParentId lookup alone. Pending or failed visibility checks never query the direct source. Visibility IDs are included in the catalog cache key.

The overview's Watching Now section displays actual Jellyfin playback sessions with an explicit note that Jellyfin does not identify whether they originated from Channels. Guide availability is computed from playable catalog results. Sources link to the real library and native Live TV settings. Recordings show the existing Jellyfin DVR catalog and link to native recording management; library channels do not create recordings or claim to have a separate DVR/EPG service.

## Verification

Server compilation passes with no errors or warnings. Web type checking, lint, styles and production compilation pass. The web suite has 232 passing tests. Unit coverage includes continuous multi-hour guides, repeated single-title channels, episode order, invalid durations, legacy preferences, search, tuning dispatch, global disable and source visibility checks. Isolated API checks cover persistent save/read, restart persistence, seven invalid payloads and administrator-only writes. Browser checks cover adding/saving/reloading/removing a channel, both screens at 1920/1600/999/390/320 px without page overflow, native playback at the current broadcast offset and restricted-user source checks. Test media are isolated synthetic indexed movies and episodes, including full-duration 90-minute and 45-minute files; no production libraries were changed.

Screenshots: `docs/screenshots/channels-guide-1920.png`, `channels-guide-390.png`, `channels-settings-1920.png`, `channels-settings-390.png`.
