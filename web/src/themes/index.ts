import { createTheme } from '@mui/material/styles';

import { DEFAULT_THEME_OPTIONS } from './_base/theme';
import appletv from './appletv';
import blueradiance from './blueradiance';
import dark from './dark';
import light from './light';
import purplehaze from './purplehaze';
import wmc from './wmc';
import studio from './studio';

/** The default theme containing all color scheme variants. */
const DEFAULT_THEME = createTheme({
    cssVariables: {
        cssVarPrefix: 'jf',
        colorSchemeSelector: '[data-theme="%s"]',
        disableCssColorScheme: true
    },
    defaultColorScheme: 'studio',
    ...DEFAULT_THEME_OPTIONS,
    colorSchemes: {
        studio,
        appletv,
        blueradiance,
        dark,
        light,
        purplehaze,
        wmc
    }
});

export default DEFAULT_THEME;
