import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StudioHome from './StudioHome';

const mocks = vi.hoisted(() => ({
    query: vi.fn(),
    logoQuery: vi.fn(),
    remoteImages: vi.fn(),
    getItems: vi.fn().mockResolvedValue({ data: { Items: [] } }),
    play: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../hooks/useApi', () => ({ useApi: () => ({ api: { basePath: 'https://media.example' }, user: { Id: 'user-one', ServerId: 'server-one' } }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: { queryKey: string[] }) => options.queryKey[0] === 'StudioSpotlightLogo' ? mocks.logoQuery(options) : mocks.query(options) }));
vi.mock('@jellyfin/sdk/lib/utils/api/remote-image-api', () => ({ getRemoteImageApi: () => ({ getRemoteImages: mocks.remoteImages }) }));
vi.mock('@jellyfin/sdk/lib/utils/api/library-api', () => ({ getLibraryApi: () => ({ getItems: mocks.getItems }) }));
vi.mock('@jellyfin/sdk/lib/utils/api/image-api', () => ({ getImageApi: () => ({ getItemImageUrlById: (_id: string, type: string) => `https://media.example/${type}.png` }) }));
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
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    mocks.getItems.mockResolvedValue({ data: { Items: [] } });
    mocks.logoQuery.mockReturnValue({ data: null });
    mocks.remoteImages.mockResolvedValue({ data: { Images: [{ Url: 'https://image.tmdb.org/logo.png' }] } });
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
        expect(mocks.getItems).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-one', includeItemTypes: ['Movie'], limit: 8, sortBy: ['Random'], enableImageTypes: ['Backdrop', 'Primary', 'Logo'] }), { signal });
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

    it('uses the library logo and falls back to the title if it fails', async () => {
        mocks.query.mockReturnValue({ data: [{ ...films[0], ImageTags: { Logo: 'official-logo' } }], isPending: false, isError: false });
        await render();
        const logo = host.querySelector('.studioHero-logo') as HTMLImageElement;
        expect(logo.alt).toBe('First film');
        expect(logo.src).toContain('/Logo.png');
        await act(async () => logo.dispatchEvent(new Event('error')));
        expect(host.querySelector('.studioHero-logo')).toBeNull();
        expect(host.querySelector('h1')?.textContent).toBe('First film');
    });

    it('rotates every ten seconds, wraps around, and can be paused', async () => {
        vi.useFakeTimers();
        await render();
        await act(async () => vi.advanceTimersByTime(10000));
        expect(host.querySelector('h1')?.textContent).toBe('Second film');
        await act(async () => vi.advanceTimersByTime(10000));
        expect(host.querySelector('h1')?.textContent).toBe('First film');
        await act(async () => (host.querySelector('[aria-label="ButtonPause"]') as HTMLButtonElement).click());
        await act(async () => vi.advanceTimersByTime(20000));
        expect(host.querySelector('h1')?.textContent).toBe('First film');
        await act(async () => (host.querySelector('.studioHero-carousel [aria-label="Play"]') as HTMLButtonElement).click());
        await act(async () => vi.advanceTimersByTime(10000));
        expect(host.querySelector('h1')?.textContent).toBe('Second film');
    });

    it('pauses while keyboard users interact with the hero', async () => {
        vi.useFakeTimers();
        await render();
        await act(async () => (host.querySelector('.studioAction-primary') as HTMLButtonElement).focus());
        await act(async () => vi.advanceTimersByTime(20000));
        expect(host.querySelector('h1')?.textContent).toBe('First film');
        await act(async () => (document.activeElement as HTMLElement).blur());
        await act(async () => vi.advanceTimersByTime(10000));
        expect(host.querySelector('h1')?.textContent).toBe('Second film');
    });

    it('does not auto rotate when reduced motion is requested', async () => {
        vi.useFakeTimers();
        vi.mocked(window.matchMedia).mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
        await render();
        await act(async () => vi.advanceTimersByTime(20000));
        expect(host.querySelector('h1')?.textContent).toBe('First film');
        expect(host.querySelector('.studioHero-carousel [aria-label="Play"]')).not.toBeNull();
    });

    it('pauses in a hidden tab and resumes after it becomes visible', async () => {
        vi.useFakeTimers();
        await render();
        const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        await act(async () => document.dispatchEvent(new Event('visibilitychange')));
        await act(async () => vi.advanceTimersByTime(20000));
        expect(host.querySelector('h1')?.textContent).toBe('First film');
        hidden.mockReturnValue('visible');
        await act(async () => document.dispatchEvent(new Event('visibilitychange')));
        await act(async () => vi.advanceTimersByTime(10000));
        expect(host.querySelector('h1')?.textContent).toBe('Second film');
        hidden.mockRestore();
    });

    it('downloads missing logos from the server image providers without changing library metadata', async () => {
        mocks.logoQuery.mockReturnValue({ data: 'https://image.tmdb.org/logo.png' });
        await render();
        expect(host.querySelector('.studioHero-logo')?.getAttribute('src')).toBe('https://image.tmdb.org/logo.png');
        const { queryFn, enabled } = mocks.logoQuery.mock.calls[0][0];
        expect(enabled).toBe(true);
        const signal = { aborted: false } as AbortSignal;
        expect(await queryFn({ signal })).toBe('https://image.tmdb.org/logo.png');
        expect(mocks.remoteImages).toHaveBeenCalledWith({ itemId: 'first', type: 'Logo', limit: 1, includeAllLanguages: true }, { signal });
    });

    it('does not contact image providers when a local logo exists', async () => {
        mocks.query.mockReturnValue({ data: [{ ...films[0], ImageTags: { Logo: 'local-logo' } }], isPending: false, isError: false });
        await render();
        expect(mocks.logoQuery.mock.calls[0][0].enabled).toBe(false);
        expect(host.querySelector('.studioHero-logo')?.getAttribute('src')).toContain('/Logo.png');
    });
});
