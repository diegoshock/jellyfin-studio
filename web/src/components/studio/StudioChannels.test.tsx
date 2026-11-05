import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudioChannels from './StudioChannels';

const mocks = vi.hoisted(() => ({ tune: vi.fn(), enabled: true, empty: false }));
vi.mock('hooks/useApi', () => ({ useApi: () => ({ user: { Id: 'admin', Policy: { IsAdministrator: true } } }) }));
vi.mock('./channelData', async importOriginal => {
    const original = await importOriginal<typeof import('./channelData')>();
    return { ...original, tuneChannel: (...args: unknown[]) => mocks.tune(...args), useChannelConfig: () => ({ data: { Configured: true, Enabled: mocks.enabled, GuideHours: 3 }, lineup: mocks.empty ? [] : [{ Id: 'action', Name: 'Acción', Number: 401, Kind: 'genre', Value: 'Acción', Category: 'Cine', Enabled: true }, { Id: 'comedy', Name: 'Comedia', Number: 402, Kind: 'genre', Value: 'Comedia', Category: 'Comedia', Enabled: true }], isPending: false, isError: false }), useChannelCatalog: () => [{ data: [{ Id: 'a', Name: 'Movie A', RunTimeTicks: 36000000000 }], isPending: false, isError: false }, { data: [{ Id: 'b', Name: 'Movie B', RunTimeTicks: 36000000000 }], isPending: false, isError: false }] };
});
vi.mock('./studioApi', () => ({ image: () => undefined, readPreferences: () => Promise.resolve({ CustomPrefs: {} }), savePreference: vi.fn(), playItem: vi.fn() }));
let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
    mocks.enabled = true;
    mocks.empty = false;
    mocks.tune.mockResolvedValue(undefined);
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
    await act(async () => root.render(<MemoryRouter><StudioChannels /></MemoryRouter>));
}
describe('Tofa-style channel guide', () => {
    it('shows programme rows and moves channel configuration out of the player page', async () => {
        await render();
        expect(host.querySelectorAll('.studioLiveGuideRow')).toHaveLength(2);
        expect(host.querySelectorAll('[role="switch"]')).toHaveLength(0);
        expect(host.querySelector('a[href="/dashboard/channels"]')).not.toBeNull();
        expect(host.textContent).toContain('Movie A');
    });
    it('searches programmes as well as channel names', async () => {
        await render();
        const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Movie B');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(host.querySelectorAll('.studioLiveGuideRow')).toHaveLength(1);
        expect(host.querySelector('.studioLiveGuideChannel')?.textContent).toContain('Comedia');
    });
    it('tunes with the selected channel and its permitted catalog', async () => {
        await render();
        const tune = Array.from(host.querySelectorAll('button')).find(button => button.textContent?.includes('Sintonizar ahora'))!;
        await act(async () => tune.click());
        expect(mocks.tune).toHaveBeenCalledWith(expect.objectContaining({ Id: 'action' }), [expect.objectContaining({ Id: 'a' })]);
    });
    it('hides tuning and explains when channels are globally disabled', async () => {
        mocks.enabled = false;
        await render();
        expect(host.textContent).toContain('Los canales están desactivados');
        expect(host.querySelectorAll('.studioLiveGuideRow')).toHaveLength(0);
        expect(host.textContent).not.toContain('Sintonizar ahora');
    });
});
