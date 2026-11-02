import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Page from 'components/Page';
import { clearBackdrop } from 'components/backdrop/backdrop';
import { useApi } from 'hooks/useApi';
import StudioCatalog from './StudioCatalog';
import StudioDiscover from './StudioDiscover';
import StudioChannels from './StudioChannels';
import StudioPreferences from './StudioPreferences';
import StudioWizard from './StudioWizard';

export default function StudioHub() {
    const { section } = useParams();
    const { user } = useApi();
    useEffect(() => {
        clearBackdrop();
    }, [section]);
    let content: React.ReactNode;
    switch (section) {
        case 'setup':
            content = user?.Policy?.IsAdministrator ? (
                <StudioWizard revisit />
            ) : (
                <p>Solo los administradores pueden configurar el servidor.</p>
            );
            break;
        case 'discover':
            content = <StudioDiscover />;
            break;
        case 'live':
            content = <StudioChannels />;
            break;
        case 'preferences':
            content = (
                <div className='studioPage'>
                    <StudioPreferences />
                </div>
            );
            break;
        default:
            content = <StudioCatalog mode={section === 'history' ? 'history' : 'browse'} />;
    }
    return (
        <Page key={section} id={`studio-${section}`} className='mainAnimatedPage libraryPage studioRoute'>
            {content}
        </Page>
    );
}
