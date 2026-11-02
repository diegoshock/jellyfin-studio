import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import { ServerConnections } from 'lib/jellyfin-apiclient';

export function client() {
    const api = ServerConnections.currentApiClient();
    if (!api) throw new Error('No hay conexión con el servidor');
    return api;
}

export async function request<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
    const api = client();
    if (method === 'GET') return api.getJSON(api.getUrl(path));
    return api.ajax({
        url: api.getUrl(path),
        type: method,
        data: data === undefined ? undefined : JSON.stringify(data),
        contentType: 'application/json'
    });
}

export function image(item: BaseItemDto, backdrop = false) {
    const type = backdrop && item.BackdropImageTags?.length ? 'Backdrop' : 'Primary';
    if (!item.Id || !(type === 'Backdrop' ? item.BackdropImageTags?.length : item.ImageTags?.Primary)) return undefined;
    return client().getScaledImageUrl(item.Id, {
        type,
        maxWidth: backdrop ? 1920 : 400,
        tag: type === 'Backdrop' ? item.BackdropImageTags?.[0] : item.ImageTags?.Primary
    });
}

export const studioKeys = {
    channels: 'studio.channels',
    avatar: 'studio.avatar'
};

export async function readPreferences() {
    return client().getDisplayPreferences('studio', client().getCurrentUserId(), 'studio');
}

export async function savePreference(key: string, value: string) {
    const prefs = await readPreferences();
    prefs.CustomPrefs = { ...prefs.CustomPrefs, [key]: value };
    await client().updateDisplayPreferences('studio', prefs, client().getCurrentUserId(), 'studio');
}

export async function playItem(item: BaseItemDto, ticks = 0) {
    const { playbackManager } = await import('components/playback/playbackmanager');
    await playbackManager.play({ items: [{ ...item, ServerId: client().serverId() }], startPositionTicks: ticks });
}
