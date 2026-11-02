/* eslint-disable react/jsx-no-bind -- Small controlled forms keep event handlers next to their inputs. */
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from 'hooks/useApi';
import { request } from './studioApi';
import StudioRecommendations from './StudioRecommendations';
import './studioPages.scss';

export type ExternalMovie = {
    LibraryItemId?: string;
    TmdbId: number;
    Name: string;
    Overview?: string;
    Rating?: number;
    ReleaseDate?: string;
    PosterUrl?: string;
    BackdropUrl?: string;
    Url: string;
};
export type MovieMetadata = {
    LibraryItemId?: string;
    ImdbUrl?: string;
    Collection?: { Name: string; Parts: ExternalMovie[] };
};
export default function StudioDiscover() {
    const { user } = useApi();
    const [tab, setTab] = useState('local');
    const [selected, setSelected] = useState<ExternalMovie>();
    const movies = useQuery({
        queryKey: ['StudioExternalDiscovery', user?.Id, tab],
        enabled: tab !== 'local',
        queryFn: () => request<ExternalMovie[]>(`Studio/Discover?category=${tab}`),
        retry: false,
        staleTime: 600000
    });
    const details = useQuery({
        queryKey: ['StudioExternalDetails', user?.Id, selected?.TmdbId],
        enabled: !!selected,
        queryFn: () => request<MovieMetadata>(`Studio/Discover/${selected!.TmdbId}`),
        retry: false
    });
    let availability = 'No está en tu biblioteca';
    if (details.isPending) availability = 'Buscando en tu biblioteca…';
    if (details.isError) availability = 'Disponibilidad sin comprobar';
    return (
        <div className='studioPage'>
            <p className='studioEyebrow'>HISTORIAS QUE MERECE LA PENA DESCUBRIR</p>
            <h1>Tu próxima gran película</h1>
            <div className='studioTabs'>
                {[
                    ['local', 'Para ti'],
                    ['popular', 'Tendencias'],
                    ['now', 'En cines'],
                    ['upcoming', 'Próximamente'],
                    ['top', 'Mejor valoradas']
                ].map(([key, title]) => (
                    <button
                        key={key}
                        aria-pressed={tab === key}
                        onClick={() => {
                            setTab(key);
                            setSelected(undefined);
                        }}
                    >
                        {title}
                    </button>
                ))}
            </div>
            {tab === 'local' ? (
                <StudioRecommendations />
            ) : (
                <>
                    <p className='studioMuted'>
                        Catálogo de TMDb · puede incluir títulos que no están en tu biblioteca. No se descargan
                        películas.
                    </p>
                    {movies.isPending && <p role='status'>Consultando TMDb…</p>}
                    {movies.isError && (
                        <div className='studioNotice' role='alert'>
                            <strong>El catálogo externo no está disponible.</strong>
                            <p>
                                Comprueba la conexión del servidor con TMDb y los permisos de tu perfil. Puedes seguir
                                explorando tu biblioteca en «Para ti».
                            </p>
                            <button
                                onClick={() => {
                                    void movies.refetch();
                                }}
                            >
                                Reintentar
                            </button>
                        </div>
                    )}
                    {selected && (
                        <section className='studioDiscoverFeature'>
                            {selected.BackdropUrl && <img src={selected.BackdropUrl} alt='' />}
                            <div>
                                <button
                                    className='studioCloseDetail'
                                    aria-label='Cerrar ficha'
                                    onClick={() => setSelected(undefined)}
                                >
                                    ×
                                </button>
                                <p className='studioEyebrow'>
                                    {selected.ReleaseDate?.slice(0, 10)} · TMDb {selected.Rating?.toFixed(1)}
                                </p>
                                <h2>{selected.Name}</h2>
                                <p>{selected.Overview || 'Sin sinopsis disponible en español.'}</p>
                                {details.data?.LibraryItemId ? (
                                    <Link
                                        className='studioAction studioAction-primary'
                                        to={`/details?id=${details.data.LibraryItemId}`}
                                    >
                                        Ver en tu biblioteca
                                    </Link>
                                ) : (
                                    <span className='studioAction studioAction-secondary'>{availability}</span>
                                )}
                                <a
                                    className='studioAction studioAction-secondary'
                                    href={selected.Url}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    TMDb ↗
                                </a>
                                {details.data?.ImdbUrl && (
                                    <a
                                        className='studioAction studioAction-secondary'
                                        href={details.data.ImdbUrl}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                    >
                                        IMDb ↗
                                    </a>
                                )}
                                {details.data?.Collection && (
                                    <div>
                                        <h3>Parte de {details.data.Collection.Name}</h3>
                                        <div className='studioExternalSaga'>
                                            {details.data.Collection.Parts.map((part) => (
                                                <a
                                                    key={part.TmdbId}
                                                    href={`https://www.themoviedb.org/movie/${part.TmdbId}`}
                                                    target='_blank'
                                                    rel='noopener noreferrer'
                                                >
                                                    {part.PosterUrl && (
                                                        <img src={part.PosterUrl} alt='' loading='lazy' />
                                                    )}
                                                    <strong>{part.Name}</strong>
                                                    <small>{part.ReleaseDate?.slice(0, 4)}</small>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                    <div className='studioPosterGrid'>
                        {movies.data?.map((movie) => (
                            <button
                                key={movie.TmdbId}
                                className='studioExternalPoster'
                                onClick={() => setSelected(movie)}
                            >
                                <div className='studioPoster-art'>
                                    {movie.PosterUrl && <img src={movie.PosterUrl} alt='' loading='lazy' />}
                                    <span className='studioPoster-rating'>{movie.Rating?.toFixed(1)}</span>
                                </div>
                                <strong>{movie.Name}</strong>
                                <small>{movie.ReleaseDate?.slice(0, 4)}</small>
                            </button>
                        ))}
                    </div>
                </>
            )}
            <p className='studioMuted studioAttribution'>
                <a href='https://www.themoviedb.org/' target='_blank' rel='noopener noreferrer'>
                    Metadatos de TMDb
                </a>
                . Este producto utiliza la API de TMDb, pero TMDb no lo avala ni certifica.
            </p>
        </div>
    );
}

/* eslint-enable react/jsx-no-bind */
