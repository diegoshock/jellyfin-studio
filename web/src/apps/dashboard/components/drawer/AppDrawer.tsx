import ListItem from '@mui/material/ListItem';
import List from '@mui/material/List';
import StudioSettingsSearch from 'components/studio/StudioSettingsSearch';
import ListItemLink from 'components/ListItemLink';
import React, { FC } from 'react';

import DrawerHeaderLink from 'apps/modern/components/drawers/DrawerHeaderLink';
import ResponsiveDrawer, { ResponsiveDrawerProps } from 'components/ResponsiveDrawer';

import ServerDrawerSection from './sections/ServerDrawerSection';
import DevicesDrawerSection from './sections/DevicesDrawerSection';
import LiveTvDrawerSection from './sections/LiveTvDrawerSection';
import AdvancedDrawerSection from './sections/AdvancedDrawerSection';
import PluginDrawerSection from './sections/PluginDrawerSection';

const AppDrawer: FC<ResponsiveDrawerProps> = ({
    open = false,
    onClose,
    onOpen
}) => (
    <ResponsiveDrawer
        open={open}
        onClose={onClose}
        onOpen={onOpen}
    >
        <List disablePadding>
            <ListItem disablePadding>
                <DrawerHeaderLink />
            </ListItem>
        </List>
        <StudioSettingsSearch />
        <ListItemLink to='/dashboard/health'>Salud del servidor</ListItemLink>
        <ListItemLink to='/studio/setup/library'>Asistente de configuración</ListItemLink>
        <ServerDrawerSection />
        <DevicesDrawerSection />
        <LiveTvDrawerSection />
        <PluginDrawerSection />
        <AdvancedDrawerSection />
    </ResponsiveDrawer>
);

export default AppDrawer;
