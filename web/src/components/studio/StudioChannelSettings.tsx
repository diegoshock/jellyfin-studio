/* eslint-disable react/jsx-no-bind -- The channel editor uses controlled fields with row-local values. */
import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import Page from 'components/Page';
import { useApi } from 'hooks/useApi';
import { useVirtualFolders } from 'apps/dashboard/features/libraries/api/useVirtualFolders';
import { channelSchedule } from './channelSchedule';
import { channelTime, useChannelCatalog, useChannelConfig, useChannelGenres, type ChannelConfig, type StudioChannel } from './channelData';
import { client, request } from './studioApi';
import './studioChannels.scss';

const tabs = ['Resumen', 'Canales', 'Fuentes', 'Guía', 'Grabaciones', 'Categorías', 'Ajustes'];
function ChannelEditor({ channel, genres, series, folders, onChange, onRemove }: Readonly<{ channel: StudioChannel;
    genres: BaseItemDto[];
    series: BaseItemDto[];
    folders: { ItemId?: string | null;
        Name?: string | null }[];
    onChange: (channel: StudioChannel) => void;
    onRemove: () => void }>) {
    return <article className='studioLiveConfigCard studioChannelEditor'>
        <div className='studioChannelEditorFields'>
            <label>Número<input type='number' min='1' max='9999' value={channel.Number} onChange={event => onChange({ ...channel, Number: Number(event.target.value) })} /></label>
            <label>Nombre<input value={channel.Name} maxLength={100} onChange={event => onChange({ ...channel, Name: event.target.value })} /></label>
            <label>Tipo<select aria-label='Tipo de canal' value={channel.Kind} onChange={event => onChange({ ...channel, Kind: event.target.value as StudioChannel['Kind'], Value: '', LibraryId: '' })}><option value='genre'>Películas por género</option><option value='series'>Maratón de una serie</option></select></label>
            <label>{channel.Kind === 'genre' ? 'Género' : 'Serie'}<select aria-label={channel.Kind === 'genre' ? 'Género' : 'Serie'} value={channel.Value} onChange={event => onChange({ ...channel, Value: event.target.value })}><option value=''>Selecciona un origen</option>{channel.Value && !(channel.Kind === 'genre' ? genres : series).some(item => (channel.Kind === 'genre' ? item.Name : item.Id) === channel.Value) && <option value={channel.Value}>{channel.Value}</option>}{(channel.Kind === 'genre' ? genres : series).map(item => <option key={item.Id || item.Name} value={channel.Kind === 'genre' ? item.Name || '' : item.Id || ''}>{item.Name}</option>)}</select></label>
            {channel.Kind === 'genre' && <label>Biblioteca de origen<select aria-label='Biblioteca de origen' value={channel.LibraryId} onChange={event => onChange({ ...channel, LibraryId: event.target.value })}><option value=''>Todas las bibliotecas accesibles</option>{folders.map(folder => <option key={folder.ItemId} value={folder.ItemId || ''}>{folder.Name}</option>)}</select></label>}
            <label>Categoría<input value={channel.Category} maxLength={100} onChange={event => onChange({ ...channel, Category: event.target.value })} /></label>
        </div>
        <footer><label><input type='checkbox' checked={channel.Enabled} onChange={event => onChange({ ...channel, Enabled: event.target.checked })} /> Canal activo</label><button type='button' onClick={onRemove}>Quitar canal</button></footer>
    </article>;
}
export default function StudioChannelSettings() {
    const { api, user } = useApi();
    const config = useChannelConfig();
    const genres = useChannelGenres();
    const { data: folders = [] } = useVirtualFolders();
    const cache = useQueryClient();
    const [draft, setDraft] = useState<ChannelConfig>();
    const [tab, setTab] = useState('Resumen');
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [seriesSearch, setSeriesSearch] = useState('');
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!draft && config.data && !config.isPending) setDraft({ ...config.data, Channels: config.lineup });
    }, [draft, config.data, config.isPending, config.lineup]);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 15000);
        return () => window.clearInterval(timer);
    }, []);
    const series = useQuery({ queryKey: ['StudioConfigSeries', user?.Id, seriesSearch], queryFn: () => client().getItems(user!.Id!, { Recursive: true, IncludeItemTypes: 'Series', SortBy: 'SortName', SearchTerm: seriesSearch || undefined, Limit: 100 }), enabled: !!user?.Id && tab === 'Canales' });
    const sessions = useQuery({ queryKey: ['StudioChannelSessions', api?.basePath], queryFn: () => request<{ Id: string;
        UserName?: string;
        NowPlayingItem?: BaseItemDto }[]>('Sessions'), enabled: tab === 'Resumen' && !!user?.Policy?.IsAdministrator, refetchInterval: 15000 });
    const recordings = useQuery({ queryKey: ['StudioChannelRecordings', user?.Id], queryFn: () => request<{ Items?: BaseItemDto[];
        TotalRecordCount?: number }>(`LiveTv/Recordings?UserId=${user?.Id}`), enabled: tab === 'Grabaciones' && !!user?.Id });
    const channels = draft?.Channels || [];
    const catalog = useChannelCatalog(channels);
    const ready = channels.filter((channel, index) => channel.Enabled && !!catalog[index]?.data?.length);
    const attention = channels.filter((channel, index) => channel.Enabled && (catalog[index]?.isError || (catalog[index]?.isSuccess && !catalog[index]?.data?.length)));
    const suggestions = (genres.data?.Items || []).filter(genre => genre.Name && !channels.some(channel => channel.Kind === 'genre' && channel.Value === genre.Name));
    const categories = [...new Set(channels.map(channel => channel.Category || (channel.Kind === 'series' ? 'Series' : 'Películas')))];
    function change(next: ChannelConfig) {
        setDraft(next);
        setDirty(true);
        setMessage('');
        setError('');
    }
    function update(channel: StudioChannel) {
        if (draft) change({ ...draft, Channels: channels.map(value => value.Id === channel.Id ? channel : value) });
    }
    function add(genre = '') {
        if (!draft || channels.length >= 100) return;
        const number = Math.max(400, ...channels.map(channel => channel.Number)) + 1;
        change({ ...draft, Channels: [...channels, { Id: `channel-${Date.now().toString(36)}-${number}`, Name: genre || 'Nuevo canal', Number: number, Kind: 'genre', Value: genre, LibraryId: '', Category: genre || 'Películas', Enabled: true }] });
        setTab('Canales');
    }
    async function save() {
        if (!draft) return;
        setBusy(true);
        setError('');
        try {
            await request('Studio/Channels', 'POST', draft);
            setDraft({ ...draft, Configured: true });
            setDirty(false);
            setMessage('Configuración guardada');
            await cache.invalidateQueries({ queryKey: ['StudioChannelConfig'] });
        } catch {
            setError('No se pudo guardar. Revisa que cada canal tenga nombre, origen y un número único entre 1 y 9999.');
        } finally {
            setBusy(false);
        }
    }
    function tabBadge(name: string) {
        if (name === 'Canales') return String(channels.length);
        if (name === 'Guía') {
            const enabled = channels.filter(channel => channel.Enabled).length;
            if (catalog.some(query => query.isPending)) return '…';
            return enabled ? `${Math.round(ready.length / enabled * 100)}%` : '—';
        }
        if (name === 'Grabaciones' && recordings.data) return String(recordings.data.TotalRecordCount ?? recordings.data.Items?.length ?? 0);
        return '';
    }
    const activeSessions = sessions.data?.filter(session => session.NowPlayingItem) || [];
    return <Page id='studioChannelSettingsPage' title='Canales' className='mainAnimatedPage type-interior'><div className='content-primary studioLiveSettings'>
        <header className='studioLiveConfigHeader'><div><h1>Canales</h1><p>{channels.length} canales de tus bibliotecas · {ready.length} con programación disponible</p></div><div><button type='button' disabled={!draft || busy || channels.length >= 100} onClick={() => add()}>＋ Añadir canales</button><button type='button' disabled={!dirty || busy} onClick={() => {
            void save();
        }}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><Link to='/studio/live'>Ver guía ↗</Link></div></header>
        {config.isPending && <p>Cargando configuración…</p>}{config.isError && <p role='alert'>No se pudo cargar la configuración del servidor.</p>}{message && <p role='status'>{message}</p>}{error && <p role='alert'>{error}</p>}{dirty && <p className='studioLiveDraftNotice'>Cambios sin guardar. La guía pública usará la configuración guardada.</p>}
        {draft && <div className='studioLiveSettingsLayout'><nav aria-label='Configuración de canales'>{tabs.map(name => <button key={name} type='button' aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>{name}<span>{tabBadge(name)}</span></button>)}</nav><div className='studioLiveSettingsBody'>
            {tab === 'Resumen' && <>
                {!!suggestions.length && <article className='studioLiveConfigCard studioLiveSuggestion'><div><strong>{suggestions.length} géneros disponibles para crear canales</strong><p>{suggestions.slice(0, 3).map(genre => genre.Name).join(' · ')}</p></div><button type='button' onClick={() => setTab('Canales')}>Ver opciones</button></article>}
                <article className='studioLiveConfigCard'><h2>Requiere atención</h2><p>Canales activos sin contenido reproducible o con errores de consulta.</p>{!attention.length ? <div className='studioLiveConfigEmpty'>{catalog.some(query => query.isPending) ? 'Comprobando programación…' : 'No hay incidencias detectadas'}</div> : attention.map(channel => <p key={channel.Id}>{channel.Number} · {channel.Name} — comprueba el origen, los permisos y las duraciones.</p>)}</article>
                <article className='studioLiveConfigCard'><h2>Viendo ahora</h2><p>Sesiones del servidor. Jellyfin no indica si se iniciaron desde Canales.</p>{sessions.isError && <p role='alert'>No se pudieron consultar las sesiones.</p>}{!sessions.isPending && !sessions.isError && !activeSessions.length && <div className='studioLiveConfigEmpty'>Nadie está reproduciendo contenido</div>}{activeSessions.map(session => <p key={session.Id}><strong>{session.UserName}</strong> · {session.NowPlayingItem?.Name}</p>)}</article>
            </>}
            {tab === 'Canales' && <><div className='studioLiveConfigCard'><h2>Añadir desde tu biblioteca</h2><p>Elige un género o crea un canal y selecciona una serie. Guarda los cambios para publicarlos.</p><div className='studioLiveSuggestions'>{suggestions.map(genre => <button type='button' key={genre.Id} onClick={() => add(genre.Name || '')}>＋ {genre.Name}</button>)}</div>{genres.isError && <p role='alert'>No se pudieron consultar los géneros.</p>}<label>Buscar series<input type='search' value={seriesSearch} onChange={event => setSeriesSearch(event.target.value)} placeholder='Nombre de la serie' /></label>{series.isError && <p role='alert'>No se pudieron cargar las series.</p>}</div>{channels.map(channel => <ChannelEditor key={channel.Id} channel={channel} genres={genres.data?.Items || []} series={series.data?.Items || []} folders={folders} onChange={update} onRemove={() => change({ ...draft, Channels: channels.filter(value => value.Id !== channel.Id) })} />)}{!channels.length && <div className='studioLiveConfigCard studioLiveConfigEmpty'>Todavía no hay canales. Añade un género o un maratón.</div>}</>}
            {tab === 'Fuentes' && <article className='studioLiveConfigCard'><h2>Bibliotecas de origen</h2><p>Los canales usan el catálogo de Jellyfin. Puedes limitar cada canal de películas a una biblioteca desde Canales;
                los maratones usan la serie seleccionada.</p>{folders.map(folder => <div className='studioLiveSourceRow' key={folder.ItemId}><strong>{folder.Name}</strong><span>{folder.Locations?.join(' · ')}</span><Link to='/dashboard/libraries'>Gestionar</Link></div>)}<Link to='/dashboard/livetv'>Configurar sintonizadores y fuentes de TV en directo ↗</Link></article>}
            {tab === 'Guía' && <article className='studioLiveConfigCard'><h2>Guía de programación</h2><p>Programación continua calculada con duraciones reales. No se descarga EPG externa para los canales de biblioteca.</p>{channels.map((channel, index) => {
                const current = channelSchedule(catalog[index]?.data || [], now, channel.Kind === 'series')[0];
                return <div className='studioLiveSourceRow' key={channel.Id}><strong>{channel.Number} · {channel.Name}</strong><span>{current ? `${current.item.Name} · ${channelTime(current.start)} – ${channelTime(current.end)}` : 'Sin programación disponible'}</span><span>{channel.Enabled ? 'Activo' : 'Desactivado'}</span></div>;
            })}<Link to='/studio/live'>Abrir guía</Link></article>}
            {tab === 'Grabaciones' && <article className='studioLiveConfigCard'><h2>Grabaciones de Jellyfin</h2><p>Los canales de biblioteca ya usan tus archivos y no crean grabaciones. Las grabaciones de TV y sus reglas se gestionan con Jellyfin.</p>{recordings.isPending && <p>Cargando grabaciones…</p>}{recordings.isError && <p role='alert'>No se pudieron consultar las grabaciones.</p>}{recordings.data && <p>{recordings.data.TotalRecordCount ?? recordings.data.Items?.length ?? 0} grabaciones</p>}{recordings.data?.Items?.slice(0, 10).map(item => <p key={item.Id}>{item.Name}</p>)}<Link to='/dashboard/livetv/recordings'>Gestionar grabaciones ↗</Link></article>}
            {tab === 'Categorías' && <article className='studioLiveConfigCard'><h2>Categorías</h2><p>Asigna la categoría de cada canal en su formulario. En la guía, los usuarios pueden filtrarlas y fijarlas como pestañas personales.</p>{categories.map(name => <div key={name} className='studioLiveSourceRow'><strong>{name}</strong><span>{channels.filter(channel => (channel.Category || (channel.Kind === 'series' ? 'Series' : 'Películas')) === name).length} canales</span><button type='button' onClick={() => setTab('Canales')}>Editar canales</button></div>)}</article>}
            {tab === 'Ajustes' && <article className='studioLiveConfigCard'><h2>Ajustes de Canales</h2><label><input type='checkbox' checked={draft.Enabled} onChange={event => change({ ...draft, Enabled: event.target.checked })} /> Activar canales de biblioteca</label><label>Horas visibles en la guía<select aria-label='Horas visibles en la guía' value={draft.GuideHours} onChange={event => change({ ...draft, GuideHours: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map(hours => <option key={hours} value={hours}>{hours} horas</option>)}</select></label><p>La sintonización empieza en el momento actual del programa, continúa con el siguiente y repite la cola al terminar. La hora se muestra según la zona horaria del dispositivo.</p><p>Los canales compartidos se guardan en el servidor. Cada usuario solo puede consultar y reproducir contenido autorizado en sus bibliotecas.</p></article>}
        </div></div>}
    </div></Page>;
}

/* eslint-enable react/jsx-no-bind */
