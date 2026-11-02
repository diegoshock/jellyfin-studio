import React from 'react';

export const avatarNames = ['Zorro', 'Gato', 'Robot', 'Búho', 'Panda', 'Conejo', 'Astronauta', 'Oso'];
export const avatarColors = ['#bf4863', '#36b9a0', '#729fe8', '#ac83df', '#dfb85c', '#de8ab7', '#66c1d3', '#d88a57'];

/** Original vector portraits. No external image service or copied characters. */
export default function StudioAvatar({ index = 0 }: Readonly<{ index?: number }>) {
    const kind = Math.abs(index) % avatarNames.length;
    const color = avatarColors[kind];
    return (
        <svg viewBox='0 0 100 100' role='img' aria-label={avatarNames[kind]}>
            <circle cx='50' cy='50' r='49' fill='#12232b' />
            {kind % 3 === 0 ? (
                <path d='M22 44 L20 15 L43 29 L60 29 L81 15 L78 46' fill={color} stroke='#091117' strokeWidth='3' />
            ) : (
                <>
                    <circle cx='26' cy='31' r='13' fill={color} />
                    <circle cx='74' cy='31' r='13' fill={color} />
                </>
            )}
            <rect x='22' y='29' width='56' height='52' rx={kind === 2 ? 12 : 26} fill={color} />
            <path d='M28 57 Q50 46 72 57 L66 77 Q50 88 34 77Z' fill='#fff0d9' />
            <ellipse cx='37' cy='49' rx='4' ry='6' fill='#101c27' />
            <ellipse cx='63' cy='49' rx='4' ry='6' fill='#101c27' />
            <circle cx='38' cy='47' r='1.5' fill='white' />
            <circle cx='64' cy='47' r='1.5' fill='white' />
            <path d='M44 62 Q50 58 56 62 L50 68Z' fill='#15232b' />
            <path d='M42 71 Q50 78 58 71' fill='none' stroke='#15232b' strokeWidth='2.5' strokeLinecap='round' />
            <circle cx='30' cy='60' r='4' fill='#ee95a2' opacity='.6' />
            <circle cx='70' cy='60' r='4' fill='#ee95a2' opacity='.6' />
            {kind === 2 && <path d='M50 28V17M44 16H56' stroke={color} strokeWidth='5' strokeLinecap='round' />}
            {kind === 6 && <circle cx='50' cy='51' r='36' fill='none' stroke='#d6e8f0' strokeWidth='5' />}
        </svg>
    );
}
