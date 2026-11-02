import React from 'react';
import { NavLink } from 'react-router-dom';
import './studioPages.scss';

export default function StudioNav() {
    return (
        <nav className='studioNav' aria-label='Navegación principal'>
            <NavLink to='/home'>Inicio</NavLink>
            <NavLink to='/studio/browse'>Explorar</NavLink>
            <NavLink to='/studio/live'>Canales</NavLink>
            <NavLink to='/studio/discover'>Descubrir</NavLink>
        </nav>
    );
}
