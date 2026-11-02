/* eslint-disable react/jsx-no-bind -- Small controlled forms keep event handlers next to their inputs. */
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from 'hooks/useApi';
import { request } from './studioApi';
import './studioPages.scss';

type Network = {
    EnableRemoteAccess?: boolean;
    PublicHttpPort?: number;
    PublicHttpsPort?: number;
    EnableIPv6?: boolean;
    PublishedServerUriBySubnet?: string[];
};
export default function StudioRemote({
    startup = false,
    saveRef
}: Readonly<{ startup?: boolean; saveRef?: { current: (() => Promise<boolean>) | null } }>) {
    const { user } = useApi();
    const [enabled, setEnabled] = useState(false);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const query = useQuery({
        queryKey: ['StudioNetwork', user?.Id],
        queryFn: () => request<Network>('System/Configuration/network'),
        enabled: startup || !!user?.Policy?.IsAdministrator
    });
    useEffect(() => {
        if (query.data) setEnabled(!!query.data.EnableRemoteAccess);
    }, [query.data]);
    async function save() {
        setBusy(true);
        setMessage('');
        try {
            await request('Startup/RemoteAccess', 'POST', { EnableRemoteAccess: enabled });
            await query.refetch();
            setMessage('Acceso remoto guardado. La conexión desde fuera aún debe verificarse.');
            return true;
        } catch {
            setMessage('No se pudo guardar el acceso remoto.');
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
    let status = query.data?.EnableRemoteAccess ? 'Acceso remoto permitido' : 'Acceso limitado a tu red';
    if (query.isPending) status = 'Consultando configuración…';
    if (query.isError) status = 'Configuración no disponible';
    return (
        <section className='studioPanel'>
            <p className='studioEyebrow'>TU SERVIDOR · FUERA DE CASA</p>
            <h1>Tu biblioteca, contigo</h1>
            <p className='studioMuted'>
                Conservamos el acceso remoto de Jellyfin. En casa, tus dispositivos se conectan directamente al
                servidor.
            </p>
            <div className='studioNetworkDiagram' aria-label='Dispositivo, red y servidor'>
                <span className='material-icons'>devices</span>
                <i />
                <span className='material-icons'>router</span>
                <i />
                <span className='material-icons'>dns</span>
            </div>
            <div className='studioNotice'>
                <strong>{status}</strong>
                <p>
                    Este estado indica la configuración de Jellyfin. No confirma que tu servidor sea accesible desde
                    Internet.
                </p>
            </div>
            <div className='studioPreferenceRow'>
                <span>Permitir conexiones remotas</span>
                <button
                    className='studioSwitch'
                    role='switch'
                    aria-label='Permitir conexiones remotas'
                    aria-checked={enabled}
                    disabled={busy || !query.data}
                    onClick={() => setEnabled(!enabled)}
                >
                    <span />
                </button>
            </div>
            <details>
                <summary>Avanzado · direcciones, puertos e IPv6</summary>
                <p>
                    La conexión exterior depende de tu router, VPN o proxy inverso. No se abrirán puertos
                    automáticamente.
                </p>
                <p>
                    Puerto HTTP público: {query.data?.PublicHttpPort ?? 'No disponible'} · HTTPS:{' '}
                    {query.data?.PublicHttpsPort ?? 'No disponible'}
                </p>
                <p>IPv6: {query.data?.EnableIPv6 ? 'Activado' : 'Desactivado'}</p>
                {!startup && <Link to='/dashboard/networking'>Abrir configuración de red ↗</Link>}
                <p>
                    <a
                        href='https://jellyfin.org/docs/general/post-install/networking/'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        Guía de acceso remoto de Jellyfin ↗
                    </a>
                </p>
            </details>
            <div className='studioPanelFooter'>
                <span role='status'>{message}</span>
                <button
                    className='studioAction studioAction-primary'
                    disabled={busy || !query.data}
                    onClick={() => {
                        void save();
                    }}
                >
                    {busy ? 'Guardando…' : 'Guardar acceso remoto'}
                </button>
            </div>
        </section>
    );
}

/* eslint-enable react/jsx-no-bind */
