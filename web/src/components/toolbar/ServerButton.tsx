import icon from '@jellyfin/ux-web/icon-transparent.png';
import Button from '@mui/material/Button/Button';
import React, { FC } from 'react';
import { Link } from 'react-router-dom';

import { useSystemInfo } from 'hooks/useSystemInfo';

const ServerButton: FC = () => {
    const {
        data: systemInfo,
        isPending
    } = useSystemInfo();

    return (
        <Button
            className='studioServerButton'
            variant='text'
            size='large'
            color='inherit'
            startIcon={
                <span className='studioServerLogo' style={{ display: 'inline-flex' }}>
                    <img
                        src={icon}
                        alt=''
                        aria-hidden
                        style={{
                            maxHeight: '1.25em',
                            maxWidth: '1.25em'
                        }}
                    />
                </span>
            }
            component={Link}
            to='/'
        >
            {isPending ? '' : (systemInfo?.ServerName || 'Jellyfin')}
        </Button>
    );
};

export default ServerButton;
