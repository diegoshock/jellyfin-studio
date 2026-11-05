import type { VirtualFolderInfo } from '@jellyfin/sdk/lib/generated-client/models/virtual-folder-info';
import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback } from 'react';

import { useApi } from 'hooks/useApi';
import RefreshDialog from 'components/refreshdialog/refreshdialog';
import { ServerConnections } from 'lib/jellyfin-apiclient';
import { request } from './studioApi';
import { byteSize, storageVolumes, type DashboardStorage } from './dashboardMetrics';
import { identificationPercent, libraryTotals, type LibrarySnapshot, type LibrarySummary } from './libraryMetrics';
import './studioLibraries.scss';

const colors = ['#327ee6', '#e45e13', '#a08aff', '#24c7b8', '#d34977', '#d3ae38'];

function libraryStatus(folder: VirtualFolderInfo, row?: LibrarySummary) {
    if (folder.RefreshStatus === 'InProgress') return 'Escaneando…';
    if (!row) return 'Sin datos';
    if (!row.TitleCount) return 'Sin títulos';
    if (row.IdentifiedCount < row.TitleCount) return `${row.TitleCount - row.IdentifiedCount} sin identificar`;
    return 'Con identificación externa';
}

function indexedSize(bytes: number, unknown: number) {
    return `${unknown ? '≥ ' : ''}${byteSize(bytes)}`;
}

function libraryDescription(totals: ReturnType<typeof libraryTotals>) {
    return `${totals.titles} títulos · ${indexedSize(totals.bytes, totals.unknown)} registrados`;
}

function LibraryRow({ folder, summary: row, color, onManage }: Readonly<{ folder: VirtualFolderInfo; summary?: LibrarySummary; color: string; onManage: (folder: VirtualFolderInfo) => void }>) {
    const scan = useCallback(() => {
        void new RefreshDialog({ itemIds: [folder.ItemId], serverId: ServerConnections.currentApiClient()?.serverId(), mode: 'scan' }).show();
    }, [folder]);
    const manage = useCallback(() => onManage(folder), [folder, onManage]);
    const size = row ? indexedSize(row.IndexedBytes, row.UnknownSizeCount) : '—';
    return <tr>
        <td><div className='studioLibraryName'><span className='studioLibraryIcon' style={{ color }} aria-hidden='true'>{folder.CollectionType === 'tvshows' ? '▣' : '▤'}</span><div><strong>{folder.Name}</strong><small>{folder.Locations?.join(' · ') || 'Sin rutas configuradas'}</small></div></div></td>
        <td>{row ? `${row.TitleCount} títulos` : '—'}{row && row.EpisodeCount > 0 && <small>{row.EpisodeCount} episodios</small>}</td>
        <td>{size}{row && row.UnknownSizeCount > 0 && <small>Tamaño parcial</small>}</td>
        <td><span className={folder.RefreshStatus === 'InProgress' ? 'studioLibraryWarning' : ''}>{libraryStatus(folder, row)}</span></td>
        <td><div className='studioLibraryActions'><button type='button' disabled={!folder.ItemId || folder.RefreshStatus === 'InProgress'} onClick={scan} aria-label={`Escanear ${folder.Name}`}>⟳ Escanear</button><button type='button' onClick={manage} aria-label={`Gestionar ${folder.Name}`}>Gestionar</button></div></td>
    </tr>;
}

function scrollToOptions(event: React.MouseEvent) {
    event.preventDefault();
    document.getElementById('studioLibraryOptions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function LibraryMetrics({ totals, available, capacitiesKnown, free, capacity, pending, sampledAt }: Readonly<{
    totals: ReturnType<typeof libraryTotals>; available: boolean; capacitiesKnown: boolean; free: number; capacity: number; pending: boolean; sampledAt?: string
}>) {
    const maxDaily = Math.max(1, ...totals.daily);
    const diskSize = available ? indexedSize(totals.bytes, totals.unknown) : '—';
    return (
        <div className='studioLibraryMetrics' aria-busy={pending}>
            <article><h2>Títulos</h2><strong>{available ? totals.titles : '—'}</strong><p>{available ? `${totals.movies} películas · ${totals.series} series · ${totals.episodes} episodios` : 'Sin datos'}</p></article>
            <article><h2>En disco</h2><strong>{diskSize}</strong><p>{capacitiesKnown ? `${byteSize(free)} libres de ${byteSize(capacity)}` : 'Capacidad del volumen no disponible'}</p>{capacitiesKnown && capacity > 0 && <progress aria-label='Uso de los volúmenes de bibliotecas' value={capacity - free} max={capacity} />}{totals.unknown > 0 && <p>{totals.unknown} archivos sin tamaño registrado</p>}</article>
            <article><h2>Añadidos en 7 días</h2><strong>{available ? totals.week : '—'}</strong><p>{available ? `${totals.today} hoy · UTC` : 'Sin datos'}</p><div className='studioLibraryDaily' aria-label='Altas por día, últimos 7 días UTC'>{available && totals.daily.map((value, index) => <span key={`day-${sampledAt}-${6 - index}`} style={{ height: `${Math.max(4, value / maxDaily * 100)}%` }} title={`${value} títulos`} />)}</div></article>
            <article><h2>Identificados</h2><strong>{available ? identificationPercent(totals.identified, totals.titles) : '—'}</strong><p className={available && totals.titles > totals.identified ? 'studioLibraryWarning' : ''}>{available ? `${totals.titles - totals.identified} sin identificación externa` : 'Sin datos'}</p></article>
        </div>
    );
}

