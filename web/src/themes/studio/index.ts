import { buildCustomColorScheme } from '../utils';

/** Studio palette, registered with Jellyfin 12's theme system. */
const studio = buildCustomColorScheme({
    palette: {
        background: { default: '#090b0e', paper: '#141518' },
        primary: { main: '#8e203b', light: '#f39aaa', contrastText: '#fff' },
        secondary: { main: '#f39aaa' },
        text: { primary: '#f4f1f2', secondary: '#aaa4a8' },
        AppBar: { defaultBg: '#141518' }
    }
});

export default studio;
