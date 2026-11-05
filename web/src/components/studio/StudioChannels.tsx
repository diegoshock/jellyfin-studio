/* eslint-disable react/jsx-no-bind -- Guide selection and controlled filters use local values. */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from 'hooks/useApi';
import { channelGuide, channelSchedule } from './channelSchedule';
import { channelTime, tuneChannel, useChannelCatalog, useChannelConfig, type StudioChannel } from './channelData';
import { image, playItem, readPreferences, savePreference } from './studioApi';
import './studioChannels.scss';

type GuideEntry = ReturnType<typeof channelGuide>[number];
const halfHour = 1800000;
function ChannelHero({ channel, entry, now, busy, onTune, onError }: Readonly<{ channel?: StudioChannel;
    entry?: GuideEntry;
    now: number;
    busy: boolean;
    onTune: () => void;
    onError: () => void }>) {
    const current = entry && entry.start <= now && entry.end > now;
    const progress = entry && current ? (now - entry.start) / (entry.end - entry.start) * 100 : 0;
    return <header className='studioLiveHero'>
        {entry && image(entry.item, true) && <img src={image(entry.item, true)} alt='' />}
        <div className='studioLiveHeroContent'>
            <p className='studioLiveChannelLabel'>{channel ? `${channel.Number}  ${channel.Name}` : 'CANALES DE TU BIBLIOTECA'}</p>
            <h1>{entry?.item.Name || 'Tu biblioteca, en directo'}</h1>
            {entry && <><p>{channelTime(entry.start)} – {channelTime(entry.end)} · {entry.item.ProductionYear} · {Math.round((entry.item.RunTimeTicks || 0) / 600000000)} min</p>
                {current && <div className='studioLiveProgress'><progress max='100' value={progress} /><span>{Math.ceil((entry.end - now) / 60000)} min restantes</span></div>}
                <div className='studioLiveHeroActions'><button type='button' disabled={busy} onClick={current ? onTune : () => {
                    void playItem(entry.item).catch(onError);
                }}>{current ? '▶ Sintonizar ahora' : '▶ Reproducir desde el inicio'}</button><Link to={`/details?id=${entry.item.Id}`}>Ver ficha</Link>{!current && <span>Próximamente en el canal</span>}</div>
            </>}
            {!entry && <p>La programación se crea con los títulos y duraciones disponibles en tus bibliotecas.</p>}
        </div>
    </header>;
}

function GuideRow({ channel, entries, from, to, now, selected, onSelect, pending, failed }: Readonly<{ channel: StudioChannel;
    entries: GuideEntry[];
    from: number;
    to: number;
    now: number;
    selected: boolean;
    onSelect: (entry?: GuideEntry) => void;
    pending: boolean;
    failed: boolean }>) {
    let emptyLabel = 'Sin títulos accesibles con duración disponible.';
    if (failed) emptyLabel = 'Canal sin acceso o no disponible.';
    if (pending) emptyLabel = 'Cargando programación…';
    return <div className={`studioLiveGuideRow${selected ? ' selected' : ''}`}>
        <button type='button' className='studioLiveGuideChannel' onClick={() => onSelect()}><span>{channel.Number}</span><strong>{channel.Name}</strong><small>{channel.Category || (channel.Kind === 'series' ? 'Series' : 'Películas')}</small></button>
        <div className='studioLiveGuidePrograms'>
            {entries.map(entry => {
                const start = Math.max(from, entry.start);
                const end = Math.min(to, entry.end);
                return <button type='button' key={`${entry.item.Id}-${entry.start}`} className={entry.start <= now && entry.end > now ? 'onAir' : ''} style={{ left: `${(start - from) / (to - from) * 100}%`, width: `${(end - start) / (to - from) * 100}%` }} onClick={() => onSelect(entry)} title={`${entry.item.Name} · ${channelTime(entry.start)} – ${channelTime(entry.end)}`}><strong>{entry.item.Name}</strong><small>{channelTime(entry.start)} – {channelTime(entry.end)}</small></button>;
            })}
            {!entries.length && <p>{emptyLabel}</p>}
        </div>
    </div>;
}

