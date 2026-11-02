/* eslint-disable react/jsx-no-bind -- Small controlled forms keep event handlers next to their inputs. */
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from 'hooks/useApi';
import { channelItems, channelSchedule, parseChannels } from './channelSchedule';
import { client, image, playItem, readPreferences, savePreference, studioKeys } from './studioApi';
import './studioPages.scss';

export default function StudioChannels() {
    const { user } = useApi();
    const [selected, setSelected] = useState('');
    const [seriesSearch, setSeriesSearch] = useState('');
    const [now, setNow] = useState(Date.now());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const prefs = useQuery({
        queryKey: ['StudioPreferences', user?.Id],
        enabled: !!user?.Id,
        queryFn: readPreferences
    });
    const channels = parseChannels(prefs.data?.CustomPrefs?.[studioKeys.channels]);
    const genres = useQuery({
        queryKey: ['StudioChannelGenres', user?.Id],
        refetchInterval: 15000,
        enabled: !!user?.Id,
        queryFn: () =>
            client().getJSON(
                client().getUrl('Genres', { UserId: user!.Id, Recursive: true, IncludeItemTypes: 'Movie' })
            ) as Promise<{ Items?: BaseItemDto[] }>
    });
    const series = useQuery({
        queryKey: ['StudioMarathonSeries', user?.Id, seriesSearch],
        refetchInterval: 15000,
        enabled: !!user?.Id,
        queryFn: () =>
            client().getItems(user!.Id!, {
                Recursive: true,
                IncludeItemTypes: 'Series',
                SortBy: 'SortName',
                SearchTerm: seriesSearch || undefined,
                Limit: 100
            })
    });
    const genre = selected || channels[0];
    const isMarathon = !!genre?.startsWith('series:');
    const seriesId = isMarathon ? genre.slice(7) : undefined;
    const channelName = isMarathon ?
        series.data?.Items?.find((item) => item.Id === seriesId)?.Name || 'Maratón de series' :
        genre;
    const films = useQuery({
        queryKey: ['StudioChannelFilms', user?.Id, genre],
        enabled: !!user?.Id && !!genre,
        queryFn: async () => {
            const all: BaseItemDto[] = [];
            let total = 0;
            do {
                const result = await client().getItems(user!.Id!, {
                    Recursive: true,
                    IncludeItemTypes: isMarathon ? 'Episode' : 'Movie',
                    Genres: isMarathon ? undefined : genre,
                    ParentId: seriesId,
                    Fields: 'Overview',
                    SortBy: 'SortName',
                    Limit: 200,
                    StartIndex: all.length
                });
                all.push(...(result.Items || []));
                total = result.TotalRecordCount || 0;
                if (!result.Items?.length) break;
            } while (all.length < total);
            return all;
        }
    });
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 15000);
        return () => window.clearInterval(timer);
    }, []);
    const schedule = channelSchedule(films.data || [], now, isMarathon);
    const active = schedule[0];
    async function toggle(name: string) {
        setBusy(true);
        setError('');
        try {
            await savePreference(
                studioKeys.channels,
                JSON.stringify(channels.includes(name) ? channels.filter((c) => c !== name) : [...channels, name])
            );
            await prefs.refetch();
        } catch {
            setError('No se pudo guardar el canal. Inténtalo de nuevo.');
        } finally {
            setBusy(false);
        }
    }
    async function tune() {
        if (!active) return;
        setBusy(true);
        setError('');
        try {
            const current = channelSchedule(films.data || [], Date.now(), isMarathon)[0];
            const ordered = channelItems(films.data || [], isMarathon);
            const index = ordered.findIndex((item) => item.Id === current.item.Id);
            const queue = [...ordered.slice(index), ...ordered.slice(0, index)];
            const { playbackManager } = await import('components/playback/playbackmanager');
            await playbackManager.play({
                items: queue.map((item) => ({
                    ...item,
                    ServerId: client().serverId(),
                    playOptions: { autoPlayQueue: true }
                })),
                startPositionTicks: current.offsetTicks,
                autoPlayQueue: true
            });
            playbackManager.setRepeatMode('RepeatAll');
        } catch {
            setError('No se pudo reproducir este canal.');
        } finally {
            setBusy(false);
        }
    }
    return (
        <div className='studioPage'>
            <p className='studioEyebrow'>TU CINE, A CUALQUIER HORA</p>
            <h1>Canales de tu biblioteca</h1>
            <p className='studioMuted'>
                Programación por género calculada con tus películas. Al sintonizar, entras en el momento actual de la
                película. La cola continúa con el siguiente título y se repite al terminar.
            </p>
            <div className='studioChannelLayout'>
                <div>
                    <div className='studioChannelPreview'>
                        {active && image(active.item, true) && <img src={image(active.item, true)} alt='' />}
                        <div>
                            <p className='studioEyebrow'>{channelName || 'ELIGE TUS CANALES'}</p>
                            <h2>{active?.item.Name || 'Tu próxima sesión empieza aquí'}</h2>
                            {active && (
                                <>
                                    <p>{active.item.Overview}</p>
                                    <button
                                        className='studioAction studioAction-primary'
                                        disabled={busy}
                                        onClick={() => {
                                            void tune();
                                        }}
                                    >
                                        ▶ Sintonizar ahora
                                    </button>
                                    <Link to={`/details?id=${active.item.Id}`}>Ver ficha</Link>
                                </>
                            )}
                            {genre && !films.isPending && !active && (
                                <p>No hay títulos con duración disponible en este canal.</p>
                            )}
                        </div>
                    </div>
                    <div className='studioGuide'>
                        {schedule.map((entry, i) => (
                            <button
                                key={`${entry.item.Id}-${entry.start}`}
                                onClick={() => {
                                    void playItem(entry.item).catch(() => setError('No se pudo reproducir el título.'));
                                }}
                            >
                                <small>
                                    {i === 0 ?
                                        'AHORA' :
                                        new Date(entry.start).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                </small>
                                <strong>{entry.item.Name}</strong>
                            </button>
                        ))}
                    </div>
                    {films.isError && <p role='alert'>No se pudo cargar la programación.</p>}
                </div>
                <section className='studioPanel'>
                    <h2>Hechos para ti</h2>
                    <p className='studioMuted'>Activa los géneros que quieras encontrar en Canales.</p>
                    {prefs.isPending || genres.isPending ? (
                        <p>Cargando canales…</p>
                    ) : (
                        genres.data?.Items?.map((g, i) => (
                            <div className='studioChannelRow' key={g.Id}>
                                <button className='studioChannelName' onClick={() => setSelected(g.Name || '')}>
                                    <span>{401 + i}</span>
                                    <strong>{g.Name}</strong>
                                    <small>Películas de tu biblioteca</small>
                                </button>
                                <button
                                    role='switch'
                                    aria-label={`Activar ${g.Name}`}
                                    aria-checked={channels.includes(g.Name || '')}
                                    disabled={busy || prefs.isError}
                                    className='studioSwitch'
                                    onClick={() => {
                                        void toggle(g.Name || '');
                                    }}
                                >
                                    <span />
                                </button>
                            </div>
                        ))
                    )}
                    {!genres.isPending && !genres.data?.Items?.length && (
                        <p>Los géneros aparecerán cuando termine el escaneo de tus películas.</p>
                    )}
                    {(prefs.isError || genres.isError) && <p role='alert'>No se pudieron cargar tus canales.</p>}
                    <details>
                        <summary>Maratones · una serie, todo el día</summary>
                        <label>
                            Buscar una serie
                            <input
                                type='search'
                                value={seriesSearch}
                                onChange={(e) => setSeriesSearch(e.target.value)}
                            />
                        </label>
                        {series.data?.Items?.map((item) => (
                            <div className='studioChannelRow' key={item.Id}>
                                <button className='studioChannelName' onClick={() => setSelected(`series:${item.Id}`)}>
                                    <strong>{item.Name}</strong>
                                    <small>En orden de temporada y episodio</small>
                                </button>
                                <button
                                    role='switch'
                                    aria-label={`Maratón ${item.Name}`}
                                    aria-checked={channels.includes(`series:${item.Id}`)}
                                    disabled={busy || prefs.isError}
                                    className='studioSwitch'
                                    onClick={() => {
                                        void toggle(`series:${item.Id}`);
                                    }}
                                >
                                    <span />
                                </button>
                            </div>
                        ))}
                        {!series.isPending && !series.data?.Items?.length && <p>No se encontraron series.</p>}
                        {series.isError && <p role='alert'>No se pudieron cargar tus series.</p>}
                    </details>
                    <Link to='/livetv'>Abrir TV en directo de Jellyfin ↗</Link>
                </section>
            </div>
            {error && <p role='alert'>{error}</p>}
        </div>
    );
}

/* eslint-enable react/jsx-no-bind */
