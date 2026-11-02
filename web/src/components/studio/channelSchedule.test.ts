import { describe, expect, it } from 'vitest';
import { channelSchedule, parseChannels } from './channelSchedule';

const films = [
    { Id: 'b', Name: 'Second', RunTimeTicks: 200000000 },
    { Id: 'a', Name: 'First', RunTimeTicks: 100000000 }
];

describe('genre channel schedule', () => {
    it('uses the same UTC position regardless of library response order', () => {
        expect(channelSchedule(films, 15000)).toEqual(channelSchedule([...films].reverse(), 15000));
        expect(channelSchedule(films, 15000)[0]).toMatchObject({
            item: { Id: 'b' },
            offsetTicks: 50000000,
            start: 10000,
            end: 30000
        });
    });
    it('moves to the next title exactly at the boundary and wraps the cycle', () => {
        expect(channelSchedule(films, 9999)[0].item.Id).toBe('a');
        expect(channelSchedule(films, 10000)[0].item.Id).toBe('b');
        expect(channelSchedule(films, 30000)[0]).toMatchObject({ item: { Id: 'a' }, offsetTicks: 0 });
    });
    it('ignores missing, zero and negative durations without inventing programming', () => {
        expect(channelSchedule([{ Id: 'x' }, { Id: 'y', RunTimeTicks: 0 }, { Id: 'z', RunTimeTicks: -1 }])).toEqual([]);
    });
    it('orders marathons by season and episode rather than by file ID', () => {
        const episodes = [
            { Id: 'a', ParentIndexNumber: 2, IndexNumber: 1, RunTimeTicks: 100000000 },
            { Id: 'z', ParentIndexNumber: 1, IndexNumber: 1, RunTimeTicks: 100000000 },
            { Id: 'b', ParentIndexNumber: 1, IndexNumber: 2, RunTimeTicks: 100000000 }
        ];
        expect(channelSchedule(episodes, 0, true).map((entry) => entry.item.Id)).toEqual(['z', 'b', 'a', 'z']);
    });
    it('returns a valid repeated guide for a one-movie channel', () => {
        const guide = channelSchedule([films[0]], 25000);
        expect(guide).toHaveLength(2);
        expect(guide[0].end).toBe(guide[1].start);
    });
});

describe('saved channel preferences', () => {
    it('rejects malformed or incompatible server values', () => {
        for (const value of [undefined, null, '', 'invalid', '{}', 'null']) expect(parseChannels(value)).toEqual([]);
        expect(parseChannels('["Acción",null,42,"Comedia"]')).toEqual(['Acción', 'Comedia']);
    });
    it('bounds the number of saved channels', () => {
        expect(parseChannels(JSON.stringify(Array(100).fill('Drama')))).toHaveLength(30);
    });
});
