import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Link } from 'react-router-dom';
import { useApi } from 'hooks/useApi';
import { client, request } from './studioApi';
import './studioPages.scss';

type Health = { CpuPercent: number; MemoryUsedBytes: number; MemoryLimitBytes: number };
function bytes(n?: number) {
    return n === undefined ? 'No disponible' : `${(n / 1073741824).toFixed(1)} GB`;
}

export default function StudioHealth() {
    const { user } = useApi();
    const enabled = !!user?.Policy?.IsAdministrator;
    const health = useQuery({
        queryKey: ['StudioHealth', user?.Id],
        enabled,
        queryFn: () => request<Health>('Studio/Health'),
        refetchInterval: 5000,
        retry: false
    });
    const sessions = useQuery({
        queryKey: ['StudioSessions', user?.Id],
        enabled,
        queryFn: () => client().getSessions(),
        refetchInterval: 5000
    });
    const tasks = useQuery({
        queryKey: ['StudioTasks', user?.Id],
        enabled,
        queryFn: () => client().getScheduledTasks(),
        refetchInterval: 5000
    });
    const storage = useQuery({
        queryKey: ['StudioStorage', user?.Id],
        enabled,
        queryFn: () =>
            request<{
                ProgramDataFolder?: { FreeSpace?: number; UsedSpace?: number };
                Libraries?: { Name?: string; Folders?: { Path?: string; FreeSpace?: number }[] }[];
            }>('System/Info/Storage'),
        refetchInterval: 30000
    });
    const encoding = useQuery({
        queryKey: ['StudioEncoding', user?.Id],
        enabled,
        queryFn: () => request<{ HardwareAccelerationType?: string }>('System/Configuration/encoding')
    });
    const running = sessions.data?.filter((s) => s.NowPlayingItem) || [];
    const scan = tasks.data?.find((t) => t.Key === 'RefreshLibrary');
    let scanStatus = 'En espera';
    if (scan?.State === 'Running') scanStatus = `${Math.round(scan.CurrentProgressPercentage || 0)}%`;
    if (tasks.isError) scanStatus = 'No disponible';
    if (!enabled) return <p>Solo los administradores pueden consultar la salud del servidor.</p>;
    return (
        <section className='studioPanel studioHealth'>
            <p className='studioEyebrow'>TU SERVIDOR · EN VIVO</p>
            <h1>Todo bajo control</h1>
            <p className='studioMuted'>
                Actualización cada 5 segundos. CPU y memoria corresponden al proceso Jellyfin; el límite de memoria
                depende del entorno del servidor.
            </p>
            <div className='studioMetric'>
                <span>CPU · Jellyfin</span>
                <progress max='100' value={health.data?.CpuPercent || 0} />
                <strong>{health.data ? `${health.data.CpuPercent}%` : 'No disponible'}</strong>
            </div>
            <div className='studioMetric'>
                <span>Aceleración</span>
                <span />
                <strong>
                    {encoding.data?.HardwareAccelerationType
                        || (encoding.isPending ? 'Consultando…' : 'Procesador / sin configurar')}
                </strong>
            </div>
            <div className='studioMetric'>
                <span>Memoria · Jellyfin</span>
                <progress max={health.data?.MemoryLimitBytes || 1} value={health.data?.MemoryUsedBytes || 0} />
                <strong>
                    {health.data ?
                        `${bytes(health.data.MemoryUsedBytes)} de ${bytes(health.data.MemoryLimitBytes)}` :
                        'No disponible'}
                </strong>
            </div>
            <div className='studioMetric'>
                <span>Almacenamiento</span>
                <span />
                <strong>
                    {storage.data?.ProgramDataFolder ?
                        `${bytes(storage.data.ProgramDataFolder.FreeSpace)} libres · datos` :
                        'No disponible'}
                </strong>
            </div>
            <div className='studioMetric'>
                <span>Reproducciones</span>
                <span />
                <strong>{sessions.isError ? 'No disponible' : `${running.length} activas`}</strong>
            </div>
            <div className='studioMetric'>
                <span>Escaneo</span>
                <progress max='100' value={scan?.State === 'Running' ? scan.CurrentProgressPercentage || 0 : 0} />
                <strong>{scanStatus}</strong>
            </div>
            {storage.data?.Libraries?.flatMap(
                (library) =>
                    library.Folders?.map((folder) => (
                        <div className='studioMetric' key={`${library.Name}-${folder.Path}`}>
                            <span>{library.Name}</span>
                            <span className='studioStoragePath'>{folder.Path}</span>
                            <strong>{bytes(folder.FreeSpace)} libres</strong>
                        </div>
                    )) || []
            )}
            {health.isError && (
                <p className='studioMuted'>
                    Las métricas del proceso requieren el servidor Jellyfin Studio actualizado.
                </p>
            )}
            {running.map((s) => (
                <p key={s.Id}>
                    {s.UserName} · {s.NowPlayingItem?.Name} ·{' '}
                    {s.TranscodingInfo ? 'Transcodificando' : 'Reproducción directa'}
                </p>
            ))}
            <p className='studioMuted'>La aceleración muestra la configuración, no la utilización de GPU.</p>
            <Link to='/dashboard/playback/transcoding'>Configurar transcodificación ↗</Link>
        </section>
    );
}
