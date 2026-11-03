import AppBar, { type AppBarProps } from '@mui/material/AppBar';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import React, { useLayoutEffect, useRef, useState, type FC, type PropsWithChildren } from 'react';
import ResizeObserver from 'resize-observer-polyfill';

import { useUserTheme } from 'hooks/useUserTheme';

/** The default height of an AppBar. */
const DEFAULT_APP_BAR_HEIGHT = 64;
/** The height of a dense AppBar. */
const DENSE_APP_BAR_HEIGHT = 48;

interface OffsetAppBarProps extends AppBarProps {
    /** Use the dense variant of the AppBar, which has a smaller default height. */
    dense?: boolean;
    /** The elevation to apply when the user has scrolled. Defaults to 1. */
    elevation?: number;
}

/**
 * AppBar wrapper with a fixed position and a spacer to prevent content from rendering underneath.
 */
const OffsetAppBar: FC<PropsWithChildren<OffsetAppBarProps>> = ({
    children,
    dense = false,
    elevation = 1,
    ...props
}) => {
    const { theme } = useUserTheme();
    const isStudio = theme === 'studio';
    const appBarRef = useRef<HTMLHtmlElement>(null);
    const [height, setHeight] = useState(dense ? DENSE_APP_BAR_HEIGHT : DEFAULT_APP_BAR_HEIGHT);

    const scrollTrigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 0
    });

    useLayoutEffect(() => {
        const el = appBarRef.current;
        if (!el) return;

        // Set initial measured height
        const updateHeight = () => {
            const measuredHeight = Math.ceil(el.getBoundingClientRect().height || 0);
            setHeight(measuredHeight);
            if (isStudio) document.documentElement.style.setProperty('--studio-header-height', `${measuredHeight}px`);
        };

        updateHeight();

        // Use ResizeObserver for dynamic changes
        let frame = 0;
        const observer = new ResizeObserver(() => {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(updateHeight);
        });
        observer.observe(el);
        // Update on window resize as a fallback
        window.addEventListener('resize', updateHeight);

        return () => {
            observer.disconnect();
            window.cancelAnimationFrame(frame);
            if (isStudio) document.documentElement.style.removeProperty('--studio-header-height');
            window.removeEventListener('resize', updateHeight);
        };
    }, [isStudio]);

    return (
        <>
            <AppBar
                {...props}
                ref={appBarRef}
                position='fixed'
                className={[props.className, isStudio && 'studioTopBar'].filter(Boolean).join(' ')}
                color={!isStudio && scrollTrigger ? 'default' : 'transparent'}
                elevation={!isStudio && scrollTrigger ? elevation : 0}
            >
                {children}
            </AppBar>
            {/* Spacer to prevent content rendering under the AppBar */}
            <div
                aria-hidden='true'
                className='appBarSpacer'
                style={{
                    height,
                    width: '100%',
                    flexShrink: 0
                }}
            />
        </>
    );
};

export default OffsetAppBar;
