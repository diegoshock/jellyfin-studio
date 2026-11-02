/* eslint-disable react/jsx-no-bind -- Small controlled forms keep event handlers next to their inputs. */
import type { BaseItemDto, VirtualFolderInfo } from '@jellyfin/sdk/lib/generated-client';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ThemeCss from 'components/ThemeCss';
import Dashboard from 'utils/dashboard';
import { client, image, request, readPreferences, studioKeys } from './studioApi';
import { parseChannels } from './channelSchedule';
import StudioChannels from './StudioChannels';
import StudioHealth from './StudioHealth';
import StudioPreferences from './StudioPreferences';
import StudioRemote from './StudioRemote';
import './studioPages.scss';

const steps = [
    'start',
    'user',
    'library',
    'channels',
    'profile',
    'languages',
    'watching',
    'remoteaccess',
    'health',
    'finish'
];
const labels = [
    'Bienvenida',
    'Tu cuenta',
    'Tu biblioteca',
    'Canales',
    'Tu avatar',
    'Idiomas',
    'Reproducción',
    'Fuera de casa',
    'Salud',
    'Todo listo'
];
type Startup = {
    ServerName?: string;
    UICulture?: string;
    PreferredMetadataLanguage?: string;
    MetadataCountryCode?: string;
};

export default function StudioWizard({ revisit = false }: Readonly<{ revisit?: boolean }>) {
    const { step = 'start' } = useParams();
    const navigate = useNavigate();
    const saveRef = useRef<(() => Promise<boolean>) | null>(null);
    const index = Math.max(0, steps.indexOf(step));
    const [config, setConfig] = useState<Startup>({});
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [authenticated, setAuthenticated] = useState(client().isLoggedIn());
    const folders = useQuery({
        queryKey: ['StudioWizardFolders', client().serverId(), client().getCurrentUserId()],
        queryFn: () => client().getVirtualFolders(),
        refetchInterval: 10000
    });
    const items = useQuery({
        queryKey: ['StudioWizardArt', client().serverId(), client().getCurrentUserId(), authenticated],
        refetchInterval: 15000,
        enabled: authenticated,
        queryFn: () =>
            client().getItems(client().getCurrentUserId(), {
                Recursive: true,
                IncludeItemTypes: 'Movie',
                Limit: 18,
                EnableImageTypes: 'Primary,Backdrop',
                ImageTypeLimit: 1
            })
    });
    useEffect(() => {
        request<Startup>(revisit ? 'System/Configuration' : 'Startup/Configuration')
            .then(setConfig)
            .catch(() => setError('No se pudo cargar la configuración.'));
        if (!revisit) {
            request<{ Name?: string }>('Startup/User')
                .then((u) => setUsername(u.Name || ''))
                .catch(() => setError('No se pudo cargar la cuenta inicial.'));
        }
    }, [revisit]);
    const base = revisit ? '/studio/setup/' : '/wizard/';
    const next = () => {
        setError('');
        navigate(base + steps[Math.min(index + 1, steps.length - 1)]);
    };
    async function signIn() {
        if (!username.trim() || !password || password !== confirm) {
            throw new Error('Escribe un nombre y confirma la misma contraseña.');
        }
        // A previously configured account can sign in after a reload without changing its password.
        try {
            await client().authenticateUserByName(username.trim(), password);
        } catch {
            await request('Startup/User', 'POST', { Name: username.trim(), Password: password });
            await client().authenticateUserByName(username.trim(), password);
        }
        Dashboard.onServerChanged(client().getCurrentUserId(), client().accessToken(), client());
        setAuthenticated(true);
        setPassword('');
        setConfirm('');
    }
    async function advance() {
        setBusy(true);
        setError('');
        try {
            if (index === 0) await request(revisit ? 'System/Configuration' : 'Startup/Configuration', 'POST', config);
            if (!revisit && index === 1 && !authenticated) await signIn();
            if (saveRef.current && !(await saveRef.current())) return;
            if (index === steps.length - 1) {
                if (!revisit) await request('Startup/Complete', 'POST');
                window.location.hash = '#/home';
                window.location.reload();
            } else {
                next();
            }
        } catch (e) {
            setError(
                e instanceof Error && !('status' in e) ?
                    e.message :
                    'No se pudo completar este paso. Revisa los datos y la conexión.'
            );
        } finally {
            setBusy(false);
        }
    }
    const continueLabel = index === 9 ? 'Ir al inicio' : 'Continuar';
    const needsAuth = (index >= 3 && index <= 6) || index === 8;
    const featured = items.data?.Items?.[0];
    return (
        <div className={`studioWizard ${index === 9 ? 'studioWizard-finish' : ''}`}>
            <ThemeCss />
            {featured && image(featured, true) && (
                <img className='studioWizard-backdrop' src={image(featured, true)} alt='' />
            )}
            <header className='studioWizard-header'>
                <Link className='studioWordmark' to={revisit ? '/home' : '/wizard/start'}>
                    <span className='studioJellyfinMark' />
                    Jellyfin
                </Link>
                <div className='studioWizard-progress'>
                    <div>
                        {['Configuración', 'Tú', 'Tu servidor'].map((name, i) => (
                            <div key={name}>
                                <span>{name}</span>
                                <progress
                                    max='100'
                                    value={Math.min(
                                        100,
                                        Math.max(0, ((index - [0, 4, 7][i] + 1) / [4, 3, 3][i]) * 100)
                                    )}
                                />
                            </div>
                        ))}
                    </div>
                    <small>
                        Paso {index + 1} de {steps.length} · {labels[index]}
                    </small>
                </div>
            </header>
            <main className='studioWizard-layout'>
                {index < 9 && (
                    <aside className='studioWizard-visual'>
                        <div className='studioWizard-mosaic'>
                            {items.data?.Items?.map((item: BaseItemDto) => (
                                <div key={item.Id}>
                                    {image(item) && <img src={image(item)} alt={item.Name || ''} />}
                                </div>
                            ))}
                        </div>
                        {!items.data?.Items?.length && (
                            <div className='studioWizard-welcome'>
                                <span className='studioJellyfinMark' />
                                <p className='studioEyebrow'>TU BIBLIOTECA. TU MUNDO.</p>
                                <h2>
                                    Todo lo que te gusta.
                                    <br />
                                    En un solo lugar.
                                </h2>
                                <p>Películas, series y momentos para volver a ver.</p>
                            </div>
                        )}
                        {featured && (
                            <div className='studioWizard-caption'>
                                <small>En tu biblioteca</small>
                                <h2>{featured.Name}</h2>
                            </div>
                        )}
                    </aside>
                )}
                <div className='studioWizard-form'>
                    {index === 0 && (
                        <section className='studioPanel'>
                            <p className='studioEyebrow'>BIENVENIDO A CASA</p>
                            <h1>Hagámoslo tuyo</h1>
                            <p className='studioMuted'>
                                Unos pasos para preparar tu biblioteca, tu perfil y tu servidor.
                            </p>
                            <label>
                                Nombre de tu servidor
                                <input
                                    value={config.ServerName || ''}
                                    onChange={(e) => setConfig((old) => ({ ...old, ServerName: e.target.value }))}
                                    placeholder='Mi Jellyfin'
                                />
                            </label>
                            <label>
                                Idioma de la interfaz
                                <select
                                    value={config.UICulture || 'es'}
                                    onChange={(e) => setConfig((old) => ({ ...old, UICulture: e.target.value }))}
                                >
                                    <option value='es'>Español</option>
                                    <option value='en-US'>English</option>
                                    <option value='pt-BR'>Português</option>
                                </select>
                            </label>
                        </section>
                    )}
                    {index === 1 && (
                        <section className='studioPanel'>
                            <p className='studioEyebrow'>TU PRIMER PERFIL</p>
                            <h1>¿Cómo te llamas?</h1>
                            <p className='studioMuted'>Esta cuenta administrará el servidor. Guarda tu contraseña.</p>
                            {authenticated ? (
                                <p>Tu sesión está iniciada. Puedes continuar.</p>
                            ) : (
                                <>
                                    <label>
                                        Nombre de usuario
                                        <input
                                            autoComplete='username'
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                        />
                                    </label>
                                    <label>
                                        Contraseña
                                        <input
                                            type='password'
                                            autoComplete='new-password'
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </label>
                                    <label>
                                        Repite la contraseña
                                        <input
                                            type='password'
                                            autoComplete='new-password'
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                        />
                                    </label>
                                </>
                            )}
                        </section>
                    )}
                    {index === 2 && (
                        <LibrarySetup
                            folders={folders.data || []}
                            reload={async () => {
                                await folders.refetch();
                            }}
                        />
                    )}
                    {needsAuth && !authenticated ? (
                        <section className='studioPanel'>
                            <h1>Inicia sesión para personalizar</h1>
                            <p>Vuelve a Tu cuenta para iniciar sesión con tu contraseña y guardar tus preferencias.</p>
                            <Link to={base + 'user'}>Ir a Tu cuenta</Link>
                        </section>
                    ) : (
                        <>
                            {index === 3 && <StudioChannels />}
                            {index === 4 && <StudioPreferences saveRef={saveRef} section='profile' />}
                            {index === 5 && <StudioPreferences saveRef={saveRef} section='languages' />}
                            {index === 6 && <StudioPreferences saveRef={saveRef} section='watching' />}
                            {index === 8 && <StudioHealth />}
                        </>
                    )}
                    {index === 7 && <StudioRemote saveRef={saveRef} startup={!revisit} />}
                    {index === 9 && <StudioFinish folders={folders.data || []} authenticated={authenticated} />}
                    {error && (
                        <p className='studioError' role='alert'>
                            {error}
                        </p>
                    )}
                    <footer className='studioWizard-navigation'>
                        <button disabled={!index || busy} onClick={() => navigate(base + steps[index - 1])}>
                            Atrás
                        </button>
                        {index > 1 && index < 9 && (
                            <button disabled={busy} onClick={next}>
                                Más tarde
                            </button>
                        )}
                        <button
                            className='studioAction studioAction-primary'
                            disabled={busy}
                            onClick={() => {
                                void advance();
                            }}
                        >
                            {busy ? 'Guardando…' : continueLabel}
                        </button>
                    </footer>
                    {index > 1 && index < 9 && (
                        <p className='studioMuted studioWizard-saveHint'>
                            Continuar guarda las preferencias de este paso. Más tarde lo omite.
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}

function LibrarySetup({ folders, reload }: Readonly<{ folders: VirtualFolderInfo[]; reload: () => Promise<void> }>) {
    const [type, setType] = useState('movies');
    const [name, setName] = useState('Películas');
    const [paths, setPaths] = useState([{ id: 0, value: '' }]);
    const nextPathId = useRef(1);
    const [language, setLanguage] = useState('es');
    const [country, setCountry] = useState('CL');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    function updatePath(index: number, value: string) {
        setPaths((old) => old.map((path, n) => (n === index ? { ...path, value } : path)));
    }
    function removePath(index: number) {
        setPaths((old) => old.filter((_, n) => n !== index));
    }
    async function browse(i: number) {
        const { default: DirectoryBrowser } = await import('components/directorybrowser/directorybrowser');
        const picker = new DirectoryBrowser();
        picker.show({
            callback: (path: string) => {
                if (path) updatePath(i, path);
                picker.close();
            }
        });
    }
    async function add() {
        if (!name.trim() || !paths.some((p) => p.value.trim())) {
            setMessage('Indica un nombre y al menos una carpeta.');
            return;
        }
        setBusy(true);
        setMessage('');
        try {
            await client().addVirtualFolder(name.trim(), type, true, {
                PathInfos: paths.filter((p) => p.value.trim()).map((p) => ({ Path: p.value.trim() })),
                PreferredMetadataLanguage: language,
                MetadataCountryCode: country,
                EnableRealtimeMonitor: true
            });
            const created = (await client().getVirtualFolders()).find((folder) => folder.Name === name.trim());
            if (created?.ItemId) {
                await client().refreshItem(created.ItemId, {
                    Recursive: true,
                    MetadataRefreshMode: 'Default',
                    ImageRefreshMode: 'Default'
                });
            }
            await reload();
            setPaths([{ id: nextPathId.current++, value: '' }]);
            setMessage('Biblioteca añadida. El escaneo continuará en segundo plano.');
        } catch {
            setMessage('No se pudo añadir la biblioteca. Comprueba la ruta y los permisos del servidor.');
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className='studioPanel'>
            <p className='studioEyebrow'>PRIMERO, TUS HISTORIAS</p>
            <h1>Tu biblioteca</h1>
            <p className='studioMuted'>
                Tus archivos se quedan donde están. Añade las carpetas que Jellyfin debe explorar.
            </p>
            <div className='studioTabs'>
                {[
                    ['movies', 'Películas'],
                    ['tvshows', 'Series'],
                    ['mixed', 'Mixta'],
                    ['homevideos', 'Otros vídeos']
                ].map(([key, text]) => (
                    <button
                        key={key}
                        aria-pressed={type === key}
                        onClick={() => {
                            setType(key);
                            setName(text);
                        }}
                    >
                        {text}
                    </button>
                ))}
            </div>
            <label>
                Nombre de la biblioteca
                <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            {paths.map((path, i) => (
                <label key={path.id}>
                    Carpeta multimedia
                    <div className='studioPathInput'>
                        <input
                            placeholder='/media/peliculas'
                            value={path.value}
                            onChange={(e) => updatePath(i, e.target.value)}
                        />
                        <button
                            onClick={() => {
                                void browse(i).catch(() => setMessage('No se pudo abrir el explorador de carpetas.'));
                            }}
                        >
                            Examinar
                        </button>
                        {i > 0 && (
                            <button aria-label='Eliminar carpeta' onClick={() => removePath(i)}>
                                ×
                            </button>
                        )}
                    </div>
                </label>
            ))}
            <button onClick={() => setPaths((old) => [...old, { id: nextPathId.current++, value: '' }])}>
                ＋ Añadir otra carpeta
            </button>
            <p className='studioMuted'>
                ¿Usas Docker o Unraid? Introduce la ruta dentro del contenedor, por ejemplo /media/peliculas.
            </p>
            <details>
                <summary>Opciones de biblioteca</summary>
                <label>
                    Idioma de metadatos
                    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                        <option value='es'>Español</option>
                        <option value='en'>Inglés</option>
                        <option value='pt'>Portugués</option>
                    </select>
                </label>
                <label>
                    Región
                    <select value={country} onChange={(e) => setCountry(e.target.value)}>
                        <option value='CL'>Chile</option>
                        <option value='ES'>España</option>
                        <option value='MX'>México</option>
                        <option value='AR'>Argentina</option>
                        <option value='US'>Estados Unidos</option>
                    </select>
                </label>
            </details>
            <button
                className='studioAction studioAction-secondary'
                disabled={busy}
                onClick={() => {
                    void add();
                }}
            >
                {busy ? 'Añadiendo…' : 'Añadir y escanear'}
            </button>
            <p role='status'>{message}</p>
            {folders.map((f) => (
                <div className='studioLibrarySummary' key={f.ItemId}>
                    <strong>{f.Name}</strong>
                    <small>{f.Locations?.join(' · ')}</small>
                    <span>{f.RefreshStatus === 'Idle' ? 'En espera' : f.RefreshStatus || 'Añadida'}</span>
                </div>
            ))}
        </section>
    );
}

function StudioFinish({ folders, authenticated }: Readonly<{ folders: VirtualFolderInfo[]; authenticated: boolean }>) {
    const channels = useQuery({
        queryKey: ['StudioFinishChannels', client().serverId(), client().getCurrentUserId()],
        enabled: authenticated,
        queryFn: readPreferences
    });
    const encoding = useQuery({
        queryKey: ['StudioFinishEncoding', client().serverId(), client().getCurrentUserId()],
        enabled: authenticated,
        queryFn: () => request<{ HardwareAccelerationType?: string }>('System/Configuration/encoding')
    });
    const version = useQuery({
        queryKey: ['StudioFinishVersion', client().serverId(), client().getCurrentUserId()],
        queryFn: () => request<{ Version?: string }>('System/Info/Public')
    });
    const counts = useQuery({
        queryKey: ['StudioFinishCounts', client().serverId(), client().getCurrentUserId()],
        enabled: authenticated,
        queryFn: () => request<{ MovieCount?: number; SeriesCount?: number }>('Items/Counts')
    });
    const network = useQuery({
        queryKey: ['StudioFinishNetwork', client().serverId(), client().getCurrentUserId()],
        queryFn: () => request<{ EnableRemoteAccess?: boolean }>('System/Configuration/network')
    });
    let networkStatus = 'Estado no disponible';
    if (network.data) networkStatus = network.data.EnableRemoteAccess ? 'Acceso remoto permitido' : 'Solo en tu red';
    return (
        <>
            <p className='studioEyebrow'>TU MUNDO ESTÁ PREPARADO</p>
            <h1>Todo listo</h1>
            <p className='studioMuted'>Esto es lo que has preparado. Puedes volver a cada ajuste cuando quieras.</p>
            <div className='studioFinishGrid'>
                <section className='studioPanel'>
                    <h2>Tu biblioteca</h2>
                    <strong className='studioFinishCount'>
                        {counts.data ? (counts.data.MovieCount || 0) + (counts.data.SeriesCount || 0) : '—'}
                    </strong>
                    <p>películas y series</p>
                    {folders.map((f) => (
                        <div className='studioLibrarySummary' key={f.ItemId}>
                            <strong>{f.Name}</strong>
                            <span>
                                {f.RefreshStatus === 'Idle' ?
                                    'Sin escaneo activo' :
                                    f.RefreshStatus || 'Escaneo pendiente de comprobar'}
                            </span>
                        </div>
                    ))}
                    {!folders.length && <p>No has añadido bibliotecas todavía.</p>}
                </section>
                <section className='studioPanel'>
                    <h2>Fuera de casa</h2>
                    <p>{networkStatus}</p>
                    <p className='studioMuted'>La conexión exterior requiere comprobación desde otra red.</p>
                    <h2>Tus canales</h2>
                    <p>
                        {channels.data ?
                            `${parseChannels(channels.data.CustomPrefs?.[studioKeys.channels]).length} canales activados` :
                            'Sin comprobar'}
                    </p>
                    <h2>Tu servidor</h2>
                    <p>Transcodificación: {encoding.data?.HardwareAccelerationType || 'Procesador / sin configurar'}</p>
                    <p>Jellyfin {version.data?.Version || '—'}</p>
                    <p className='studioMuted'>Los pasos omitidos pueden completarse después.</p>
                </section>
            </div>
            <a
                className='studioAction studioAction-secondary'
                href='https://jellyfin.org/downloads/clients/'
                target='_blank'
                rel='noopener noreferrer'
            >
                Obtener la app para TV ↗
            </a>
        </>
    );
}

/* eslint-enable react/jsx-no-bind */
