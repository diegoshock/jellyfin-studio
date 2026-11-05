import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import { client, request } from './studioApi';
import { byteSize, recordHealth, storageVolumes, type HealthSample, type RuntimeHealth, type DashboardStorage, type StorageVolume } from './dashboardMetrics';
import StudioMetricChart from './StudioMetricChart';
import './studioDashboard.scss';

type QuerySnapshot<T> = Readonly<{ data?: T; isError: boolean; isPending: boolean }>;
type StreamSession = { NowPlayingItem?: unknown; TranscodingInfo?: unknown; PlayState?: { PlayMethod?: string | null } | null };
type ScanTask = { Key?: string | null; State?: string | null; CurrentProgressPercentage?: number | null };

function scanStatus(tasks: QuerySnapshot<ScanTask[]>) {
    if (tasks.isPending) return 'Consultando…';
    if (tasks.isError) return 'No disponible';
    const scan = tasks.data?.find(task => task.Key === 'RefreshLibrary');
    if (!scan) return 'Sin tarea de escaneo';
    if (scan.State !== 'Running') return 'En espera';
    return scan.CurrentProgressPercentage == null ? 'En curso' : `En curso · ${Math.round(scan.CurrentProgressPercentage)}%`;
}

function accelerationName(value?: string) {
    if (!value) return 'No disponible';
    return value.toLowerCase() === 'none' ? 'CPU' : value.toUpperCase();
}

function storageCaption(volumes: StorageVolume[]) {
    if (!volumes.length) return 'Sin datos de volúmenes';
    if (volumes.every(volume => volume.folder.DeviceId)) {
        return volumes.length === 1 ? '1 volumen identificado' : `${volumes.length} volúmenes identificados`;
    }
    return volumes.length === 1 ? '1 ubicación' : `${volumes.length} ubicaciones`;
}

function DashboardStreams({ sessions, tasks, acceleration }: Readonly<{
    sessions: QuerySnapshot<StreamSession[]>
    tasks: QuerySnapshot<ScanTask[]>
    acceleration?: string
}>) {
    const currentSessions = sessions.data?.filter(session => session.NowPlayingItem) || [];
    const methods = currentSessions.map(session => session.PlayState?.PlayMethod || (session.TranscodingInfo ? 'Transcode' : 'Unknown'));
    const scanLabel = scanStatus(tasks);
    const description = sessions.isError ? 'No disponible' : 'Consultando sesiones…';
    return (
        <article className='studioMonitorCard studioStreamsCard'>
            <div className='studioMonitorCardHeading'><h2>Streams</h2><span>Ahora</span></div>
            <div className='studioMonitorValue small'>{sessions.isError || sessions.isPending ? '—' : currentSessions.length}</div>
            <p className='studioMonitorNote'>{sessions.isError || sessions.isPending ? description : `${methods.filter(method => method === 'Transcode').length} transcodificando · ${methods.filter(method => method === 'DirectPlay').length} direct play · ${methods.filter(method => method === 'DirectStream').length} direct stream`}</p>
            {methods.includes('Unknown') && <p className='studioMonitorNote'>{methods.filter(method => method === 'Unknown').length} sin método informado</p>}
            <div className='studioMonitorStatus'><span>Escaneo</span><strong>{scanLabel}</strong></div>
            <Link to='/dashboard/playback/transcoding' className='studioMonitorNote'>Codificación configurada: {accelerationName(acceleration)}</Link>
        </article>
    );
}

function StorageVolumeCard({ volume }: Readonly<{ volume: StorageVolume }>) {
    const free = volume.folder.FreeSpace;
    const used = volume.folder.UsedSpace;
    const total = (free || 0) + (used || 0);
    const available = free != null && used != null && free >= 0 && used >= 0 && total > 0;
    return (
        <section className='studioStorageVolume'>
            <div className='studioStorageVolumeHeading'><div>{volume.roles.map(role => <span key={role}>{role}</span>)}</div><strong>{available ? byteSize(free) : 'No disponible'}<small>{available ? ` libres de ${byteSize(total)}` : ''}</small></strong></div>
            <p>{volume.paths.join(' · ')}</p>
            {available && <progress max='100' value={used / total * 100} aria-label='Espacio utilizado' />}
            <span className='studioMonitorNote'>{available ? `${Math.round(used / total * 100)}% utilizado` : 'Capacidad no disponible'}</span>
        </section>
    );
}

