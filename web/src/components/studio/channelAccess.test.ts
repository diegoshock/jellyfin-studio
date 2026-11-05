import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChannelCatalog, type StudioChannel } from './channelData';

const mocks = vi.hoisted(() => ({ query: vi.fn(), queries: vi.fn(), items: vi.fn(), policy: {} as { EnableAllFolders?: boolean; EnabledFolders?: string[] } }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (...args: unknown[]) => mocks.query(...args), useQueries: (...args: unknown[]) => mocks.queries(...args) }));
vi.mock('hooks/useApi', () => ({ useApi: () => ({ api: { basePath: 'server' }, user: { Id: 'restricted-user', Policy: mocks.policy } }) }));
vi.mock('./studioApi', () => ({ client: () => ({ getItems: (...args: unknown[]) => mocks.items(...args) }), readPreferences: vi.fn(), request: vi.fn(), studioKeys: {} }));
const channel: StudioChannel = { Id: 'a', Name: 'Movies', Number: 401, Kind: 'genre', Value: 'Action', LibraryId: 'private-library', Category: 'Films', Enabled: true };
let views: { data?: { Items: { Id: string }[] }; isPending: boolean; isError: boolean };
let series: { data?: string[]; isPending: boolean; isError: boolean };
let options: { queries: { enabled: boolean; queryFn: () => Promise<unknown> }[] };
beforeEach(() => {
    vi.resetAllMocks();
    mocks.policy = {};
    views = { data: { Items: [] }, isPending: false, isError: false };
    series = { data: [], isPending: false, isError: false };
    mocks.query.mockImplementation((value: { queryKey: string[] }) => value.queryKey[0] === 'StudioChannelViews' ? views : series);
    mocks.queries.mockImplementation((value: typeof options) => {
        options = value;
        return [];
    });
    mocks.items.mockResolvedValue({ Items: [{ Id: 'movie', RunTimeTicks: 6000000000 }], TotalRecordCount: 1 });
});
describe('Channel catalog authorization', () => {
    it('does not query an explicit library absent from the user views', async () => {
        useChannelCatalog([channel]);
        expect(await options.queries[0].queryFn()).toEqual([]);
        expect(mocks.items).not.toHaveBeenCalled();
    });
    it('does not query episodes when the series is absent from the accessible root catalog', async () => {
        useChannelCatalog([{ ...channel, Kind: 'series', Value: 'private-series', LibraryId: '' }]);
        expect(await options.queries[0].queryFn()).toEqual([]);
        expect(mocks.items).not.toHaveBeenCalled();
    });
    it('waits for the visibility check and fails closed on a failed check', async () => {
        views = { isPending: true, isError: false };
        useChannelCatalog([channel]);
        expect(options.queries[0].enabled).toBe(false);
        views = { isPending: false, isError: true };
        useChannelCatalog([channel]);
        expect(() => options.queries[0].queryFn()).toThrow('No se pudo comprobar');
        expect(mocks.items).not.toHaveBeenCalled();
    });
    it('honors explicit library permissions even when user views are grouped', async () => {
        mocks.policy = { EnableAllFolders: true };
        views = { isPending: true, isError: false };
        useChannelCatalog([channel]);
        expect(options.queries[0].enabled).toBe(true);
        expect(await options.queries[0].queryFn()).toEqual([expect.objectContaining({ Id: 'movie' })]);
        mocks.policy = { EnableAllFolders: false, EnabledFolders: ['private-library'] };
        useChannelCatalog([channel]);
        expect(options.queries[0].enabled).toBe(true);
    });
    it('queries an authorized source using the current user identity', async () => {
        views = { data: { Items: [{ Id: 'private-library' }] }, isPending: false, isError: false };
        useChannelCatalog([channel]);
        expect(await options.queries[0].queryFn()).toEqual([expect.objectContaining({ Id: 'movie' })]);
        expect(mocks.items).toHaveBeenCalledWith('restricted-user', expect.objectContaining({ ParentId: 'private-library', Genres: 'Action' }));
    });
});
