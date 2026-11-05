import React, { act, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import StudioAdminDrawer from './StudioAdminDrawer';

vi.mock('components/studio/StudioSettingsSearch', () => ({ default: () => null }));
vi.mock('./sections/PluginDrawerSection', () => ({ default: () => null }));
vi.mock('components/ListItemLink', () => ({ default: ({ to, selected, children }: PropsWithChildren<{ to: string; selected: boolean }>) => <a href={to} aria-current={selected ? 'page' : undefined}>{children}</a> }));

it.each(['/dashboard', '/dashboard/health', '/dashboard/activity', '/dashboard/devices'])('uses one Dashboard entry for %s', async (path) => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
        await act(async () => root.render(<MemoryRouter initialEntries={[path]}><StudioAdminDrawer /></MemoryRouter>));
        const links = host.querySelectorAll('section:first-of-type a');
        expect(links).toHaveLength(1);
        expect(links[0].textContent).toContain('Dashboard');
        expect(links[0].getAttribute('href')).toBe('/dashboard');
        expect(links[0].getAttribute('aria-current')).toBe('page');
        expect(host.querySelector('a[href="/dashboard/health"]')).toBeNull();
        expect(host.querySelector('a[href="/dashboard/activity"]')).toBeNull();
        expect(host.querySelector('a[href="/dashboard/devices"]')).toBeNull();
    } finally {
        await act(async () => root.unmount());
        host.remove();
    }
});
