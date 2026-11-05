import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import StudioSettingsSearch from './StudioSettingsSearch';

it('routes health, activity and device searches through the unified Dashboard entry', async () => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
        await act(async () => root.render(<MemoryRouter><StudioSettingsSearch /></MemoryRouter>));
        const input = host.querySelector('input')!;
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        for (const query of ['salud', 'actividad', 'dispositivos']) {
            await act(async () => {
                setValue.call(input, query);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            expect(host.querySelector('a')?.getAttribute('href')).toBe('/dashboard');
            expect(host.querySelector('a')?.textContent).toContain('Dashboard');
            expect(host.querySelector('a[href="/dashboard/health"]')).toBeNull();
        }
    } finally {
        await act(async () => root.unmount());
        host.remove();
    }
});