export default function StudioChannels() {
    const { user } = useApi();
    const config = useChannelConfig();
    const channels = (config.data?.Enabled === false ? [] : [...config.lineup]).filter(channel => channel.Enabled).sort((a, b) => a.Number - b.Number);
    const catalog = useChannelCatalog(channels, config.data?.Enabled !== false);
    const [selected, setSelected] = useState('');
    const [preview, setPreview] = useState<{ channelId: string; entry: GuideEntry }>();
    const [now, setNow] = useState(Date.now());
    const [shift, setShift] = useState(0);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [showCategories, setShowCategories] = useState(false);
    const [tabs, setTabs] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 15000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        let active = true;
        void readPreferences().then(prefs => {
            try {
                const values: unknown = JSON.parse(prefs.CustomPrefs?.['studio.channelTabs'] || '[]');
                if (active && Array.isArray(values)) setTabs(values.filter((value): value is string => typeof value === 'string').slice(0, 10));
            } catch { /* Keep the default All tab. */ }
        }).catch(() => { /* Optional personal tabs do not block the guide. */ });
        return () => {
            active = false;
        };
    }, [user?.Id]);
    async function pinCategory(name: string) {
        const next = tabs.includes(name) ? tabs.filter(tab => tab !== name) : [...tabs, name].slice(0, 10);
        try {
            await savePreference('studio.channelTabs', JSON.stringify(next));
            setTabs(next);
        } catch {
            setError('No se pudo guardar la pestaña.');
        }
    }
    const index = Math.max(0, channels.findIndex(channel => channel.Id === selected));
    const activeChannel = channels[index];
    const activeItems = catalog[index]?.data || [];
    const current = channelSchedule(activeItems, now, activeChannel?.Kind === 'series')[0];
    const active = activeChannel && (preview?.channelId === activeChannel.Id ? preview.entry : current);
    const from = Math.floor(now / halfHour) * halfHour + shift * halfHour;
    const hours = config.data?.GuideHours || 3;
    const to = from + hours * 3600000;
    const categories = [...new Set(channels.map(channel => channel.Category || (channel.Kind === 'series' ? 'Series' : 'Películas')))];
    const rows = channels.map((channel, rowIndex) => ({ channel, query: catalog[rowIndex], entries: channelGuide(catalog[rowIndex]?.data || [], from, to, channel.Kind === 'series') })).filter(row => (!category || (row.channel.Category || (row.channel.Kind === 'series' ? 'Series' : 'Películas')) === category) && `${row.channel.Name} ${row.channel.Number} ${row.entries.map(entry => entry.item.Name).join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    async function tune() {
        if (!activeChannel) return;
        setBusy(true);
        setError('');
        try {
            await tuneChannel(activeChannel, activeItems);
        } catch {
            setError('No se pudo sintonizar este canal.');
        } finally {
            setBusy(false);
        }
    }
    function playbackError() {
        setError('No se pudo reproducir el título.');
    }
    return <div className='studioLivePage'>
        <ChannelHero channel={activeChannel} entry={active} now={now} busy={busy} onTune={() => {
            void tune();
        }} onError={playbackError} />
        <section className='studioLiveGuideSection' aria-label='Guía de canales'>
            <div className='studioLiveToolbar'><div className='studioLiveTabs'><button type='button' aria-pressed={!category && !showCategories} onClick={() => {
                setCategory('');
                setShowCategories(false);
            }}>Todos</button><Link to='/livetv?tab=3'>Grabaciones</Link><button type='button' aria-pressed={showCategories} onClick={() => setShowCategories(value => !value)}>Categorías</button>{tabs.filter(tab => categories.includes(tab)).map(tab => <button key={tab} type='button' aria-pressed={category === tab} onClick={() => {
                setCategory(tab);
                setShowCategories(false);
            }}>{tab}</button>)}</div><button type='button' className='studioLiveNewTab' onClick={() => setShowCategories(true)}>＋ Nueva pestaña</button><input type='search' aria-label='Buscar canales y programas' placeholder='Buscar canales y programas' value={search} onChange={event => setSearch(event.target.value)} />{user?.Policy?.IsAdministrator && <Link className='studioLiveConfigure' to='/dashboard/channels'>Configurar canales</Link>}</div>
            {showCategories && <div className='studioLiveCategories'>{categories.map(name => <div key={name}><button type='button' onClick={() => setCategory(name)} aria-pressed={category === name}>{name}</button><button type='button' aria-label={`${tabs.includes(name) ? 'Quitar' : 'Crear'} pestaña ${name}`} onClick={() => {
                void pinCategory(name);
            }}>{tabs.includes(name) ? '− Pestaña' : '＋ Pestaña'}</button></div>)}{!categories.length && <p>No hay categorías configuradas.</p>}</div>}
            {config.isError && <p role='alert'>No se pudo cargar la configuración de canales.</p>}
            {config.isPending && <p>Cargando canales…</p>}
            {config.data?.Enabled === false ? <p>Los canales están desactivados en la configuración del servidor.</p> : <>
                <div className='studioLiveGuideScroll'><div className='studioLiveGuideCanvas' style={{ minWidth: `${260 + hours * 300}px` }}>
                    <div className='studioLiveTimeAxis'><div><button type='button' aria-label='Retroceder 30 minutos' onClick={() => setShift(value => value - 1)}>‹</button><button type='button' onClick={() => {
                        setShift(0);
                        setNow(Date.now());
                        setPreview(undefined);
                    }}>Ahora</button><button type='button' aria-label='Avanzar 30 minutos' onClick={() => setShift(value => value + 1)}>›</button></div><div>{Array.from({ length: hours * 2 }, (_, slot) => <span key={from + slot * halfHour} style={{ left: `${slot / (hours * 2) * 100}%` }}>{channelTime(from + slot * halfHour)}</span>)}{now >= from && now < to && <b style={{ left: `${(now - from) / (to - from) * 100}%` }}>{channelTime(now)}</b>}</div></div>
                    {rows.map(({ channel, query, entries }) => <GuideRow key={channel.Id} channel={channel} entries={entries} from={from} to={to} now={now} selected={channel.Id === activeChannel?.Id} pending={query.isPending} failed={query.isError} onSelect={entry => {
                        setSelected(channel.Id);
                        setPreview(entry ? { channelId: channel.Id, entry } : undefined);
                    }} />)}
                </div></div>
                {!config.isPending && !rows.length && <div className='studioLiveEmpty'><h2>{channels.length ? 'No hay resultados' : 'No hay canales activados'}</h2><p>{channels.length ? 'Prueba otro nombre, programa o categoría.' : 'Activa géneros o crea un maratón de series desde la configuración de Canales.'}</p>{user?.Policy?.IsAdministrator && <Link to='/dashboard/channels'>Añadir canales</Link>}</div>}
            </>}
            {error && <p role='alert'>{error}</p>}
        </section>
    </div>;
}

/* eslint-enable react/jsx-no-bind */
