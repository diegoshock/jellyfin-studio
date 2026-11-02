import * as userSettings from 'scripts/settings/userSettings';
import focusManager from 'components/focusManager';
import homeSections from 'components/homesections/homesections';
import { ServerConnections } from 'lib/jellyfin-apiclient';
import StudioHome from 'components/studio/StudioHome';
import { renderComponent } from 'utils/reactUtils';

import 'elements/emby-itemscontainer/emby-itemscontainer';

class HomeTab {
    constructor(view, params) {
        this.view = view;
        this.params = params;
        this.apiClient = ServerConnections.currentApiClient();
        this.sectionsContainer = view.querySelector('.sections');
        view.querySelector('.sections').addEventListener('settingschange', onHomeScreenSettingsChanged.bind(this));
    }
    onResume(options) {
        this.syncStudioHome();
        if (this.sectionsRendered) {
            const sectionsContainer = this.sectionsContainer;

            if (sectionsContainer) {
                return homeSections.resume(sectionsContainer, options);
            }

            return Promise.resolve();
        }

        const view = this.view;
        const apiClient = this.apiClient;
        this.destroyHomeSections();
        this.sectionsRendered = true;
        return apiClient.getCurrentUser()
            .then(user => homeSections.loadSections(view.querySelector('.sections'), apiClient, user, userSettings))
            .then(() => {
                if (options.autoFocus) {
                    focusManager.autoFocus(view);
                }
            }).catch(err => {
                console.error(err);
            });
    }
    onPause() {
        const sectionsContainer = this.sectionsContainer;

        if (sectionsContainer) {
            homeSections.pause(sectionsContainer);
        }
    }
    destroy() {
        this.removeStudioHome();
        this.view = null;
        this.params = null;
        this.apiClient = null;
        this.destroyHomeSections();
        this.sectionsContainer = null;
    }
    syncStudioHome() {
        if (document.documentElement.dataset.theme !== 'studio') {
            this.removeStudioHome();
            return;
        }
        if (!this.studioHost) {
            this.studioHost = document.createElement('div');
            this.studioHost.className = 'studioHeroHost';
            this.view.classList.add('studioHome');
            this.view.insertBefore(this.studioHost, this.view.firstChild);
            this.unmountStudio = renderComponent(StudioHome, {}, this.studioHost);
        }
    }

    removeStudioHome() {
        this.unmountStudio?.();
        this.studioHost?.remove();
        this.view?.classList.remove('studioHome');
        this.unmountStudio = null;
        this.studioHost = null;
    }

    destroyHomeSections() {
        const sectionsContainer = this.sectionsContainer;

        if (sectionsContainer) {
            homeSections.destroySections(sectionsContainer);
        }
    }
}

function onHomeScreenSettingsChanged() {
    this.sectionsRendered = false;

    if (!this.paused) {
        this.onResume({
            refresh: true
        });
    }
}

export default HomeTab;
