import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';

import { useApi } from '../../hooks/useApi';
import { appRouter } from '../router/appRouter';
import globalize from '../../lib/globalize';

import './studioHome.scss';

/** A library-backed, manually controlled spotlight above the user's existing sections. */
export default function StudioHome() {
    const { api, user } = useApi();
    const [ selected, setSelected ] = useState(0);
    const [ imageFailed, setImageFailed ] = useState(false);
    const [ playing, setPlaying ] = useState(false);
    const [ playError, setPlayError ] = useState(false);
    const { data, isPending, isError, refetch } = useQuery({
        queryKey: [ 'StudioSpotlight', api?.basePath, user?.Id ],
        enabled: !!api && !!user?.Id,
        staleTime: 60000,
        refetchOnWindowFocus: false,
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                recursive: true,
                includeItemTypes: [ BaseItemKind.Movie ],
                sortBy: [ ItemSortBy.DateCreated ],
                sortOrder: [ SortOrder.Descending ],
                fields: [ ItemFields.Overview, ItemFields.Genres ],
                limit: 6,
                imageTypeLimit: 1,
                enableImageTypes: [ ImageType.Backdrop, ImageType.Primary ]
            }, { signal });
            return response.data.Items || [];
        }
    });
    const items = data || [];
    const activeIndex = Math.min(selected, Math.max(items.length - 1, 0));
    const item = items[activeIndex];

    useEffect(() => {
        setImageFailed(false);
        setPlayError(false);
    }, [ item?.Id ]);

    const retry = useCallback(() => {
        refetch().catch(console.error);
    }, [ refetch ]);
    const failImage = useCallback(() => setImageFailed(true), []);
    const previous = useCallback(() => setSelected((activeIndex + items.length - 1) % items.length), [ activeIndex, items.length ]);
    const next = useCallback(() => setSelected((activeIndex + 1) % items.length), [ activeIndex, items.length ]);
    const select = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setSelected(Number(event.currentTarget.dataset.index));
    }, []);
    const play = useCallback(async () => {
        if (!item) return;
        setPlaying(true);
        setPlayError(false);
        try {
            const { playbackManager } = await import('../playback/playbackmanager');
            await playbackManager.play({
                items: [{ ...item, ServerId: user?.ServerId }],
                startPositionTicks: item.UserData?.PlaybackPositionTicks || 0
            });
        } catch (error) {
            console.error('Studio spotlight playback failed', error);
            setPlayError(true);
        } finally {
            setPlaying(false);
        }
    }, [ item, user?.ServerId ]);

    if (isPending) {
        return <div className='studioHeroSkeleton' aria-busy='true' />;
    }
    if (isError) {
        return (
            <div className='studioSpotlightError'>
                <p>{globalize.translate('MessageUnableToConnectToServer')}</p>
                <button className='studioAction studioAction-secondary' onClick={retry}>
                    {globalize.translate('Retry')}
                </button>
            </div>
        );
    }
    // An empty or movie-free library keeps Jellyfin's existing home/empty state.
    if (!item || !api) return null;

    const tag = item.BackdropImageTags?.[0];
    const imageType = tag ? ImageType.Backdrop : ImageType.Primary;
    const imageTag = tag || item.ImageTags?.Primary;
    const imageUrl = item.Id && imageTag ? getImageApi(api).getItemImageUrlById(item.Id, imageType, {
        tag: imageTag,
        maxWidth: 1920,
        quality: 90
    }) : undefined;
    const details = appRouter.getRouteUrl({ ...item, ServerId: user?.ServerId });

    return (
        <section className='studioHero' aria-label={globalize.translate('HeaderLatestMedia')}>
            {imageUrl && !imageFailed && (
                <img className='studioHero-art' src={imageUrl} alt='' onError={failImage} />
            )}
            <div className='studioHero-content'>
                <p className='studioHero-eyebrow'>
                    <span className='studioHero-marker' aria-hidden='true' />
                    {globalize.translate('HeaderLatestMedia')}
                </p>
                <h1 className='studioHero-title'>{item.Name}</h1>
                <div className='studioHero-metadata'>
                    {!!item.CommunityRating && <span className='studioHero-rating'>★ {item.CommunityRating.toFixed(1)}</span>}
                    {!!item.ProductionYear && <span>{item.ProductionYear}</span>}
                    {item.OfficialRating && <span className='studioHero-certificate'>{item.OfficialRating}</span>}
                    {!!item.Genres?.length && <span>{item.Genres.slice(0, 2).join(' · ')}</span>}
                </div>
                {item.Overview && <p className='studioHero-overview'>{item.Overview}</p>}
                <div className='studioHero-actions'>
                    <button className='studioAction studioAction-primary' disabled={playing} onClick={play}>
                        <span className='material-icons' aria-hidden='true'>play_arrow</span>
                        {globalize.translate(item.UserData?.PlaybackPositionTicks ? 'ButtonResume' : 'Play')}
                    </button>
                    <a className='studioAction studioAction-secondary' href={details}>
                        <span className='material-icons' aria-hidden='true'>info_outline</span>
                        {globalize.translate('ButtonInfo')}
                    </a>
                </div>
                {playError && <p className='studioHero-playError' role='alert'>{globalize.translate('HeaderPlaybackError')}: <a href={details}>{globalize.translate('ItemDetails')}</a></p>}
            </div>
            {items.length > 1 && (
                <div className='studioHero-carousel' aria-label={globalize.translate('HeaderLatestMedia')}>
                    <button className='studioHero-arrow' aria-label={globalize.translate('Previous')} onClick={previous}>
                        <span className='material-icons' aria-hidden='true'>chevron_left</span>
                    </button>
                    <div className='studioHero-pages'>
                        {items.map((entry, index) => (
                            <button key={entry.Id} className='studioHero-page' data-index={index} aria-label={entry.Name || String(index + 1)} aria-pressed={index === activeIndex} onClick={select} />
                        ))}
                    </div>
                    <button className='studioHero-arrow' aria-label={globalize.translate('Next')} onClick={next}>
                        <span className='material-icons' aria-hidden='true'>chevron_right</span>
                    </button>
                </div>
            )}
        </section>
    );
}
