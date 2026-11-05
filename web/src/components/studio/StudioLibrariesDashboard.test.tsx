import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudioLibrariesDashboard from './StudioLibrariesDashboard';

const mocks = vi.hoisted(() => ({ query: vi.fn(), scan: vi.fn() }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => mocks.query(options) }));
vi.mock('hooks/useApi', () => ({ useApi: () => ({ api: { basePath: 'https://test.example' }, user: { Id: 'admin', Policy: { IsAdministrator: true } } }) }));
vi.mock('components/refreshdialog/refreshdialog', () => ({ default: class {
    show() {
        mocks.scan();
        return Promise.resolve();
    }
} }));
vi.mock('lib/jellyfin-apiclient', () => ({ ServerConnections: { currentApiClient: () => ({ serverId: () => 'server' }) } }));
vi.mock('./studioApi', () => ({ request: vi.fn() }));
vi.mock('@jellyfin/sdk/lib/utils/api/system-api', () => ({ getSystemApi: vi.fn() }));

let host: HTMLDivElement;
let root: Root;
let response: { data?: unknown; isError: boolean; isPending: boolean };
const folder = { ItemId: 'movies', Name: 'Películas', Locations: ['/media/movies'] };
const onAdd = vi.fn();
const onManage = vi.fn();
beforeEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
    response = { data: { Libraries: [{ ItemId: 'movies', TitleCount: 3, MovieCount: 3, SeriesCount: 0, EpisodeCount: 0, IndexedBytes: 1073741824, UnknownSizeCount: 1, AddedWeek: 2, AddedToday: 1, AddedDaily: [0, 0, 0, 0, 0, 1, 1], IdentifiedCount: 2 }] }, isError: false, isPending: false };
    mocks.query.mockImplementation((options: { queryKey: string[] }) => options.queryKey[0] === 'SystemStorage' ? { data: { Libraries: [] }, isError: false, isPending: false } : response);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
});
afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.clearAllMocks();
});
async function render(folders = [folder]) {
    await act(async () => root.render(<StudioLibrariesDashboard folders={folders} onAdd={onAdd} onManage={onManage} />));
}
describe('Library dashboard', () => {
    it('labels partial sizes and missing identification without claiming health', async () => {
        await render();
        expect(host.textContent).toContain('≥ 1.0 GB');
        expect(host.textContent).toContain('1 archivos sin tamaño registrado');
        expect(host.textContent).toContain('67%');
        expect(host.textContent).toContain('1 sin identificar');
        expect(host.querySelector('tbody')?.textContent).toContain('/media/movies');
        expect(host.querySelectorAll('.studioLibraryDaily span')).toHaveLength(7);
    });
    it('opens native add, manage and scan actions for the selected library', async () => {
        await render();
        for (const label of ['＋ Añadir biblioteca', 'Gestionar', '⟳ Escanear']) {
            await act(async () => Array.from(host.querySelectorAll('button')).find(button => button.textContent === label)?.click());
        }
        expect(onAdd).toHaveBeenCalledOnce();
        expect(onManage).toHaveBeenCalledWith(folder);
        expect(mocks.scan).toHaveBeenCalledOnce();
    });
    it('reports a failed request without displaying zeroes as measurements', async () => {
        response = { isError: true, isPending: false };
        await render();
        expect(host.querySelector('[role="alert"]')).not.toBeNull();
        expect(host.querySelector('.studioLibraryMetrics strong')?.textContent).toBe('—');
        expect(host.querySelector('.studioLibraryBar')?.children).toHaveLength(0);
    });
    it('shows an empty library state and no invented percentage', async () => {
        response = { data: { Libraries: [] }, isError: false, isPending: false };
        await render([]);
        expect(host.textContent).toContain('Aún no hay bibliotecas');
        expect(host.querySelectorAll('.studioLibraryMetrics strong')[3].textContent).toBe('—');
    });
});
