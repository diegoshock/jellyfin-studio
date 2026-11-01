import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StudioHome from './StudioHome';

const mocks = vi.hoisted(() => ({
    query: vi.fn(),
    getItems: vi.fn().mockResolvedValue({ data: { Items: [] } }),
    play: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../hooks/useApi', () => ({ useApi: () => ({ api: { basePath: 'https://media.example' }, user: { Id: 'user-one', ServerId: 'server-one' } }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.query }));
vi.mock('@jellyfin/sdk/lib/utils/api/items-api', () => ({ getItemsApi: () => ({ getItems: mocks.getItems }) }));
vi.mock('@jellyfin/sdk/lib/utils/api/image-api', () => ({ getImageApi: () => ({ getItemImageUrlById: () => 'https://media.example/backdrop.jpg' }) }));
vi.mock('../router/appRouter', () => ({ appRouter: { getRouteUrl: (item: { Id: string }) => `#/details?id=${item.Id}` } }));
vi.mock('../../lib/globalize', () => ({ default: { translate: (key: string) => key } }));
vi.mock('../playback/playbackmanager', () => ({ playbackManager: { play: mocks.play } }));

let host: HTMLDivElement;
let root: Root;
const films = [
    { Id: 'first', Name: 'First film', Overview: '<script>unsafe()</script>', ProductionYear: 2026, ImageTags: { Primary: 'image-one' }, UserData: { PlaybackPositionTicks: 50000000 } },
    { Id: 'second', Name: 'Second film', ProductionYear: 2025 }
];

beforeEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
    mocks.getItems.mockResolvedValue({ data: { Items: [] } });
    mocks.play.mockResolvedValue(undefined);
    mocks.refetch.mockResolvedValue(undefined);
    mocks.query.mockReturnValue({ data: films, isPending: false, isError: false, refetch: mocks.refetch });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
});

afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.clearAllMocks();
});

async function render() {
    await act(async () => root.render(<StudioHome />));
}

describe('Studio home spotlight', () => {
    it('does not invent featured content for an empty library', async () => {
        mocks.query.mockReturnValue({ data: [], isPending: false, isError: false });
        await render();
        expect(host.querySelector('.studioHero')).toBeNull();
    });

    it('requests only the current user’s accessible movies', async () => {
        await render();
        const { queryFn } = mocks.query.mock.calls[0][0];
        const signal = { aborted: false } as AbortSignal;
        await queryFn({ signal });
        expect(mocks.getItems).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-one', includeItemTypes: ['Movie'], limit: 6 }), { signal });
    });

    it('switches featured items using the carousel controls', async () => {
        await render();
        expect(host.querySelector('h1')?.textContent).toBe('First film');
        await act(async () => (host.querySelector('[aria-label="Next"]') as HTMLButtonElement).click());
        expect(host.querySelector('h1')?.textContent).toBe('Second film');
        expect(host.querySelector('[aria-label="Second film"]')?.getAttribute('aria-pressed')).toBe('true');
        expect(host.querySelector('.studioAction-secondary')?.getAttribute('href')).toBe('#/details?id=second');
    });

    it('escapes metadata and recovers from an unavailable image', async () => {
        await render();
        expect(host.querySelector('script')).toBeNull();
        await act(async () => host.querySelector('img')?.dispatchEvent(new Event('error')));
        expect(host.querySelector('img')).toBeNull();
        expect(host.querySelector('h1')?.textContent).toBe('First film');
    });

    it('resumes the selected movie through Jellyfin playback', async () => {
        await render();
        await act(async () => (host.querySelector('.studioAction-primary') as HTMLButtonElement).click());
        await vi.waitFor(() => expect(mocks.play).toHaveBeenCalledWith(expect.objectContaining({ startPositionTicks: 50000000, items: [expect.objectContaining({ Id: 'first', ServerId: 'server-one' })] })));
    });

    it('offers a retry when the library request fails', async () => {
        mocks.query.mockReturnValue({ isError: true, isPending: false, refetch: mocks.refetch });
        await render();
        await act(async () => (host.querySelector('button') as HTMLButtonElement).click());
        expect(mocks.refetch).toHaveBeenCalledOnce();
        expect(host.querySelector('.studioHero')).toBeNull();
    });
});
