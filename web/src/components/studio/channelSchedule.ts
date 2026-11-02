import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';

export function channelItems(items: BaseItemDto[], seriesOrder = false) {
    return items
        .filter((item) => item.Id && (item.RunTimeTicks || 0) > 0)
        .sort((a, b) => {
            if (seriesOrder) {
                const season = (a.ParentIndexNumber || 0) - (b.ParentIndexNumber || 0);
                const episode = (a.IndexNumber || 0) - (b.IndexNumber || 0);
                if (season || episode) return season || episode;
            }
            return (a.Id || '').localeCompare(b.Id || '');
        });
}

/** UTC schedule derived from a stable item order; never includes unknown durations. */
export function channelSchedule(items: BaseItemDto[], now = Date.now(), seriesOrder = false) {
    const playable = channelItems(items, seriesOrder);
    const total = playable.reduce((sum, item) => sum + item.RunTimeTicks! / 10000, 0);
    if (!total) return [];
    let offset = ((now % total) + total) % total;
    let index = 0;
    while (offset >= playable[index].RunTimeTicks! / 10000) {
        offset -= playable[index].RunTimeTicks! / 10000;
        index++;
    }
    let start = now - offset;
    return Array.from({ length: Math.min(playable.length + 1, 4) }, (_, n) => {
        const item = playable[(index + n) % playable.length];
        const entry = {
            item,
            start,
            end: start + item.RunTimeTicks! / 10000,
            offsetTicks: n === 0 ? Math.floor(offset * 10000) : 0
        };
        start = entry.end;
        return entry;
    });
}

export function parseChannels(value?: string | null): string[] {
    try {
        const result: unknown = JSON.parse(value || '[]');
        return Array.isArray(result) ? result.filter((v): v is string => typeof v === 'string').slice(0, 30) : [];
    } catch {
        return [];
    }
}