export default function StudioLibrariesDashboard({ folders, onAdd, onManage }: Readonly<{
    folders: VirtualFolderInfo[]
    onAdd: () => void
    onManage: (folder: VirtualFolderInfo) => void
}>) {
    const { api, user } = useApi();
    const summary = useQuery({
        queryKey: ['StudioLibrarySummary', api?.basePath, user?.Id, folders.map(folder => `${folder.ItemId}:${folder.Name}:${folder.Locations?.join(';')}`).join('|')],
        queryFn: () => request<LibrarySnapshot>('Studio/Libraries'),
        enabled: !!api && !!user?.Policy?.IsAdministrator,
        refetchInterval: 60000,
        refetchIntervalInBackground: false
    });
    const storage = useQuery({
        queryKey: ['SystemStorage'],
        queryFn: async ({ signal }) => (await getSystemApi(api!).getSystemStorage({ signal })).data as DashboardStorage,
        enabled: !!api && !!user?.Policy?.IsAdministrator
    });
    const rows = folders.map(folder => ({ folder, summary: summary.data?.Libraries.find(library => library.ItemId === folder.ItemId) }));
    const totals = libraryTotals(rows.flatMap(row => row.summary ? [row.summary] : []));
    const available = !!summary.data && rows.every(row => row.summary);
    const volumes = storageVolumes({ Libraries: storage.data?.Libraries });
    const capacitiesKnown = volumes.length > 0 && volumes.every(volume => volume.folder.DeviceId && volume.folder.FreeSpace != null && volume.folder.UsedSpace != null);
    const free = volumes.reduce((value, volume) => value + (volume.folder.FreeSpace || 0), 0);
    const capacity = volumes.reduce((value, volume) => value + (volume.folder.FreeSpace || 0) + (volume.folder.UsedSpace || 0), 0);
    const status = summary.isError ? 'Resumen no disponible' : 'Consultando catálogo…';
    const description = available ? libraryDescription(totals) : status;
    return (
        <section className='studioLibrariesOverview' aria-label='Resumen de bibliotecas'>
            <header className='studioLibrariesHeader'>
                <div><h1>Bibliotecas</h1><p>{folders.length} bibliotecas · {description}</p></div>
                <button type='button' className='studioLibraryAdd' onClick={onAdd}>＋ Añadir biblioteca</button>
            </header>
            {summary.isError && <p role='alert'>No se pudo cargar el resumen. Las opciones de biblioteca siguen disponibles más abajo.</p>}
            <LibraryMetrics totals={totals} available={available} capacitiesKnown={capacitiesKnown} free={free} capacity={capacity} pending={summary.isPending} sampledAt={summary.data?.SampledAt} />
            <div className='studioLibraryDistribution'>
                <div className='studioLibraryBar' aria-label='Distribución de títulos por biblioteca'>{available && totals.titles > 0 && rows.map(({ folder, summary: row }, index) => row && row.TitleCount > 0 && <span key={folder.ItemId} title={`${folder.Name}: ${row.TitleCount}`} style={{ width: `${row.TitleCount / totals.titles * 100}%`, background: colors[index % colors.length] }} />)}</div>
                <div className='studioLibraryLegend'>{rows.map(({ folder, summary: row }, index) => <span key={folder.ItemId}><i style={{ background: colors[index % colors.length] }} />{folder.Name} {row && available && totals.titles > 0 ? `${Math.round(row.TitleCount / totals.titles * 100)}%` : '—'}</span>)}</div>
            </div>
            <div className='studioLibraryTableWrap'>
                <table className='studioLibraryTable'>
                    <thead><tr><th>Biblioteca</th><th>Títulos</th><th>Almacenamiento</th><th>Estado</th><th><span className='studioLibrarySrOnly'>Acciones</span></th></tr></thead>
                    <tbody>{rows.map(({ folder, summary: row }, index) => <LibraryRow key={folder.ItemId} folder={folder} summary={row} color={colors[index % colors.length]} onManage={onManage} />)}</tbody>
                </table>
                {folders.length === 0 && <p className='studioLibraryEmpty'>Aún no hay bibliotecas. Añade una para empezar.</p>}
            </div>
            <p className='studioLibraryFootnote'>Tamaños del catálogo, sin imágenes ni caché. La identificación indica un ID de proveedor, no valida la calidad de los metadatos. Actualización cada minuto.</p>
            <a className='studioLibraryOptionsLink' href='#studioLibraryOptions' onClick={scrollToOptions}>Opciones de bibliotecas ↓</a>
        </section>
    );
}
