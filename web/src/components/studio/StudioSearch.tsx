import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import globalize from 'lib/globalize';

export default function StudioSearch() {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const submit = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();
            navigate(`/search?query=${encodeURIComponent(query)}`);
        },
        [navigate, query]
    );
    const change = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), []);
    return (
        <form className='studioHeaderSearch' onSubmit={submit} role='search'>
            <span className='material-icons' aria-hidden='true'>
                search
            </span>
            <input
                type='search'
                aria-label={globalize.translate('Search')}
                value={query}
                onChange={change}
                placeholder={globalize.translate('Search')}
            />
        </form>
    );
}
