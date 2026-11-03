import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import { Link } from 'react-router-dom';
import ArrowBack from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import React, { type FC, type PropsWithChildren, ReactNode } from 'react';

import { appRouter } from 'components/router/appRouter';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';

import UserMenuButton from './UserMenuButton';

interface AppToolbarProps {
    buttons?: ReactNode
    isDrawerAvailable: boolean
    isDrawerOpen: boolean
    onDrawerButtonClick?: (event: React.MouseEvent<HTMLElement>) => void
    isBackButtonAvailable?: boolean
    isUserMenuAvailable?: boolean
    reserveDrawerSpace?: boolean
    className?: string
}

const onBackButtonClick = () => {
    appRouter.back()
        .catch(err => {
            console.error('[AppToolbar] error calling appRouter.back', err);
        });
};

const AppToolbar: FC<PropsWithChildren<AppToolbarProps>> = ({
    buttons,
    children,
    isDrawerAvailable,
    isDrawerOpen,
    onDrawerButtonClick = () => { /* no-op */ },
    isBackButtonAvailable = false,
    isUserMenuAvailable = true,
    reserveDrawerSpace = false,
    className
}) => {
    const { user } = useApi();
    const isUserLoggedIn = Boolean(user);

    return (
        <Toolbar
            variant='dense'
            className={className}
            sx={{
                flexWrap: {
                    xs: 'wrap',
                    lg: 'nowrap'
                }
            }}
        >
            {isUserLoggedIn && (isDrawerAvailable || reserveDrawerSpace) && (
                <Tooltip title={globalize.translate(isDrawerOpen ? 'MenuClose' : 'MenuOpen')}>
                    <IconButton
                        className='studioDrawerButton'
                        disabled={!isDrawerAvailable}
                        aria-hidden={!isDrawerAvailable || undefined}
                        style={!isDrawerAvailable ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
                        size='large'
                        color='inherit'
                        aria-label={globalize.translate(isDrawerOpen ? 'MenuClose' : 'MenuOpen')}
                        onClick={onDrawerButtonClick}
                    >
                        <MenuIcon />
                    </IconButton>
                </Tooltip>
            )}

            {isBackButtonAvailable && (
                <Tooltip title={globalize.translate('ButtonBack')}>
                    <IconButton
                        size='large'
                        color='inherit'
                        aria-label={globalize.translate('ButtonBack')}
                        onClick={onBackButtonClick}
                    >
                        <ArrowBack />
                    </IconButton>
                </Tooltip>
            )}

            {children}

            <Box className='appToolbarActions' sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end' }}>
                {buttons}
                {isUserLoggedIn && user?.Policy?.IsAdministrator && <Tooltip title={globalize.translate('TabDashboard')}><IconButton className='studioSettingsButton' component={Link} to='/dashboard' color='inherit' aria-label={globalize.translate('TabDashboard')}><SettingsOutlined /></IconButton></Tooltip>}
            </Box>

            {isUserLoggedIn && isUserMenuAvailable && (
                <Box className='appToolbarUser' sx={{ flexGrow: 0 }}>
                    <UserMenuButton />
                </Box>
            )}
        </Toolbar>
    );
};

export default AppToolbar;
