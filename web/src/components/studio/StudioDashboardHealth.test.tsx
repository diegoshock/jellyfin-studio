import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StudioDashboardHealth from './StudioDashboardHealth';

const mocks = vi.hoisted(() => ({ query: vi.fn(), admin: true }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => mocks.query(options) }));
vi.mock('hooks/useApi', () => ({ useApi: () => ({ api: { basePath: 'https://test.example' }, user: { Id: 'admin-one', Policy: { IsAdministrator: mocks.admin } } }) }));
vi.mock('./studioApi', () => ({ client: vi.fn(), request: vi.fn() }));
vi.mock('@jellyfin/sdk/lib/utils/api/system-api', () => ({ getSystemApi: vi.fn() }));

let root: Root;
let host: HTMLDivElement;
const health = { CpuPercent: 4, MemoryUsedBytes: 1073741824, MemoryLimitBytes: 2147483648, ProcessorCount: 4, SampledAt: '2026-11-05T12:00:00Z', NetworkReceivedBytes: 1000, NetworkSentBytes: 2000 };
const responses: Record<string, unknown> = {};

beforeEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
    mocks.admin = true;
    for (const key of Object.keys(responses)) delete responses[key];
    responses.StudioDashboardHealth = { data: health, isPending: false, isError: false };
    responses.StudioSessions = { data: [{ NowPlayingItem: { Name: 'Playing' }, PlayState: { PlayMethod: 'DirectPlay' } }], isPending: false, isError: false };
    responses.StudioTasks = { data: [{ Key: 'RefreshLibrary', State: 'Idle' }], isPending: false, isError: false };
    responses.SystemStorage = { data: { ProgramDataFolder: { DeviceId: 'disk', Path: '/config', FreeSpace: 900, UsedSpace: 100 } }, isPending: false, isError: false };
    responses.StudioEncoding = { data: { HardwareAccelerationType: 'vaapi' }, isPending: false, isError: false };
    mocks.query.mockImplementation((options: { queryKey: string[] }) => responses[options.queryKey[0]]);
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
    await act(async () => root.render(<MemoryRouter><StudioDashboardHealth /></MemoryRouter>));
}

describe('Unified dashboard health', () => {
    it('shows measured values and waits for the second network sample', async () => {
        await render();
        expect(host.querySelector('h1')?.textContent).toBe('Dashboard');
        expect(host.querySelector('.studioCpuCard .studioMonitorValue')?.textContent).toBe('4.0%');
        expect(host.querySelector('.studioStreamsCard .studioMonitorValue')?.textContent).toBe('1');
        expect(host.querySelector('.studioStreamsCard')?.textContent).toContain('1 direct play');
        expect(host.querySelector('.studioNetworkValues')?.textContent).toContain('—');
        expect(host.querySelector('.studioCpuCard .studioChartLine')).toBeNull();
        responses.StudioDashboardHealth = { data: { ...health, SampledAt: '2026-11-05T12:00:05Z', NetworkReceivedBytes: 1251000 }, isPending: false, isError: false };
        await render();
        expect(host.querySelector('.studioNetworkValues')?.textContent).toContain('2.00');
        expect(host.querySelector('.studioCpuCard .studioChartLine')).not.toBeNull();
    });

    it('pauses all metric polling with the live control', async () => {
        await render();
        await act(async () => (host.querySelector('.studioLiveControl') as HTMLButtonElement).click());
        expect(host.querySelector('.studioLiveControl')?.textContent).toBe('Pausado');
        const options = mocks.query.mock.calls.map(call => call[0]);
        expect(options.filter(option => option.queryKey[0] === 'StudioDashboardHealth').at(-1).refetchInterval).toBe(false);
        expect(options.filter(option => option.queryKey[0] === 'SystemStorage').at(-1).refetchInterval).toBe(false);
    });

    it('does not manufacture idle or zero values when endpoints are unavailable', async () => {
        responses.StudioDashboardHealth = { isPending: false, isError: true };
        responses.StudioSessions = { isPending: false, isError: true };
        responses.StudioTasks = { isPending: false, isError: true };
        responses.SystemStorage = { isPending: false, isError: true };
        await render();
        expect(host.querySelector('.studioCpuCard .studioMonitorValue')?.textContent).toBe('—%');
        expect(host.querySelector('.studioStreamsCard')?.textContent).toContain('No disponible');
        expect(host.querySelector('.studioStreamsCard')?.textContent).not.toContain('En espera');
        expect(host.querySelectorAll('.studioChartLine')).toHaveLength(0);
        expect(host.querySelectorAll('.studioStorageVolume')).toHaveLength(0);
    });

    it('does not enable health queries for non-administrators', async () => {
        mocks.admin = false;
        await render();
        expect(host.querySelector('.studioDashboardMonitor')).toBeNull();
        expect(host.textContent).toContain('Solo los administradores');
        expect(mocks.query.mock.calls.every(call => call[0].enabled === false)).toBe(true);
    });
});
