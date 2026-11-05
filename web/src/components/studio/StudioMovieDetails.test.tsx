import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StudioMovieDetails from './StudioMovieDetails';

const settings = vi.hoisted(() => ({ theme: 'studio' }));
vi.mock('hooks/useUserTheme', () => ({ useUserTheme: () => settings }));
vi.mock('lib/globalize', () => ({ default: { translate: (key: string) => key } }));

let page: HTMLDivElement;
let root: Root;
let original: Element;
let content: Element;
const movie: BaseItemDto = { Id: 'movie-one', Name: 'A real library title', Taglines: ['A tagline'], CriticRating: 78, CommunityRating: 8.5, ProductionYear: 2026, RunTimeTicks: 145 * 600000000, Genres: ['Acción', 'Aventura'], Overview: '<script>unsafe()</script>A synopsis', OfficialRating: 'CL-TE+7' };

beforeEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
    settings.theme = 'studio';
    page = document.createElement('div');
    page.innerHTML = '<div class="detailPagePrimaryContainer"><div class="studioMovieSummaryHost"></div><div class="detailPagePrimaryContent"><form class="trackSelections"><select><option>Original track</option></select></form><p>Native credits</p></div></div><details><div class="studioMovieExtraDetailsContent"></div></details>';
    document.body.append(page);
    original = page.querySelector('.detailPagePrimaryContainer')!;
    content = page.querySelector('.detailPagePrimaryContent')!;
    root = createRoot(page.querySelector('.studioMovieSummaryHost')!);
});

afterEach(async () => {
    await act(async () => root.unmount());
    page.remove();
});

describe('Studio movie detail summary', () => {
    it('renders available facts without pretending community votes are an audience percentage', async () => {
        await act(async () => root.render(<StudioMovieDetails item={movie} page={page} />));
        expect(page.querySelector('h1')?.textContent).toBe(movie.Name);
        expect(page.querySelector('.studioMovieRatings')?.textContent).toContain('Crítica 78%');
        expect(page.querySelector('.studioMovieRatings')?.textContent).toContain('Comunidad 8.5/10');
        expect(page.textContent).not.toContain('Audiencia');
        expect(page.querySelector('.studioMovieFacts')?.textContent).toContain('2h 25m');
        expect(page.querySelector('.studioMovieSynopsis')?.textContent).toBe('A synopsis');
        expect(page.querySelector('script')).toBeNull();
    });

    it('preserves the native content and selections when reorganizing the layout and changing theme', async () => {
        await act(async () => root.render(<StudioMovieDetails item={movie} page={page} />));
        expect(content.parentElement?.className).toBe('studioMovieExtraDetailsContent');
        expect(page.querySelector('select')?.value).toBe('Original track');
        settings.theme = 'dark';
        await act(async () => root.render(<StudioMovieDetails item={movie} page={page} />));
        expect(content.parentElement).toBe(original);
        expect(page.querySelector('.studioMovieSummary')).toBeNull();
        expect(page.querySelector('select')?.value).toBe('Original track');
    });

    it('shows a different movie with missing ratings without placeholders or data from the first movie', async () => {
        await act(async () => root.render(<StudioMovieDetails item={movie} page={page} />));
        await act(async () => root.render(<StudioMovieDetails item={{ Id: 'two', Name: 'Another movie' }} page={page} />));
        expect(page.querySelector('h1')?.textContent).toBe('Another movie');
        expect(page.querySelector('.studioMovieRatings')?.textContent).toBe('');
        expect(page.querySelector('.studioMovieFacts')?.textContent).toBe('');
        expect(page.querySelector('.studioMovieTagline')).toBeNull();
    });
});
