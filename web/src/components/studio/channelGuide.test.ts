import { describe, expect, it } from 'vitest';
import { channelGuide, legacyLineup } from './channelSchedule';

describe('Continuous channel guide', () => {
    it('fills a multi-hour window beyond the four preview entries', () => {
        const entries = channelGuide([{ Id: 'a', RunTimeTicks: 6000000000 }, { Id: 'b', RunTimeTicks: 6000000000 }], 120000, 7200000);
        expect(entries.length).toBeGreaterThan(4);
        expect(entries[0].start).toBeLessThanOrEqual(120000);
        expect(entries.at(-1)!.end).toBeGreaterThanOrEqual(7200000);
        for (let index = 1; index < entries.length; index++) expect(entries[index].start).toBe(entries[index - 1].end);
    });
    it('repeats a single film and excludes unknown durations', () => {
        const entries = channelGuide([{ Id: 'a', RunTimeTicks: 36000000000 }, { Id: 'missing' }], 0, 10800000);
        expect(entries).toHaveLength(3);
        expect(entries.every(entry => entry.item.Id === 'a')).toBe(true);
    });
    it('preserves episode order across guide repeats', () => {
        const entries = channelGuide([{ Id: 'a', ParentIndexNumber: 2, IndexNumber: 1, RunTimeTicks: 6000000000 }, { Id: 'b', ParentIndexNumber: 1, IndexNumber: 1, RunTimeTicks: 6000000000 }], 0, 1800000, true);
        expect(entries.map(entry => entry.item.Id)).toEqual(['b', 'a', 'b']);
    });
    it('bounds malformed short media and handles empty windows', () => {
        expect(channelGuide([], 0, 100)).toEqual([]);
        expect(channelGuide([{ Id: 'a', RunTimeTicks: 1 }], 0, 0)).toEqual([]);
        expect(channelGuide([{ Id: 'a', RunTimeTicks: 1 }], 0, 10800000)).toHaveLength(500);
    });
    it('keeps existing genre and series preferences when no shared configuration exists', () => {
        expect(legacyLineup(['Acción', 'series:abc'])).toMatchObject([{ Kind: 'genre', Value: 'Acción', Number: 401, Enabled: true }, { Kind: 'series', Value: 'abc', Number: 402, Enabled: true }]);
    });
});
