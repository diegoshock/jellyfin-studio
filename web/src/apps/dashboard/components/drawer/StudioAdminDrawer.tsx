import React from 'react';
import { useLocation } from 'react-router-dom';
import DrawerHeaderLink from 'apps/modern/components/drawers/DrawerHeaderLink';
import ListItemLink from 'components/ListItemLink';
import StudioSettingsSearch from 'components/studio/StudioSettingsSearch';
import PluginDrawerSection from './sections/PluginDrawerSection';

const groups = [
    {
        title: 'Vista general',
        links: [
            ['Panel', '/dashboard', 'dashboard'],
            ['Salud del servidor', '/dashboard/health', 'favorite'],
            ['Actividad', '/dashboard/activity', 'history'],
            ['Dispositivos', '/dashboard/devices', 'devices']
        ]
    },
    {
        title: 'Biblioteca',
        links: [
            ['Bibliotecas', '/dashboard/libraries', 'video_library'],
            ['Metadatos', '/metadata', 'edit'],
            ['TV en directo', '/dashboard/livetv', 'live_tv'],
            ['Grabaciones', '/dashboard/livetv/recordings', 'dvr']
        ]
    },
    { title: 'Personas', links: [['Usuarios y permisos', '/dashboard/users', 'group']] },
    {
        title: 'Tu servidor',
        links: [
            ['General y rutas', '/dashboard/settings', 'tune'],
            ['Red y acceso remoto', '/dashboard/networking', 'router'],
            ['Transcodificación', '/dashboard/playback/transcoding', 'memory'],
            ['Copias de seguridad', '/dashboard/backups', 'backup'],
            ['Asistente de configuración', '/studio/setup/library', 'auto_awesome']
        ]
    },
    {
        title: 'Avanzado',
        links: [
            ['Tareas programadas', '/dashboard/tasks', 'schedule'],
            ['Registros', '/dashboard/logs', 'description'],
            ['Claves API', '/dashboard/keys', 'key'],
            ['Apariencia del servidor', '/dashboard/branding', 'palette']
        ]
    }
];
const extra = [
    [
        'Biblioteca · opciones',
        [
            ['Presentación', '/dashboard/libraries/display'],
            ['Proveedores de metadatos', '/dashboard/libraries/metadata'],
            ['Archivos NFO', '/dashboard/libraries/nfo']
        ]
    ],
    [
        'Reproducción · opciones',
        [
            ['Streaming', '/dashboard/playback/streaming'],
            ['Reanudar', '/dashboard/playback/resume'],
            ['Vistas previas', '/dashboard/playback/trickplay']
        ]
    ]
] as const;

export default function StudioAdminDrawer() {
    const { pathname } = useLocation();
    return (
        <nav className='studioAdminNavigation' aria-label='Administración'>
            <div className='studioAdminBrand'>
                <DrawerHeaderLink />
            </div>
            <StudioSettingsSearch />
            {groups.map((group) => (
                <section key={group.title}>
                    <h2>{group.title}</h2>
                    {group.links.map(([title, path, icon]) => (
                        <ListItemLink
                            key={path}
                            to={path}
                            selected={pathname === path || (path !== '/dashboard' && pathname.startsWith(path + '/'))}
                        >
                            <span className='material-icons' aria-hidden='true'>
                                {icon}
                            </span>
                            <span>{title}</span>
                        </ListItemLink>
                    ))}
                </section>
            ))}
            {extra.map(([title, links]) => (
                <details key={title} open={links.some(([, path]) => pathname === path)}>
                    <summary>{title}</summary>
                    {links.map(([label, path]) => (
                        <ListItemLink key={path} to={path} selected={pathname === path}>
                            {label}
                        </ListItemLink>
                    ))}
                </details>
            ))}
            <PluginDrawerSection />
        </nav>
    );
}
