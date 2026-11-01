import { StorageManager } from '@mui/material/styles';

import Events, { type Event } from '../utils/events';
import { EventType } from '../constants/eventType';

/**
 * A custom MUI StorageManager.
 *
 * Since we switch the theme based on the current page, we handle getting/setting the current theme via autoTheme +
 * themeManager. We need to implement `subscribe` so MUI is aware of theme changes though otherwise the `useTheme` hook
 * will always return the default theme.
 */
export const ThemeStorageManager: StorageManager = ({ key }) => ({
    // MUI's provider initializes its dark scheme independently of theme.defaultColorScheme.
    // Reuse the active legacy theme so mounting React does not reset it to "dark".
    get: defaultValue => key.endsWith('-dark') ?
        document.documentElement.dataset.theme || 'studio' : defaultValue,
    set: () => { /* no-op */ },
    subscribe: handler => {
        const wrappedHandler = (_e: Event, value: string) => handler(value);
        Events.on(document, EventType.THEME_CHANGE, wrappedHandler);
        return () => Events.off(document, EventType.THEME_CHANGE, wrappedHandler);
    }
});
