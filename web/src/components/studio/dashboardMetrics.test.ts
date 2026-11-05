import { describe, expect, it } from 'vitest';
import { byteSize, networkRate, recordHealth, storageVolumes, type HealthSample, type RuntimeHealth } from './dashboardMetrics';

const first: RuntimeHealth = { CpuPercent: 4, MemoryUsedBytes: 100, MemoryLimitBytes: 1000, SampledAt: '2026-11-05T12:00:00Z', NetworkReceivedBytes: 1000, NetworkSentBytes: 2000 };

describe('Actual dashboard measurements', () => {
    it('waits for two counters and computes Mbps from actual elapsed time', () => {
        expect(networkRate(1251000, 1000, 5)).toBe(2);
        expect(networkRate(1000, undefined, 5)).toBeUndefined();
        expect(networkRate(1000, 2000, 5)).toBeUndefined();
        expect(networkRate(1000, 1000, 0)).toBeUndefined();
        expect(networkRate(NaN, 1000, 5)).toBeUndefined();
        expect(networkRate(2000, 1000, NaN)).toBeUndefined();
    });

    it('does not invent history or network zeroes for the first reading', () => {
        const history = recordHealth([], first);
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({ cpu: 4, memory: 100 });
        expect(history[0].incoming).toBeUndefined();
        const next = { ...first, SampledAt: '2026-11-05T12:00:05Z', NetworkReceivedBytes: 1251000 };
        const updated = recordHealth(history, next, first);
        expect(updated[1].incoming).toBe(2);
        expect(updated[1].outgoing).toBe(0);
        expect(recordHealth(updated, next, first)).toBe(updated);
    });

    it('bounds history to five minutes and ignores stale or invalid timestamps', () => {
        let history: HealthSample[] = [];
        for (let index = 0; index < 100; index++) {
            history = recordHealth(history, { ...first, SampledAt: new Date(Date.parse(first.SampledAt) + index * 5000).toISOString() });
        }
        expect(history).toHaveLength(61);
        expect(history.at(-1)!.time - history[0].time).toBe(300000);
        expect(recordHealth(history, { ...first, SampledAt: 'invalid' })).toBe(history);
        expect(recordHealth(history, first)).toBe(history);
    });

    it('does not double count a disk used by data, cache and libraries', () => {
        const folder = { DeviceId: 'disk-one', FreeSpace: 900, UsedSpace: 100 };
        const volumes = storageVolumes({ ProgramDataFolder: { ...folder, Path: '/config' }, CacheFolder: { ...folder, Path: '/cache' }, Libraries: [{ Name: 'Películas', Folders: [{ ...folder, Path: '/media' }] }] });
        expect(volumes).toHaveLength(1);
        expect(volumes[0].roles).toEqual(['Datos', 'Caché', 'Películas']);
        expect(volumes[0].folder.UsedSpace).toBe(100);
        expect(volumes[0].paths).toEqual(['/config', '/cache', '/media']);
    });

    it('does not guess disk identity from equal capacities or display missing values as zero', () => {
        expect(storageVolumes({ ProgramDataFolder: { Path: '/a', FreeSpace: 100 }, CacheFolder: { Path: '/b', FreeSpace: 100 } })).toHaveLength(2);
        expect(storageVolumes()).toEqual([]);
        expect(byteSize()).toBe('No disponible');
        expect(byteSize(-1)).toBe('No disponible');
        expect(byteSize(0)).toBe('0 MB');
        expect(byteSize(1073741824)).toBe('1.0 GB');
    });
});
