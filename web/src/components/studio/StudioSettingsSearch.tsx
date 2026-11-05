/* eslint-disable react/jsx-no-bind -- Small controlled forms keep event handlers next to their inputs. */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './studioPages.scss';

const settings = [
    ['Dashboard · salud · actividad · dispositivos', '/dashboard'],
    ['Bibliotecas · carpetas · escanear', '/dashboard/libraries'],
    ['Metadatos · idiomas · proveedores', '/dashboard/libraries/metadata'],
    ['Usuarios · permisos · acceso', '/dashboard/users'],
    ['Red · acceso remoto · puertos · IPv6', '/dashboard/networking'],
    ['Transcodificación · GPU · aceleración', '/dashboard/playback/transcoding'],
    ['Streaming · calidad', '/dashboard/playback/streaming'],
    ['TV en directo · sintonizadores', '/dashboard/livetv'],
    ['Tareas programadas', '/dashboard/tasks'],
    ['Plugins · extensiones', '/dashboard/plugins'],
    ['Copias de seguridad', '/dashboard/backups'],
    ['Registros · errores', '/dashboard/logs'],
    ['General · nombre del servidor', '/dashboard/settings'],
    ['Avatar · idiomas · reproducción', '/studio/preferences'],
    ['Canales · guía · géneros · maratones · fuentes', '/dashboard/channels'],
    ['Asistente de configuración', '/studio/setup/library']
];

export default function StudioSettingsSearch() {
    const [query, setQuery] = useState('');
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => {
        function key(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                input.current?.focus();
            }
        }
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, []);
    const normalize = (value: string) =>
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    return (
        <div className='studioSettingsSearch'>
            <input
                ref={input}
                type='search'
                placeholder='Buscar ajustes · Ctrl K'
                aria-label='Buscar ajustes'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
                <div className='studioSettingsResults'>
                    {settings
                        .filter(([name]) => normalize(name).includes(normalize(query)))
                        .map(([name, url]) => (
                            <Link key={url} to={url} onClick={() => setQuery('')}>
                                {name}
                            </Link>
                        ))}
                </div>
            )}
        </div>
    );
}

/* eslint-enable react/jsx-no-bind */
