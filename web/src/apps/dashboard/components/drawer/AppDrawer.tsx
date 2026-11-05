import ListItem from '@mui/material/ListItem';
import List from '@mui/material/List';
import StudioSettingsSearch from 'components/studio/StudioSettingsSearch';
import ListItemLink from 'components/ListItemLink';
import React, { FC } from 'react';
import { useUserTheme } from 'hooks/useUserTheme';
import StudioAdminDrawer from './StudioAdminDrawer';

import DrawerHeaderLink from 'apps/modern/components/drawers/DrawerHeaderLink';
import ResponsiveDrawer, { ResponsiveDrawerProps } from 'components/ResponsiveDrawer';

import ServerDrawerSection from './sections/ServerDrawerSection';
import DevicesDrawerSection from './sections/DevicesDrawerSection';
import LiveTvDrawerSection from './sections/LiveTvDrawerSection';
import AdvancedDrawerSection from './sections/AdvancedDrawerSection';
import PluginDrawerSection from './sections/PluginDrawerSection';

const AppDrawer: FC<ResponsiveDrawerProps> = ({ open = false, onClose, onOpen }) => {
    const { theme } = useUserTheme();
    return (
        <ResponsiveDrawer open={open} onClose={onClose} onOpen={onOpen}>
            {theme === 'studio' ? (
                <StudioAdminDrawer />
            ) : (
                <>
                    <List disablePadding>
                        <ListItem disablePadding>
                            <DrawerHeaderLink />
                        </ListItem>
                    </List>
                    <StudioSettingsSearch />
                    <ListItemLink to='/studio/setup/library'>Asistente de configuración</ListItemLink>
                    <ServerDrawerSection />
                    <DevicesDrawerSection />
                    <LiveTvDrawerSection />
                    <PluginDrawerSection />
                    <AdvancedDrawerSection />
                </>
            )}
        </ResponsiveDrawer>
    );
};

export default AppDrawer;
