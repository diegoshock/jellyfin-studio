import { describe, expect, it } from 'vitest';
import { identificationPercent, libraryTotals, type LibrarySummary } from './libraryMetrics';

const movieLibrary: LibrarySummary = { ItemId: 'movies', TitleCount: 3, MovieCount: 3, SeriesCount: 0, EpisodeCount: 0, IndexedBytes: 100, UnknownSizeCount: 1, AddedWeek: 2, AddedToday: 1, AddedDaily: [0, 0, 0, 0, 0, 1, 1], IdentifiedCount: 2 };

describe('Library catalog totals', () => {
    it('keeps series titles separate from episodes and sums partial sizes and daily additions', () => {
        const totals = libraryTotals([movieLibrary, { ...movieLibrary, ItemId: 'shows', TitleCount: 2, MovieCount: 0, SeriesCount: 2, EpisodeCount: 50, IndexedBytes: 200, UnknownSizeCount: 0, AddedDaily: [1, 0, 0, 0, 0, 0, 1] }]);
        expect(totals).toMatchObject({ titles: 5, movies: 3, series: 2, episodes: 50, bytes: 300, unknown: 1, daily: [1, 0, 0, 0, 0, 1, 2] });
        expect(identificationPercent(totals.identified, totals.titles)).toBe('80%');
    });

    it('does not invent a matching percentage for an empty library', () => {
        expect(libraryTotals([])).toMatchObject({ titles: 0, bytes: 0, daily: [0, 0, 0, 0, 0, 0, 0] });
        expect(identificationPercent(0, 0)).toBe('—');
    });
});
