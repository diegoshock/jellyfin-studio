import React, { type FC } from 'react';

import BaseToolbar from 'components/toolbar/AppToolbar';
import ServerButton from 'components/toolbar/ServerButton';
import RemotePlayButton from 'apps/modern/components/AppToolbar/RemotePlayButton';
import SyncPlayButton from 'apps/modern/components/AppToolbar/SyncPlayButton';

import StudioNav from './StudioNav';
import StudioSearch from './StudioSearch';

import './studioToolbar.scss';

interface StudioToolbarProps {
    isDrawerAvailable: boolean
    isDrawerOpen: boolean
    onDrawerButtonClick: (event: React.MouseEvent<HTMLElement>) => void
}

const StudioToolbar: FC<StudioToolbarProps> = (props) => (
    <BaseToolbar
        {...props}
        className='studioToolbar'
        reserveDrawerSpace
        buttons={
            <>
                <SyncPlayButton />
                <RemotePlayButton />
                <StudioSearch />
            </>
        }
    >
        <div className='studioToolbar-brand'>
            <ServerButton />
        </div>
        <StudioNav />
    </BaseToolbar>
);

export default StudioToolbar;
