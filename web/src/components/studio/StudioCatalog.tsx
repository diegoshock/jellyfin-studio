/* eslint-disable react/jsx-no-bind -- Small controlled forms keep event handlers next to their inputs. */
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from 'hooks/useApi';
import { client, image } from './studioApi';
import './studioPages.scss';

export function Poster({ item }: Readonly<{ item: BaseItemDto }>) {
    const src = image(item);
    return (
        <Link className='studioPoster' to={`/details?id=${item.Id}`}>
            <div className='studioPoster-art'>
                {src ? (
                    <img src={src} alt='' loading='lazy' />
                ) : (
                    <span className='material-icons' aria-hidden='true'>
                        movie
                    </span>
                )}
                {!!item.CommunityRating && (
                    <span className='studioPoster-rating'>{item.CommunityRating.toFixed(1)}</span>
                )}
                {item.UserData?.Played && (
                    <span className='studioPoster-watched' aria-label='Vista'>
                        ✓
                    </span>
                )}
            </div>
            <strong>{item.Name}</strong>
            <small>{item.ProductionYear}</small>
        </Link>
    );
}

export default function StudioCatalog({ mode = 'browse' }: Readonly<{ mode?: 'browse' | 'discover' | 'history' }>) {
    const { user } = useApi();
    const [type, setType] = useState('Movie');
    const [genre, setGenre] = useState('');
    const [year, setYear] = useState('');
    const [rating, setRating] = useState('');
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState(mode === 'history' ? 'DatePlayed' : 'DateCreated');
    const [ascending, setAscending] = useState(false);
    const [search, setSearch] = useState('');
    const [letter, setLetter] = useState('');
    const [page, setPage] = useState(0);
    const [tab, setTab] = useState('Para ti');
    const isDiscover = mode === 'discover';
    const isHistory = mode === 'history';
    const discoverSort: Record<string, string> = {
        'Mejor valoradas': 'CommunityRating,SortName',
        Recientes: 'PremiereDate,SortName'
    };
    const sortBy = isDiscover ? discoverSort[tab] || 'Random' : `${sort},SortName`;
    const heading = { browse: 'Explorar', discover: 'Descubrir', history: 'Mi historial' }[mode];
    const eyebrow = { browse: 'TU BIBLIOTECA', discover: 'ALGO PARA ESTA NOCHE', history: 'TU ACTIVIDAD' }[mode];
    const catalog = useQuery({
        queryKey: [
            'StudioCatalog',
            user?.Id,
            mode,
            type,
            genre,
            year,
            rating,
            status,
            sort,
            ascending,
            search,
            letter,
            page,
            tab
        ],
        enabled: !!user?.Id,
        queryFn: () =>
            client().getItems(user!.Id!, {
                Recursive: true,
                IncludeItemTypes: isHistory ? 'Movie,Episode' : type,
                Fields: 'Overview,Genres,DateCreated',
                ImageTypeLimit: 1,
                SortBy: sortBy,
                SortOrder: ascending ? 'Ascending' : 'Descending',
                Limit: 60,
                StartIndex: page * 60,
                Genres: genre || undefined,
                Years: year || undefined,
                MinCommunityRating: rating || undefined,
                Filters: isHistory ? 'IsPlayed' : status || undefined,
                SearchTerm: search || undefined,
                NameStartsWith: letter || undefined,
                EnableTotalRecordCount: true
            })
    });
    const genres = useQuery({
        queryKey: ['StudioGenres', user?.Id, type],
        enabled: !!user?.Id,
        queryFn: () =>
            client().getJSON(
                client().getUrl('Genres', {
                    UserId: user!.Id,
                    Recursive: true,
                    IncludeItemTypes: type,
                    SortBy: 'SortName'
                })
            ) as Promise<{ Items?: BaseItemDto[] }>
    });
    const resume = useQuery({
        queryKey: ['StudioHistoryResume', user?.Id],
        enabled: isHistory && !!user?.Id,
        queryFn: () =>
            client().getItems(user!.Id!, {
                Recursive: true,
                IncludeItemTypes: 'Movie,Episode',
                Filters: 'IsResumable',
                SortBy: 'DatePlayed',
                SortOrder: 'Descending',
                Limit: 18
            })
    });
    const items = catalog.data?.Items || [];
    const reset = () => setPage(0);
    return (
        <div className='studioPage'>
            <header className='studioPage-heading'>
                <div>
                    <p className='studioEyebrow'>{eyebrow}</p>
                    <h1>
                        {heading} <small>{catalog.data?.TotalRecordCount ?? ''}</small>
                    </h1>
                </div>
                <input
                    aria-label='Buscar títulos'
                    placeholder='Buscar en tu biblioteca…'
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        reset();
                    }}
                    type='search'
                />
            </header>
            {!isHistory && (
                <div className='studioTabs' role='group' aria-label='Tipo de contenido'>
                    <button
                        aria-pressed={type === 'Movie'}
                        onClick={() => {
                            setType('Movie');
                            setGenre('');
                            reset();
                        }}
                    >
                        Películas
                    </button>
                    <button
                        aria-pressed={type === 'Series'}
                        onClick={() => {
                            setType('Series');
                            setGenre('');
                            reset();
                        }}
                    >
                        Series
                    </button>
                </div>
            )}
            {isDiscover && (
                <>
                    <div className='studioTabs'>
                        {['Para ti', 'Recientes', 'Mejor valoradas'].map((t) => (
                            <button
                                key={t}
                                aria-pressed={tab === t}
                                onClick={() => {
                                    setTab(t);
                                    reset();
                                }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <p className='studioMuted'>
                        Una selección de tu biblioteca. Las sinopsis y valoraciones proceden de los proveedores de
                        metadatos configurados en tu servidor.
                    </p>
                </>
            )}
            <div className='studioFilters'>
                <select
                    aria-label='Género'
                    value={genre}
                    onChange={(e) => {
                        setGenre(e.target.value);
                        reset();
                    }}
                >
                    <option value=''>Todos los géneros</option>
                    {genres.data?.Items?.map((g) => (
                        <option key={g.Id} value={g.Name || ''}>
                            {g.Name}
                        </option>
                    ))}
                </select>
                <input
                    className='studioYear'
                    aria-label='Año'
                    placeholder='Año'
                    inputMode='numeric'
                    maxLength={4}
                    value={year}
                    onChange={(e) => {
                        setYear(e.target.value.replace(/\D/g, ''));
                        reset();
                    }}
                />
                <select
                    aria-label='Valoración mínima'
                    value={rating}
                    onChange={(e) => {
                        setRating(e.target.value);
                        reset();
                    }}
                >
                    <option value=''>Valoración</option>
                    <option value='7'>7 o más</option>
                    <option value='8'>8 o más</option>
                    <option value='9'>9 o más</option>
                </select>
                {!isHistory && (
                    <select
                        aria-label='Estado'
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            reset();
                        }}
                    >
                        <option value=''>Todas</option>
                        <option value='IsUnplayed'>Sin ver</option>
                        <option value='IsPlayed'>Vistas</option>
                        <option value='IsFavorite'>Favoritas</option>
                        <option value='IsResumable'>En curso</option>
                    </select>
                )}
                {!isDiscover && (
                    <>
                        <select
                            aria-label='Ordenar por'
                            value={sort}
                            onChange={(e) => {
                                setSort(e.target.value);
                                reset();
                            }}
                        >
                            <option value='DateCreated'>Añadidas recientemente</option>
                            <option value='SortName'>Título</option>
                            <option value='PremiereDate'>Estreno</option>
                            <option value='CommunityRating'>Valoración</option>
                            {isHistory && <option value='DatePlayed'>Última reproducción</option>}
                        </select>
                        <button
                            aria-label='Invertir orden'
                            onClick={() => {
                                setAscending(!ascending);
                                reset();
                            }}
                        >
                            {ascending ? '↑' : '↓'}
                        </button>
                    </>
                )}
                <Link to='/boxsets'>Colecciones ↗</Link>
                <Link to='/home?tab=1'>Favoritas ↗</Link>
            </div>
            {catalog.isPending && <p role='status'>Cargando tu biblioteca…</p>}
            {catalog.isError && (
                <div role='alert'>
                    No se pudo cargar la biblioteca.{' '}
                    <button
                        onClick={() => {
                            void catalog.refetch();
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            )}
            {isDiscover && items[0] && (
                <Link className='studioDiscoverFeature' to={`/details?id=${items[0].Id}`}>
                    {image(items[0], true) && <img src={image(items[0], true)} alt='' />}
                    <div>
                        <p className='studioEyebrow'>DE TU BIBLIOTECA</p>
                        <h2>{items[0].Name}</h2>
                        <p>{items[0].Overview}</p>
                        <span>Ver película →</span>
                    </div>
                </Link>
            )}
            {isHistory && !!resume.data?.Items?.length && (
                <section>
                    <h2>En curso</h2>
                    <div className='studioPosterGrid'>
                        {resume.data.Items.map((item) => (
                            <Poster key={item.Id} item={item} />
                        ))}
                    </div>
                    <h2>Vistas</h2>
                </section>
            )}
            <div className='studioCatalogLayout'>
                <div className='studioPosterGrid'>
                    {items.map((item) => (
                        <Poster key={item.Id} item={item} />
                    ))}
                </div>
                {!isDiscover && !isHistory && (
                    <nav className='studioAlphabet' aria-label='Índice alfabético'>
                        {['', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((l) => (
                            <button
                                key={l}
                                aria-pressed={letter === l}
                                onClick={() => {
                                    setLetter(l);
                                    reset();
                                }}
                            >
                                {l || '#'}
                            </button>
                        ))}
                    </nav>
                )}
            </div>
            {!catalog.isPending && !catalog.isError && !items.length && (
                <div className='studioEmpty'>
                    <span className='material-icons'>video_library</span>
                    <h2>{isHistory ? 'Tu historia empieza aquí' : 'No hay títulos para estos filtros'}</h2>
                    <p>
                        {isHistory ?
                            'Las películas y episodios vistos aparecerán aquí.' :
                            'Prueba otro género o añade contenido a tus bibliotecas.'}
                    </p>
                </div>
            )}
            <footer className='studioPagination'>
                <button disabled={!page} onClick={() => setPage(page - 1)}>
                    Anterior
                </button>
                <span>Página {page + 1}</span>
                <button
                    disabled={(page + 1) * 60 >= (catalog.data?.TotalRecordCount || 0)}
                    onClick={() => setPage(page + 1)}
                >
                    Siguiente
                </button>
            </footer>
        </div>
    );
}

/* eslint-enable react/jsx-no-bind */
