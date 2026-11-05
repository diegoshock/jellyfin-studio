import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import DOMPurify from 'dompurify';
import ResizeObserver from 'resize-observer-polyfill';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useUserTheme } from 'hooks/useUserTheme';
import globalize from 'lib/globalize';

import { movieBadges, movieDuration } from './moviePresentation';
import './studioMovieDetails.scss';

function MovieSynopsis({ text }: Readonly<{ text: string }>) {
    const [expanded, setExpanded] = useState(false);
    const [canExpand, setCanExpand] = useState(false);
    const paragraph = useRef<HTMLParagraphElement>(null);
    const toggleOverview = useCallback(() => setExpanded(value => !value), []);
    useLayoutEffect(() => {
        const element = paragraph.current;
        if (!element || expanded) return;
        const measure = () => setCanExpand(element.scrollHeight > element.clientHeight + 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [text, expanded]);
    return (
        <>
            <p ref={paragraph} className={`studioMovieSynopsis${expanded ? ' expanded' : ''}`}>{text}</p>
            {canExpand && <button className='studioMovieExpand' onClick={toggleOverview}>{globalize.translate(expanded ? 'ShowLess' : 'ShowMore')}</button>}
        </>
    );
}

export default function StudioMovieDetails({ item, page }: Readonly<{ item: BaseItemDto; page: HTMLElement }>) {
    const { theme } = useUserTheme();

    useLayoutEffect(() => {
        if (theme !== 'studio') return;
        const content = page.querySelector('.detailPagePrimaryContent');
        const destination = page.querySelector('.studioMovieExtraDetailsContent');
        const parent = content?.parentNode;
        const next = content?.nextSibling;
        if (!content || !destination || !parent) return;
        destination.appendChild(content);
        return () => {
            parent.insertBefore(content, next || null);
        };
    }, [page, theme]);

    if (theme !== 'studio') return null;
    const duration = movieDuration(item.RunTimeTicks);
    const badges = movieBadges(item);
    // eslint-disable-next-line @typescript-eslint/naming-convention -- DOMPurify defines these uppercase configuration keys.
    const overview = DOMPurify.sanitize(item.Overview || '', { 'ALLOWED_TAGS': [], 'ALLOWED_ATTR': [] });
    const critic = item.CriticRating;
    const community = item.CommunityRating;

    return (
        <div className='studioMovieSummary'>
            <h1>{item.Name}</h1>
            {!!item.Taglines?.[0] && <p className='studioMovieTagline'>{item.Taglines[0]}</p>}
            <div className='studioMovieRatings'>
                {critic != null && critic >= 0 && critic <= 100 && <span>Crítica <strong>{critic}%</strong></span>}
                {community != null && community >= 0 && community <= 10 && <span>Comunidad <strong>{community.toFixed(1)}/10</strong></span>}
            </div>
            <div className='studioMovieFacts'>
                {!!item.ProductionYear && <span>{item.ProductionYear}</span>}
                {duration && <span>{duration}</span>}
                {!!item.Genres?.length && <span>{item.Genres.slice(0, 3).join(' · ')}</span>}
                {item.OfficialRating && <span className='studioMovieBadge'>{item.OfficialRating}</span>}
                {badges.map(badge => <span className='studioMovieBadge' key={badge}>{badge}</span>)}
            </div>
            {overview && <MovieSynopsis key={item.Id} text={overview} />}
        </div>
    );
}
