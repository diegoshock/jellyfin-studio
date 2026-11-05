export interface RuntimeHealth {
    CpuPercent: number
    MemoryUsedBytes: number
    MemoryLimitBytes: number
    ProcessorCount?: number
    SampledAt: string
    NetworkReceivedBytes?: number | null
    NetworkSentBytes?: number | null
}

export interface HealthSample {
    time: number
    cpu: number
    memory: number
    incoming?: number
    outgoing?: number
}

export interface StorageFolder {
    Path?: string | null
    ResolvedPath?: string | null
    DeviceId?: string | null
    FreeSpace?: number | null
    UsedSpace?: number | null
}

export interface DashboardStorage {
    ProgramDataFolder?: StorageFolder | null
    CacheFolder?: StorageFolder | null
    TranscodingTempFolder?: StorageFolder | null
    Libraries?: { Name?: string | null; Folders?: StorageFolder[] | null }[] | null
}

export interface StorageVolume {
    key: string
    folder: StorageFolder
    roles: string[]
    paths: string[]
}

export function byteSize(value?: number | null) {
    if (value == null || !Number.isFinite(value) || value < 0) return 'No disponible';
    if (value >= 1099511627776) return `${(value / 1099511627776).toFixed(1)} TB`;
    if (value >= 1073741824) return `${(value / 1073741824).toFixed(1)} GB`;
    return `${(value / 1048576).toFixed(0)} MB`;
}

export function networkRate(current?: number | null, previous?: number | null, seconds = 0) {
    if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous) || !Number.isFinite(seconds) || seconds <= 0 || current < previous) return undefined;
    return (current - previous) * 8 / seconds / 1000000;
}

export function recordHealth(history: HealthSample[], value: RuntimeHealth, previous?: RuntimeHealth): HealthSample[] {
    const time = Date.parse(value.SampledAt);
    const last = history.at(-1);
    if (!Number.isFinite(time) || (last && last.time >= time)) return history;
    const seconds = previous ? (time - Date.parse(previous.SampledAt)) / 1000 : 0;
    const sample = {
        time,
        cpu: value.CpuPercent,
        memory: value.MemoryUsedBytes,
        incoming: networkRate(value.NetworkReceivedBytes, previous?.NetworkReceivedBytes, seconds),
        outgoing: networkRate(value.NetworkSentBytes, previous?.NetworkSentBytes, seconds)
    };
    return [...history.filter(entry => entry.time >= time - 300000), sample].slice(-61);
}

export function storageVolumes(storage?: DashboardStorage) {
    const groups = new Map<string, StorageVolume>();
    const add = (folder: StorageFolder | null | undefined, role: string) => {
        if (!folder) return;
        const path = folder.Path || folder.ResolvedPath;
        const key = folder.DeviceId || folder.ResolvedPath || path;
        if (!key) return;
        const volume = groups.get(key) || { key, folder, roles: [], paths: [] };
        if (!volume.roles.includes(role)) volume.roles.push(role);
        if (path && !volume.paths.includes(path)) volume.paths.push(path);
        groups.set(key, volume);
    };
    add(storage?.ProgramDataFolder, 'Datos');
    add(storage?.CacheFolder, 'Caché');
    add(storage?.TranscodingTempFolder, 'Transcodificación');
    for (const library of storage?.Libraries || []) {
        for (const folder of library.Folders || []) add(folder, library.Name || 'Biblioteca');
    }
    return [...groups.values()];
}
