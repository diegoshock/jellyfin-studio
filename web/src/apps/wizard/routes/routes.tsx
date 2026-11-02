import React from 'react';
import { RouteObject } from 'react-router-dom';
import ConnectionRequired from 'components/ConnectionRequired';
import ErrorBoundary from 'components/router/ErrorBoundary';
import StudioWizard from 'components/studio/StudioWizard';

export const WIZARD_APP_ROUTES: RouteObject[] = [{
    element: <ConnectionRequired level='wizard' />,
    children: [{ path: 'wizard/:step?', Component: StudioWizard, ErrorBoundary }]
}];
