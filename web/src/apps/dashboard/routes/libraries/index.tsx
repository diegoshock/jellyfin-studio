import React, { useCallback, useMemo } from 'react';
import Page from 'components/Page';
import globalize from 'lib/globalize';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useVirtualFolders } from 'apps/dashboard/features/libraries/api/useVirtualFolders';
import useLiveTasks from 'apps/dashboard/features/tasks/hooks/useLiveTasks';
import { useStartTask } from 'apps/dashboard/features/tasks/api/useStartTask';
import TaskProgress from 'apps/dashboard/features/tasks/components/TaskProgress';
import { TaskState } from '@jellyfin/sdk/lib/generated-client/models/task-state';
import Grid from '@mui/material/Grid';
import LibraryCard from 'apps/dashboard/features/libraries/components/LibraryCard';
import Loading from 'components/loading/LoadingComponent';
import MediaLibraryCreator from 'components/mediaLibraryCreator/mediaLibraryCreator';
import getCollectionTypeOptions from 'apps/dashboard/features/libraries/utils/collectionTypeOptions';
import RefreshIcon from '@mui/icons-material/Refresh';
import Add from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import { useApi } from 'hooks/useApi';
import { useUserTheme } from 'hooks/useUserTheme';
import StudioLibrariesDashboard from 'components/studio/StudioLibrariesDashboard';
import type { VirtualFolderInfo } from '@jellyfin/sdk/lib/generated-client/models/virtual-folder-info';
import StudioLibrarySettings, { librarySettingsId } from 'components/studio/StudioLibrarySettings';
import { invalidateVirtualFolders } from 'apps/dashboard/features/libraries/api/invalidateVirtualFolders';

export const Component = () => {
    const { user } = useApi();
    const { theme } = useUserTheme();
    const isStudio = theme === 'studio';
    const { data: virtualFolders, isPending: isVirtualFoldersPending, isError: isVirtualFoldersError } = useVirtualFolders();
    const startTask = useStartTask();
    const { data: tasks, isPending: isLiveTasksPending } = useLiveTasks({ isHidden: false });

    const librariesTask = useMemo(() => (
        tasks?.find((value) => value.Key === 'RefreshLibrary')
    ), [ tasks ]);

    const showMediaLibraryCreator = useCallback(() => {
        const mediaLibraryCreator = new MediaLibraryCreator({
            collectionTypeOptions: getCollectionTypeOptions(),
            refresh: true
        }) as Promise<boolean>;

        void mediaLibraryCreator.then((hasChanges: boolean) => {
            if (hasChanges) invalidateVirtualFolders(user);
        });
    }, [ user ]);

    const onManageLibrary = useCallback((library: VirtualFolderInfo) => {
        document.getElementById(librarySettingsId(library.ItemId))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const onScanLibraries = useCallback(() => {
        if (librariesTask?.Id) {
            startTask.mutate({
                taskId: librariesTask.Id
            });
        }
    }, [ startTask, librariesTask ]);

    if (isVirtualFoldersPending || isLiveTasksPending) return <Loading />;

    return (
        <Page
            id='mediaLibraryPage'
            title={globalize.translate('HeaderLibraries')}
            className={`mainAnimatedPage type-interior${isStudio ? ' studioLibrariesPage' : ''}`}
        >
            <Box className='content-primary'>
                {isVirtualFoldersError ? (
                    <Alert severity='error'>{globalize.translate('LibrariesLoadError')}</Alert>
                ) : (
                    <>
                        {isStudio && <StudioLibrariesDashboard folders={virtualFolders || []} onAdd={showMediaLibraryCreator} onManage={onManageLibrary} />}
                        <section id='studioLibraryOptions' className={isStudio ? 'studioLibraryOptions' : undefined} aria-label='Opciones de bibliotecas'>
                            {isStudio && <h2>Opciones de bibliotecas</h2>}
                            {isStudio ? virtualFolders?.map(folder => <StudioLibrarySettings key={folder.ItemId} folder={folder} />) : <Stack spacing={3} mt={2}>
                                <Stack direction='row' alignItems={'center'} spacing={1.5} useFlexGap flexWrap='wrap'>
                                    <Button
                                        startIcon={<Add />}
                                        onClick={showMediaLibraryCreator}
                                    >
                                        {globalize.translate('ButtonAddMediaLibrary')}
                                    </Button>
                                    <Button
                                        onClick={onScanLibraries}
                                        startIcon={<RefreshIcon />}
                                        loading={librariesTask && librariesTask.State !== TaskState.Idle}
                                        loadingPosition='start'
                                        variant='outlined'
                                    >
                                        {globalize.translate('ButtonScanAllLibraries')}
                                    </Button>
                                    {(librariesTask && librariesTask.State == TaskState.Running) && (
                                        <TaskProgress task={librariesTask} />
                                    )}
                                </Stack>

                                <Box>
                                    <Grid container spacing={2}>
                                        {virtualFolders?.map(virtualFolder => (
                                            <Grid
                                                key={virtualFolder?.ItemId}
                                                item
                                                xs={12}
                                                sm={6}
                                                md={3}
                                                lg={2.4}
                                            >
                                                <LibraryCard
                                                    virtualFolder={virtualFolder}
                                                />
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            </Stack>}
                        </section>
                    </>
                )}
            </Box>
        </Page>
    );
};

Component.displayName = 'LibrariesPage';
