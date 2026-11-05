import type { LibraryOptions } from '@jellyfin/sdk/lib/generated-client/models/library-options';
import LibraryCard from 'apps/dashboard/features/libraries/components/LibraryCard';
import type { VirtualFolderInfo } from '@jellyfin/sdk/lib/generated-client/models/virtual-folder-info';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import libraryoptionseditor from 'components/libraryoptionseditor/libraryoptionseditor';
import DirectoryBrowser from 'components/directorybrowser/directorybrowser';
import ConfirmDialog from 'components/ConfirmDialog';
import { invalidateVirtualFolders } from 'apps/dashboard/features/libraries/api/invalidateVirtualFolders';
import { useApi } from 'hooks/useApi';
import { client } from './studioApi';

export function librarySettingsId(id?: string | null) {
    return `studio-library-settings-${id}`;
}

export default function StudioLibrarySettings({ folder }: Readonly<{ folder: VirtualFolderInfo }>) {
    const { user } = useApi();
    const editor = useRef<HTMLDivElement>(null);
    const original = useRef(folder);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [paths, setPaths] = useState(folder.Locations || []);
    const [removePath, setRemovePath] = useState<string>();
    useEffect(() => {
        let active = true;
        if (editor.current) {
            void libraryoptionseditor.embed(editor.current, folder.CollectionType, structuredClone(folder.LibraryOptions), `${librarySettingsId(folder.ItemId)}-`).then(() => {
                if (active) setReady(true);
            }).catch(() => {
                if (active) setError('No se pudieron cargar los ajustes. Recarga la página para intentarlo de nuevo.');
            });
        }
        return () => {
            active = false;
        };
        // Keep unsaved edits intact when catalog queries refresh.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folder.ItemId]);

    const save = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editor.current || !ready || !folder.ItemId || busy) return;
        setBusy(true);
        setError('');
        setStatus('');
        try {
            const options = { ...original.current.LibraryOptions, ...libraryoptionseditor.getLibraryOptions(editor.current) } as LibraryOptions;
            await client().updateVirtualFolderOptions(folder.ItemId, options);
            original.current = { ...original.current, LibraryOptions: options };
            invalidateVirtualFolders(user, folder);
            setStatus('Cambios guardados');
        } catch {
            setError('No se pudieron guardar los cambios. Tus ajustes siguen disponibles para reintentar.');
        } finally {
            setBusy(false);
        }
    }, [ready, busy, folder, user]);

    const refreshPaths = useCallback(async () => {
        const folders: VirtualFolderInfo[] = await client().getVirtualFolders();
        const updated = folders.find(value => value.ItemId === folder.ItemId);
        if (updated) {
            original.current = { ...original.current, Locations: updated.Locations, LibraryOptions: { ...original.current.LibraryOptions, PathInfos: updated.LibraryOptions?.PathInfos } };
            setPaths(updated.Locations || []);
        }
        invalidateVirtualFolders(user, folder);
    }, [folder, user]);

    const addPath = useCallback(() => {
        const picker = new DirectoryBrowser();
        picker.show({ callback: (path: string) => {
            picker.close();
            if (!path || paths.includes(path) || !folder.Name) return;
            setBusy(true);
            setError('');
            void client().addMediaPath(folder.Name, path, '', true).then(refreshPaths).catch(() => setError('No se pudo añadir la carpeta.')).finally(() => setBusy(false));
        } });
    }, [folder.Name, paths, refreshPaths]);

    const confirmRemove = useCallback(() => {
        if (!removePath || !folder.Name) return;
        setBusy(true);
        setError('');
        void client().removeMediaPath(folder.Name, removePath, true).then(refreshPaths).catch(() => setError('No se pudo quitar la carpeta.')).finally(() => {
            setBusy(false);
            setRemovePath(undefined);
        });
    }, [removePath, folder.Name, refreshPaths]);
    const requestRemove = useCallback((event: React.MouseEvent<HTMLButtonElement>) => setRemovePath(event.currentTarget.dataset.path), []);
    const cancelRemove = useCallback(() => setRemovePath(undefined), []);

    return (
        <section id={librarySettingsId(folder.ItemId)} className='studioLibrarySettings' aria-label={`Ajustes de ${folder.Name}`}>
            <header><div><span>Biblioteca</span><h2>{folder.Name}</h2></div><LibraryCard virtualFolder={folder} actionsOnly /></header>
            <p className='studioLibrarySettingsNote'>Los cambios de descarga de metadatos e imágenes se aplican al contenido nuevo. Para aplicarlos al existente, actualiza sus metadatos.</p>
            {folder.CollectionType !== 'boxsets' && <div className='studioLibraryFolders'><div><h3>Carpetas</h3><button type='button' onClick={addPath} disabled={busy}>＋ Añadir carpeta</button></div><ul>{paths.map(path => <li key={path}><span>{path}</span><button type='button' disabled={busy} data-path={path} onClick={requestRemove} aria-label={`Quitar ${path}`}>Quitar</button></li>)}</ul></div>}
            <form onSubmit={save}>
                <fieldset disabled={!ready || busy} className='studioLibraryFields'><div ref={editor} className='libraryOptions' /></fieldset>
                <footer><button type='submit' disabled={!ready || busy || !folder.ItemId}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><span role='status'>{status || (!ready && !error ? 'Cargando ajustes…' : '')}</span></footer>
            </form>
            {error && <p role='alert'>{error}</p>}
            <ConfirmDialog open={!!removePath} title='Quitar carpeta' text={`¿Quitar ${removePath || ''} de esta biblioteca?`} confirmButtonText='Quitar' confirmButtonColor='error' onConfirm={confirmRemove} onCancel={cancelRemove} />
        </section>
    );
}
