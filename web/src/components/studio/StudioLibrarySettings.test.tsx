import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudioLibrarySettings from './StudioLibrarySettings';

const mocks = vi.hoisted(() => ({ embed: vi.fn(), save: vi.fn(), invalidate: vi.fn() }));
vi.mock('components/libraryoptionseditor/libraryoptionseditor', () => ({ default: {
    embed: (...args: unknown[]) => mocks.embed(...args),
    getLibraryOptions: (element: HTMLElement) => ({ Enabled: element.querySelector<HTMLInputElement>('input')?.checked })
} }));
vi.mock('components/directorybrowser/directorybrowser', () => ({ default: class {} }));
vi.mock('components/ConfirmDialog', () => ({ default: () => null }));
vi.mock('apps/dashboard/features/libraries/components/LibraryCard', () => ({ default: () => null }));
vi.mock('apps/dashboard/features/libraries/api/invalidateVirtualFolders', () => ({ invalidateVirtualFolders: (...args: unknown[]) => mocks.invalidate(...args) }));
vi.mock('hooks/useApi', () => ({ useApi: () => ({ user: { Id: 'admin' } }) }));
vi.mock('./studioApi', () => ({ client: () => ({ updateVirtualFolderOptions: (...args: unknown[]) => mocks.save(...args) }) }));
const first = { ItemId: 'movies', Name: 'Movies', LibraryOptions: { Enabled: true, PreferredMetadataLanguage: 'es', TypeOptions: [{ Type: 'Movie' }] }, Locations: ['/movies'] };
const second = { ItemId: 'series', Name: 'Series', LibraryOptions: { Enabled: true, PreferredMetadataLanguage: 'en', TypeOptions: [{ Type: 'Series' }] }, Locations: ['/series'] };
let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
    mocks.embed.mockImplementation((element: HTMLElement) => {
        element.innerHTML = '<input type="checkbox" checked />';
        return Promise.resolve();
    });
    mocks.save.mockResolvedValue(undefined);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
});
afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.resetAllMocks();
});
async function render() {
    await act(async () => root.render(<><StudioLibrarySettings folder={{ ...first }} /><StudioLibrarySettings folder={{ ...second }} /></>));
}
async function submit(index = 0) {
    await act(async () => host.querySelectorAll('form')[index].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
describe('Inline library settings', () => {
    it('loads both editors immediately with separate identities and preserves unsaved edits on refetch', async () => {
        await render();
        expect(mocks.embed).toHaveBeenCalledTimes(2);
        expect(mocks.embed.mock.calls[0][3]).not.toBe(mocks.embed.mock.calls[1][3]);
        const input = host.querySelector<HTMLInputElement>('input')!;
        input.checked = false;
        await render();
        expect(mocks.embed).toHaveBeenCalledTimes(2);
        expect(input.checked).toBe(false);
    });
    it('saves only the selected library and preserves its existing options', async () => {
        await render();
        host.querySelector<HTMLInputElement>('input')!.checked = false;
        await submit();
        expect(mocks.save).toHaveBeenCalledWith('movies', { ...first.LibraryOptions, Enabled: false });
        expect(mocks.save).toHaveBeenCalledTimes(1);
        expect(host.textContent).toContain('Cambios guardados');
        expect(host.querySelectorAll<HTMLInputElement>('input')[1].checked).toBe(true);
    });
    it('keeps edits available after a failed save', async () => {
        await render();
        host.querySelector<HTMLInputElement>('input')!.checked = false;
        mocks.save.mockRejectedValueOnce(new Error('offline'));
        await submit();
        expect(host.querySelector('[role="alert"]')?.textContent).toContain('No se pudieron guardar');
        expect(host.querySelector<HTMLInputElement>('input')!.checked).toBe(false);
        expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
        await submit();
        expect(mocks.save).toHaveBeenCalledTimes(2);
    });
    it('prevents saving when settings fail to load', async () => {
        mocks.embed.mockRejectedValue(new Error('offline'));
        await render();
        expect(host.querySelector('[role="alert"]')?.textContent).toContain('No se pudieron cargar');
        expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
        await submit();
        expect(mocks.save).not.toHaveBeenCalled();
    });
});
