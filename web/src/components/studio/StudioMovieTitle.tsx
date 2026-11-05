import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';
import { getRemoteImageApi } from '@jellyfin/sdk/lib/utils/api/remote-image-api';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';

import { useApi } from '../../hooks/useApi';

interface StudioMovieTitleProps {
    readonly id?: string | null
    readonly name?: string | null
    readonly logoTag?: string | null
}

/** Reuse library artwork, or download a provider logo on demand without editing metadata. */
export default function StudioMovieTitle({ id, name, logoTag }: StudioMovieTitleProps) {
    const { api, user } = useApi();
    const [failed, setFailed] = useState(false);
    const failLogo = useCallback(() => setFailed(true), []);
    const { data: remoteLogo } = useQuery({
        queryKey: ['StudioSpotlightLogo', api?.basePath, user?.Id, id],
        enabled: !!api && !!user?.Id && !!id && !logoTag,
        staleTime: 24 * 60 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
        queryFn: async ({ signal }) => {
            const response = await getRemoteImageApi(api!).getRemoteImages({
                itemId: id!,
                type: ImageType.Logo,
                limit: 1,
                includeAllLanguages: true
            }, { signal });
            const url = response.data.Images?.[0]?.Url;
            return url && /^https?:\/\//i.test(url) ? url : null;
        }
    });
    const localLogo = api && id && logoTag ? getImageApi(api).getItemImageUrlById(id, ImageType.Logo, {
        tag: logoTag,
        maxWidth: 800,
        quality: 90
    }) : undefined;
    const url = !failed && (localLogo || remoteLogo);

    return (
        <h1 className={`studioHero-title${url ? ' studioHero-titleWithLogo' : ''}`}>
            {url ? <img className='studioHero-logo' src={url} alt={name || ''} referrerPolicy='no-referrer' onError={failLogo} /> : name}
        </h1>
    );
}