function DashboardStoragePanel({ storage }: Readonly<{ storage: QuerySnapshot<DashboardStorage> }>) {
    const volumes = storageVolumes(storage.data);
    return (
        <article className='studioMonitorCard studioStorageCard'>
            <div className='studioMonitorCardHeading'><h2>Almacenamiento</h2><span>{storageCaption(volumes)}</span></div>
            <div className='studioStorageVolumes'>
                {volumes.map(volume => <StorageVolumeCard key={volume.key} volume={volume} />)}
            </div>
            {storage.isError && <p role='alert'>No se pudo consultar el almacenamiento.</p>}
            {storage.isPending && <p className='studioMonitorNote'>Consultando almacenamiento…</p>}
        </article>
    );
}

type MetricCardProps = Readonly<{ data?: RuntimeHealth; history: HealthSample[] }>;

function CpuMetricCard({ data, history }: MetricCardProps) {
    return (
        <article className='studioMonitorCard studioCpuCard'>
            <div className='studioMonitorCardHeading'><h2>CPU · Jellyfin</h2><span>{data?.ProcessorCount ? `${data.ProcessorCount} CPU disponibles` : 'Proceso Jellyfin'}</span></div>
            <div className='studioMonitorValue'>{data ? data.CpuPercent.toFixed(1) : '—'}<small>%</small></div>
            <span className='studioChartScale'>100%</span>
            <StudioMetricChart samples={history} fields={['cpu']} maximum={100} label='Historial de CPU del proceso Jellyfin' />
            <div className='studioChartFooter'><span>Últimos 5 min · muestras de esta visita</span><span>Última lectura</span></div>
            <p className='studioMonitorLegend'><i />Proceso Jellyfin</p>
        </article>
    );
}

function NetworkMetricCard({ data, history }: MetricCardProps) {
    const latest = history.at(-1);
    const networkAvailable = data?.NetworkReceivedBytes != null && data?.NetworkSentBytes != null;
    const networkMaximum = Math.max(1, ...history.flatMap(sample => [sample.incoming || 0, sample.outgoing || 0]));
    return (
        <article className='studioMonitorCard studioNetworkCard'>
            <div className='studioMonitorCardHeading'><h2>Red</h2><span>Interfaces visibles por Jellyfin</span></div>
            <div className='studioNetworkValues'>
                <div><span>▼ Entrada</span><strong>{networkAvailable && latest?.incoming != null ? latest.incoming.toFixed(2) : '—'} <small>Mbps</small></strong></div>
                <div><span>▲ Salida</span><strong>{networkAvailable && latest?.outgoing != null ? latest.outgoing.toFixed(2) : '—'} <small>Mbps</small></strong></div>
            </div>
            <StudioMetricChart samples={networkAvailable ? history : []} fields={['incoming', 'outgoing']} maximum={networkMaximum} label='Tráfico de red de entrada y salida' />
            {data && !networkAvailable && <span className='studioMonitorNote'>Red no disponible en este entorno</span>}
        </article>
    );
}

