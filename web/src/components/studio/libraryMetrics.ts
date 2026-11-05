export interface LibrarySummary {
    ItemId: string
    TitleCount: number
    MovieCount: number
    SeriesCount: number
    EpisodeCount: number
    IndexedBytes: number
    UnknownSizeCount: number
    AddedWeek: number
    AddedToday: number
    AddedDaily: number[]
    IdentifiedCount: number
}

export interface LibrarySnapshot {
    SampledAt: string
    Libraries: LibrarySummary[]
}

export function libraryTotals(libraries: LibrarySummary[]) {
    return libraries.reduce((total, library) => ({
        titles: total.titles + library.TitleCount,
        movies: total.movies + library.MovieCount,
        series: total.series + library.SeriesCount,
        episodes: total.episodes + library.EpisodeCount,
        bytes: total.bytes + library.IndexedBytes,
        unknown: total.unknown + library.UnknownSizeCount,
        week: total.week + library.AddedWeek,
        today: total.today + library.AddedToday,
        identified: total.identified + library.IdentifiedCount,
        daily: total.daily.map((value, index) => value + (library.AddedDaily[index] || 0))
    }), { titles: 0, movies: 0, series: 0, episodes: 0, bytes: 0, unknown: 0, week: 0, today: 0, identified: 0, daily: Array<number>(7).fill(0) });
}

export function identificationPercent(identified: number, titles: number) {
    return titles > 0 ? `${Math.round(identified / titles * 100)}%` : '—';
}
