import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useApi } from 'hooks/useApi';
import { request } from './studioApi';
import type { MovieMetadata } from './StudioDiscover';
import './studioPages.scss';

export default function StudioSaga({ item }: Readonly<{ item: BaseItemDto }>) {
    const { user } = useApi();
    const id = item.ProviderIds?.Tmdb;
    const metadata = useQuery({
        queryKey: ['StudioExternalDetails', user?.Id, Number(id)],
        enabled: !!id && item.Type === 'Movie',
        queryFn: () => request<MovieMetadata>(`Studio/Discover/${id}`),
        retry: false,
        staleTime: 600000
    });
    const collection = metadata.data?.Collection;
    if (!collection) return null;
    return (
        <section className='studioSaga'>
            <h2>Parte de {collection.Name}</h2>
            <p className='secondaryText'>Orden de estreno · incluye títulos fuera de tu biblioteca</p>
            <div className='studioSagaRow'>
                {collection.Parts.map((part) => (
                    <a
                        key={part.TmdbId}
                        className={String(part.TmdbId) === id ? 'studioSaga-current' : ''}
                        href={
                            part.LibraryItemId ?
                                `#/details?id=${part.LibraryItemId}` :
                                `https://www.themoviedb.org/movie/${part.TmdbId}`
                        }
                        target={part.LibraryItemId ? undefined : '_blank'}
                        rel='noopener noreferrer'
                    >
                        <div>
                            {part.PosterUrl && <img src={part.PosterUrl} alt='' loading='lazy' />}
                            {!part.LibraryItemId && <span>No está en tu biblioteca</span>}
                        </div>
                        <strong>{part.Name}</strong>
                        <small>{part.ReleaseDate?.slice(0, 4) || 'Próximamente'}</small>
                    </a>
                ))}
            </div>
            <p className='studioMuted'>
                Datos de TMDb ·{' '}
                <a href='https://www.themoviedb.org/' target='_blank' rel='noopener noreferrer'>
                    TMDb
                </a>
                {metadata.data?.ImdbUrl && (
                    <>
                        {' '}
                        ·{' '}
                        <a href={metadata.data.ImdbUrl} target='_blank' rel='noopener noreferrer'>
                            IMDb ↗
                        </a>
                    </>
                )}
            </p>
        </section>
    );
}