function MemoryMetricCard({ data, history }: MetricCardProps) {
    return (
        <article className='studioMonitorCard studioMemoryCard'>
            <div className='studioMonitorCardHeading'><h2>Memoria · Jellyfin</h2><span>{data?.MemoryLimitBytes ? `${Math.round(data.MemoryUsedBytes / data.MemoryLimitBytes * 100)}%` : '—'}</span></div>
            <div className='studioMonitorValue small'>{data ? byteSize(data.MemoryUsedBytes) : '—'}<small>{data ? ` / ${byteSize(data.MemoryLimitBytes)}` : ''}</small></div>
            <p className='studioMonitorNote'>Proceso / límite disponible</p>
            <StudioMetricChart samples={history} fields={['memory']} maximum={data?.MemoryLimitBytes || Math.max(1, ...history.map(sample => sample.memory))} label='Memoria del proceso Jellyfin' />
        </article>
    );
}

export default function StudioDashboardHealth() {
    const { api, user } = useApi();
    const enabled = !!user?.Policy?.IsAdministrator;
    const [live, setLive] = useState(true);
    const [history, setHistory] = useState<HealthSample[]>([]);
    const previous = useRef<RuntimeHealth>();
    const toggleLive = useCallback(() => setLive(value => !value), []);
    const health = useQuery({
        queryKey: ['StudioDashboardHealth', api?.basePath, user?.Id],
        enabled,
        queryFn: () => request<RuntimeHealth>('Studio/Health'),
        refetchInterval: live ? 5000 : false,
        refetchOnWindowFocus: false,
        retry: false
    });
    const sessions = useQuery({ queryKey: ['StudioSessions', user?.Id], enabled, refetchOnWindowFocus: false, queryFn: () => client().getSessions(), refetchInterval: live ? 5000 : false });
    const tasks = useQuery({ queryKey: ['StudioTasks', user?.Id], enabled, refetchOnWindowFocus: false, queryFn: () => client().getScheduledTasks(), refetchInterval: live ? 5000 : false });
    const storage = useQuery({
        queryKey: ['SystemStorage'], enabled, refetchOnWindowFocus: false,
        queryFn: async ({ signal }) => (await getSystemApi(api!).getSystemStorage({ signal })).data,
        refetchInterval: live ? 30000 : false
    });
    const encoding = useQuery({ queryKey: ['StudioEncoding', user?.Id], enabled, queryFn: () => request<{ HardwareAccelerationType?: string }>('System/Configuration/encoding') });

    useEffect(() => {
        previous.current = undefined;
        setHistory([]);
    }, [api?.basePath, user?.Id]);

    useEffect(() => {
        if (!health.data || health.isError) return;
        const value = health.data;
        const prior = previous.current;
        setHistory(entries => recordHealth(entries, value, prior));
        previous.current = value;
    }, [health.data, health.isError]);

    if (!enabled) return <p>Solo los administradores pueden consultar el Dashboard.</p>;
    const data = health.isError ? undefined : health.data;

    return (
        <section className='studioDashboardMonitor' aria-label='Dashboard de salud'>
            <header className='studioDashboardHeading'>
                <h1>Dashboard</h1>
                <div>
                    <button className={live ? 'studioLiveControl active' : 'studioLiveControl'} onClick={toggleLive} aria-pressed={live} aria-label={live ? 'Pausar actualización' : 'Reanudar actualización'}>{live ? 'Live' : 'Pausado'}</button>
                    <span>{data ? `Actualizado ${new Date(data.SampledAt).toLocaleTimeString()}` : 'Esperando datos'}</span>
                </div>
            </header>
            {health.isError && <p className='studioDashboardWarning' role='alert'>No se pudo actualizar la salud del servidor. Las gráficas conservan únicamente las lecturas recibidas.</p>}
            <div className='studioMonitorGrid'>
                <CpuMetricCard data={data} history={history} />
                <NetworkMetricCard data={data} history={history} />
                <MemoryMetricCard data={data} history={history} />
                <DashboardStreams sessions={sessions} tasks={tasks} acceleration={encoding.data?.HardwareAccelerationType} />
            </div>
            <DashboardStoragePanel storage={storage} />
            <p className='studioDashboardScope'>CPU y memoria del proceso Jellyfin; red de las interfaces visibles. El historial se recopila cada 5 segundos mientras esta vista está activa.</p>
        </section>
    );
}
