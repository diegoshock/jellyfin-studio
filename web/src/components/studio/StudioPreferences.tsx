/* eslint-disable react/jsx-no-bind -- Small controlled forms keep event handlers next to their inputs. */
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client';
import { SubtitlePlaybackMode } from '@jellyfin/sdk/lib/generated-client/models/subtitle-playback-mode';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import appSettings from 'scripts/settings/appSettings';
import { currentSettings } from 'scripts/settings/userSettings';
import { client } from './studioApi';
import StudioAvatar, { avatarNames } from './StudioAvatar';
import './studioPages.scss';

const languages = [
    ['spa', 'Español'],
    ['eng', 'Inglés'],
    ['por', 'Portugués'],
    ['fra', 'Francés'],
    ['deu', 'Alemán'],
    ['ita', 'Italiano'],
    ['jpn', 'Japonés'],
    ['kor', 'Coreano'],
    ['zho', 'Chino']
];

export function Segmented({
    label,
    value,
    options,
    onChange
}: Readonly<{ label: string; value: string; options: string[][]; onChange: (value: string) => void }>) {
    return (
        <div className='studioPreferenceRow'>
            <span>{label}</span>
            <div className='studioSegmented' role='group' aria-label={label}>
                {options.map(([key, text]) => (
                    <button key={key} type='button' aria-pressed={value === key} onClick={() => onChange(key)}>
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function StudioPreferences({
    section = 'all',
    saveRef
}: Readonly<{
    section?: 'all' | 'profile' | 'languages' | 'watching';
    saveRef?: { current: (() => Promise<boolean>) | null };
}>) {
    const cache = useQueryClient();
    const userQuery = useQuery({
        queryKey: ['StudioUser', client().getCurrentUserId()],
        queryFn: () => client().getCurrentUser()
    });
    const [draft, setDraft] = useState<UserDto>();
    const [avatar, setAvatar] = useState(0);
    const [avatarChanged, setAvatarChanged] = useState(false);
    const [file, setFile] = useState<File>();
    const [quality, setQuality] = useState(
        appSettings.enableAutomaticBitrateDetection(false, 'Video') ? 'auto' : 'max'
    );
    const [subtitleSize, setSubtitleSize] = useState(
        (currentSettings.getSubtitleAppearanceSettings(undefined) as { textSize?: string }).textSize || ''
    );
    const [segments, setSegments] = useState<Record<string, string>>({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const avatarRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (userQuery.data) setDraft(userQuery.data);
        setSegments(
            Object.fromEntries(
                ['Intro', 'Recap', 'Outro'].map((key) => [
                    key,
                    currentSettings.get(`segmentTypeAction__${key}`, false) || (key === 'Recap' ? 'None' : 'AskToSkip')
                ])
            )
        );
    }, [userQuery.data]);
    function config(key: string, value: unknown) {
        setDraft((old) => ({
            ...old,
            Configuration: {
                ...old?.Configuration,
                [key]: value,
                ...(key === 'AudioLanguagePreference' ? { PlayDefaultAudioTrack: !value } : {})
            }
        }));
    }
    async function save() {
        if (!draft?.Id || !draft.Configuration) return false;
        setBusy(true);
        setMessage('');
        try {
            await client().updateUserConfiguration(draft.Id, draft.Configuration);
            for (const [key, value] of Object.entries(segments)) {
                currentSettings.set(`segmentTypeAction__${key}`, value, false);
            }
            if (section === 'all' || section === 'watching') {
                for (const local of [true, false]) {
                    appSettings.enableAutomaticBitrateDetection(local, 'Video', quality === 'auto');
                    if (quality === 'max') appSettings.maxStreamingBitrate(local, 'Video', 150000000);
                }
            }
            if (section === 'all' || section === 'languages') {
                currentSettings.setSubtitleAppearanceSettings(
                    {
                        ...currentSettings.getSubtitleAppearanceSettings(undefined),
                        textSize: subtitleSize
                    },
                    undefined
                );
            }
            let photo = file;
            if (avatarChanged && !file) {
                const svg = avatarRef.current?.querySelector('svg');
                if (svg) {
                    const url = URL.createObjectURL(
                        new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
                    );
                    try {
                        const img = new Image();
                        img.src = url;
                        await new Promise<void>((resolve, reject) => {
                            img.onload = () => resolve();
                            img.onerror = reject;
                        });
                        const canvas = document.createElement('canvas');
                        canvas.width = 256;
                        canvas.height = 256;
                        canvas.getContext('2d')!.drawImage(img, 0, 0, 256, 256);
                        const blob = await new Promise<Blob>((resolve, reject) =>
                            canvas.toBlob(
                                (result) =>
                                    result ? resolve(result) : reject(new Error('No se pudo crear el retrato')),
                                'image/png'
                            )
                        );
                        photo = new File([blob], 'studio-avatar.png', { type: 'image/png' });
                    } finally {
                        URL.revokeObjectURL(url);
                    }
                }
            }
            if (photo) await client().uploadUserImage(draft.Id, ImageType.Primary, photo);
            await cache.invalidateQueries({ queryKey: ['StudioUser'] });
            await cache.invalidateQueries({ queryKey: ['StudioAvatarTag'] });
            setFile(undefined);
            setAvatarChanged(false);
            setMessage('Preferencias guardadas.');
            return true;
        } catch {
            setMessage('No se pudieron guardar todos los cambios. Revisa la conexión y vuelve a intentarlo.');
            return false;
        } finally {
            setBusy(false);
        }
    }
    useEffect(() => {
        if (saveRef) saveRef.current = save;
        return () => {
            if (saveRef) saveRef.current = null;
        };
    });
    if (userQuery.isPending) return <p role='status'>Cargando tus preferencias…</p>;
    if (userQuery.isError || !draft) return <p role='alert'>No se pudieron cargar tus preferencias.</p>;
    const c = draft.Configuration;
    return (
        <section className='studioPanel studioPreferences'>
            {(section === 'all' || section === 'profile') && (
                <>
                    <p className='studioEyebrow'>A TU MANERA</p>
                    <h1>Ahora, tú</h1>
                    <p className='studioMuted'>Elige una cara simpática para acompañarte en cada pantalla.</p>
                    <div className='studioProfilePreview'>
                        <div ref={avatarRef}>
                            {!avatarChanged && !file && draft.PrimaryImageTag ? <img className='studioCurrentPortrait' src={client().getUrl(`Users/${draft.Id}/Images/Primary`, { tag: draft.PrimaryImageTag })} alt='Avatar actual' /> : <StudioAvatar index={avatar} />}
                        </div>
                        <div>
                            <h2>{draft.Name}</h2>
                            <p>{avatarChanged ? avatarNames[avatar] : 'Tu perfil Jellyfin'}</p>
                        </div>
                    </div>
                    <div className='studioAvatarGrid'>
                        {avatarNames.map((name, i) => (
                            <button
                                key={name}
                                aria-label={name}
                                aria-pressed={avatarChanged && avatar === i}
                                onClick={() => {
                                    setAvatar(i);
                                    setAvatarChanged(true);
                                    setFile(undefined);
                                }}
                            >
                                <StudioAvatar index={i} />
                            </button>
                        ))}
                    </div>
                    <label className='studioUpload'>
                        O sube tu propia foto{' '}
                        <input
                            type='file'
                            accept='image/png,image/jpeg,image/webp'
                            onChange={(e) => {
                                const selected = e.target.files?.[0];
                                if (selected && selected.size > 5 * 1024 * 1024) {
                                    setMessage('La foto debe pesar menos de 5 MB.');
                                    return;
                                }
                                setFile(selected);
                            }}
                        />
                    </label>
                    {file && <p>{file.name}</p>}
                </>
            )}
            {(section === 'all' || section === 'languages') && (
                <>
                    <h1>Idiomas</h1>
                    <p className='studioMuted'>El audio y los subtítulos que prefieres para cada título.</p>
                    <label>
                        Audio
                        <select
                            value={c?.AudioLanguagePreference || ''}
                            onChange={(e) => config('AudioLanguagePreference', e.target.value)}
                        >
                            <option value=''>Idioma original / predeterminado</option>
                            {languages.map(([id, name]) => (
                                <option key={id} value={id}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Segmented
                        label='Subtítulos'
                        value={c?.SubtitleMode || 'Default'}
                        options={[
                            ['Default', 'Automáticos'],
                            ['Smart', 'Solo otros idiomas'],
                            ['Always', 'Siempre'],
                            ['None', 'Desactivados']
                        ]}
                        onChange={(value) => config('SubtitleMode', value as SubtitlePlaybackMode)}
                    />
                    <label>
                        Idioma de subtítulos
                        <select
                            value={c?.SubtitleLanguagePreference || ''}
                            onChange={(e) => config('SubtitleLanguagePreference', e.target.value)}
                        >
                            <option value=''>Predeterminado</option>
                            {languages.map(([id, name]) => (
                                <option key={id} value={id}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <details>
                        <summary>Más opciones de subtítulos</summary>
                        <label>
                            Tamaño de subtítulos
                            <select value={subtitleSize} onChange={(e) => setSubtitleSize(e.target.value)}>
                                <option value='smaller'>Muy pequeño</option>
                                <option value='small'>Pequeño</option>
                                <option value=''>Normal</option>
                                <option value='large'>Grande</option>
                                <option value='larger'>Muy grande</option>
                            </select>
                        </label>
                        <label>
                            <input
                                type='checkbox'
                                checked={!!c?.RememberSubtitleSelections}
                                onChange={(e) => config('RememberSubtitleSelections', e.target.checked)}
                            />
                            Recordar los subtítulos elegidos para cada título
                        </label>
                        <p>Tamaño, fuente, color y posición.</p>
                        <Link to='/mypreferencessubtitles'>Abrir ajustes de subtítulos ↗</Link>
                    </details>
                </>
            )}
            {(section === 'all' || section === 'watching') && (
                <>
                    <h1>Cómo te gusta ver</h1>
                    <p className='studioMuted'>Puedes cambiar estas preferencias cuando quieras.</p>
                    {[
                        ['Intro', 'Introducciones'],
                        ['Recap', 'Resúmenes'],
                        ['Outro', 'Créditos']
                    ].map(([key, label]) => (
                        <Segmented
                            key={key}
                            label={label}
                            value={segments[key] || 'None'}
                            options={[
                                ['AskToSkip', 'Preguntar'],
                                ['Skip', 'Saltar'],
                                ['None', 'Ver']
                            ]}
                            onChange={(value) => setSegments((old) => ({ ...old, [key]: value }))}
                        />
                    ))}
                    <Segmented
                        label='Siguiente episodio'
                        value={c?.EnableNextEpisodeAutoPlay ? 'play' : 'ask'}
                        options={[
                            ['ask', 'Preguntar'],
                            ['play', 'Reproducir']
                        ]}
                        onChange={(value) => config('EnableNextEpisodeAutoPlay', value === 'play')}
                    />
                    <p className='studioMuted'>
                        Saltar introducciones, resúmenes y créditos requiere segmentos detectados por los proveedores de
                        tu servidor. Estas tres preferencias se guardan en este navegador.
                    </p>
                    <details>
                        <summary>Más opciones de reproducción</summary>
                        <Segmented
                            label='Calidad'
                            value={quality}
                            options={[
                                ['auto', 'Según mi conexión'],
                                ['max', 'Máxima compatible']
                            ]}
                            onChange={setQuality}
                        />
                        <p className='studioMuted'>
                            La calidad máxima permite hasta 150 Mbps. El dispositivo y el formato pueden requerir
                            transcodificación.
                        </p>
                        <label>
                            <input
                                type='checkbox'
                                checked={!!c?.RememberAudioSelections}
                                onChange={(e) => config('RememberAudioSelections', e.target.checked)}
                            />
                            Recordar el audio elegido para cada título
                        </label>
                        <p>Calidad, normalización de audio y controles del reproductor.</p>
                        <Link to='/mypreferencesplayback'>Abrir ajustes de reproducción ↗</Link>
                    </details>
                    <div className='studioPreferenceRow'>
                        <span>Historial de reproducción</span>
                        <strong>Guardado en tu servidor</strong>
                    </div>
                    <p className='studioMuted'>No se envía a otros servidores.</p>
                </>
            )}
            <div className='studioPanelFooter'>
                <span role='status'>{message}</span>
                <button
                    className='studioAction studioAction-primary'
                    disabled={busy}
                    onClick={() => {
                        void save();
                    }}
                >
                    {busy ? 'Guardando…' : 'Guardar preferencias'}
                </button>
            </div>
        </section>
    );
}

/* eslint-enable react/jsx-no-bind */
