import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { client, readPreferences, request, studioKeys } from './studioApi';
import { channelItems, parseChannels, legacyLineup } from './channelSchedule';

export interface StudioChannel {
    Id: string
    Name: string
    Number: number
    Kind: 'genre' | 'series'
    Value: string
    LibraryId: string
    Category: string
    Enabled: boolean
}
export interface ChannelConfig {
    Configured: boolean
    Enabled: boolean
    GuideHours: number
    Channels: StudioChannel[]
}
export function useChannelConfig() {
    const { api, user } = useApi();
    const config = useQuery({ queryKey: ['StudioChannelConfig', api?.basePath], queryFn: () => request<ChannelConfig>('Studio/Channels'), enabled: !!api && !!user?.Id, refetchInterval: 60000 });
    const preferences = useQuery({ queryKey: ['StudioPreferences', user?.Id], queryFn: readPreferences, enabled: !!user?.Id && config.data?.Configured === false });
    const lineup = config.data?.Configured ? config.data.Channels : legacyLineup(parseChannels(preferences.data?.CustomPrefs?.[studioKeys.channels]));
    return { ...config, lineup, isPending: config.isPending || (config.data?.Configured === false && preferences.isPending) };
}
export async function fetchChannelItems(userId: string, channel: StudioChannel) {
    const all: BaseItemDto[] = [];
    let total = 0;
    do {
        const result = await client().getItems(userId, { Recursive: true, IncludeItemTypes: channel.Kind === 'series' ? 'Episode' : 'Movie', Genres: channel.Kind === 'genre' ? channel.Value : undefined, ParentId: channel.Kind === 'series' ? channel.Value : channel.LibraryId || undefined, Fields: 'Overview,Genres', SortBy: 'SortName', Limit: 200, StartIndex: all.length });
        all.push(...(result.Items || []));
        total = result.TotalRecordCount || 0;
        if (!result.Items?.length) break;
    } while (all.length < total);
    return channelItems(all, channel.Kind === 'series');
}
export async function fetchVisibleSeries(userId: string) {
    const items: BaseItemDto[] = [];
    let total = 0;
    do {
        const page = await client().getItems(userId, { Recursive: true, IncludeItemTypes: 'Series', Limit: 200, StartIndex: items.length });
        items.push(...(page.Items || []));
        total = page.TotalRecordCount || 0;
        if (!page.Items?.length) break;
    } while (items.length < total);
    return items.map(item => item.Id).filter((id): id is string => !!id);
}

export function useChannelCatalog(channels: StudioChannel[], enabled = true) {
    const { api, user } = useApi();
    const allLibraries = user?.Policy?.EnableAllFolders === true;
    const permittedLibraries = user?.Policy?.EnabledFolders || [];
    const needsViews = channels.some(channel => channel.Kind === 'genre' && channel.LibraryId && !allLibraries && !permittedLibraries.includes(channel.LibraryId));
    const needsSeries = channels.some(channel => channel.Kind === 'series');
    const views = useQuery({ queryKey: ['StudioChannelViews', api?.basePath, user?.Id], queryFn: () => client().getUserViews({}, user!.Id!), enabled: !!user?.Id && enabled && needsViews, refetchInterval: 60000 });
    const series = useQuery({ queryKey: ['StudioChannelVisibleSeries', api?.basePath, user?.Id], queryFn: () => fetchVisibleSeries(user!.Id!), enabled: !!user?.Id && enabled && needsSeries, refetchInterval: 60000 });
    const libraryIds = views.data?.Items?.map(item => item.Id) || [];
    const seriesIds = series.data || [];
    return useQueries({ queries: channels.map(channel => {
        const needsLibrary = channel.Kind === 'genre' && !!channel.LibraryId;
        const verifyLibrary = needsLibrary && !allLibraries && !permittedLibraries.includes(channel.LibraryId);
        const needsVisibility = channel.Kind === 'series';
        const pending = (verifyLibrary && views.isPending) || (needsVisibility && series.isPending);
        const failed = (verifyLibrary && views.isError) || (needsVisibility && series.isError);
        const allowed = (!verifyLibrary || libraryIds.includes(channel.LibraryId)) && (!needsVisibility || seriesIds.includes(channel.Value));
        return {
            queryKey: ['StudioChannelCatalog', api?.basePath, user?.Id, channel.Kind, channel.Value, channel.LibraryId, allLibraries, permittedLibraries.join(','), libraryIds.join(','), seriesIds.join(',')],
            queryFn: () => {
                if (failed) throw new Error('No se pudo comprobar el acceso a la biblioteca.');
                return allowed ? fetchChannelItems(user!.Id!, channel) : Promise.resolve([]);
            },
            enabled: !!user?.Id && enabled && !!channel.Value && !pending,
            staleTime: 60000,
            refetchInterval: 120000
        };
    }) });
}
export function useChannelGenres() {
    const { api, user } = useApi();
    return useQuery({ queryKey: ['StudioChannelGenres', api?.basePath, user?.Id], queryFn: () => client().getJSON(client().getUrl('Genres', { UserId: user!.Id, Recursive: true, IncludeItemTypes: 'Movie' })) as Promise<{ Items?: BaseItemDto[] }>, enabled: !!user?.Id });
}
export function channelTime(time: number) {
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
export async function tuneChannel(channel: StudioChannel, items: BaseItemDto[]) {
    const { channelSchedule } = await import('./channelSchedule');
    const current = channelSchedule(items, Date.now(), channel.Kind === 'series')[0];
    if (!current) throw new Error('Sin contenido con duración');
    const ordered = channelItems(items, channel.Kind === 'series');
    const index = ordered.findIndex(item => item.Id === current.item.Id);
    const queue = [...ordered.slice(index), ...ordered.slice(0, index)];
    const { playbackManager } = await import('components/playback/playbackmanager');
    await playbackManager.play({ items: queue.map(item => ({ ...item, ServerId: client().serverId(), playOptions: { autoPlayQueue: true } })), startPositionTicks: current.offsetTicks, autoPlayQueue: true });
    playbackManager.setRepeatMode('RepeatAll');
}
