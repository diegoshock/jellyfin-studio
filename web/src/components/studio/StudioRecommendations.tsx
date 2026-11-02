import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useApi } from 'hooks/useApi';
import { request } from './studioApi';
import StudioCatalog, { Poster } from './StudioCatalog';

type Recommendation = {
    CategoryId?: string;
    BaselineItemName?: string;
    RecommendationType?: string;
    Items?: BaseItemDto[];
};
export default function StudioRecommendations() {
    const { user } = useApi();
    const query = useQuery({
        queryKey: ['StudioRecommendations', user?.Id],
        enabled: !!user?.Id,
        queryFn: () =>
            request<Recommendation[]>('Movies/Recommendations?categoryLimit=4&itemLimit=12&fields=Overview,Genres'),
        staleTime: 300000
    });
    const rows = query.data?.filter((row) => row.Items?.length) || [];
    if (!rows.length) return <StudioCatalog mode='discover' />;
    return (
        <div>
            {rows.map((row) => (
                <section className='studioRecommendationRow' key={row.CategoryId}>
                    <h2>{row.BaselineItemName ? `Si te gustó ${row.BaselineItemName}` : 'Recomendadas para ti'}</h2>
                    <p className='studioMuted'>
                        Sugerencias de Jellyfin basadas en tu actividad y los títulos de tu biblioteca.
                    </p>
                    <div className='studioRecommendationPosters'>
                        {row.Items?.map((item) => (
                            <Poster key={item.Id} item={item} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
