import { afterEach, describe, expect, it } from 'vitest';

import { ThemeStorageManager as createThemeStorageManager } from './themeStorageManager';

afterEach(() => {
    delete document.documentElement.dataset.theme;
});

describe('Studio theme initialization', () => {
    it('uses Studio before a legacy theme is selected', () => {
        const storage = createThemeStorageManager({ key: 'mui-color-scheme-dark' });
        expect(storage.get('dark')).toBe('studio');
    });

    it('preserves an already selected legacy theme when React mounts', () => {
        document.documentElement.dataset.theme = 'purplehaze';
        const storage = createThemeStorageManager({ key: 'mui-color-scheme-dark' });
        expect(storage.get('dark')).toBe('purplehaze');
    });

    it('keeps mode initialization separate from color scheme initialization', () => {
        const storage = createThemeStorageManager({ key: 'mui-mode' });
        expect(storage.get('dark')).toBe('dark');
    });
});
