import React from 'react';
import Page from 'components/Page';
import StudioHealth from 'components/studio/StudioHealth';
export default function Health() {
    return (
        <Page id='studio-health' className='mainAnimatedPage type-interior' title='Salud del servidor'>
            <div className='studioPage'>
                <StudioHealth />
            </div>
        </Page>
    );
}
