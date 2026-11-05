import type { BaseItemDto, MediaStream } from '@jellyfin/sdk/lib/generated-client';

export function movieDuration(ticks?: number | null) {
    if (!ticks || ticks < 0) return undefined;
    const minutes = Math.max(1, Math.floor(ticks / 600000000));
    if (minutes < 60) return `${minutes}m`;
    const remainder = minutes % 60;
    return [String(Math.floor(minutes / 60)) + 'h', remainder ? String(remainder) + 'm' : undefined].filter(Boolean).join(' ');
}

function audioLabel(stream: MediaStream) {
    const codec = stream.Codec?.toLowerCase();
    const codecs: Record<string, string> = { eac3: 'DD+', ac3: 'Dolby Digital', truehd: 'Dolby TrueHD', dts: 'DTS', aac: 'AAC', flac: 'FLAC', opus: 'Opus' };
    const name = codec && codecs[codec];
    if (!name) return undefined;
    const layout = /\b(?:[257]\.1|[257]\.0)\b/.exec(stream.ChannelLayout || stream.DisplayTitle || '')?.[0];
    const spatial = stream.AudioSpatialFormat === 'DolbyAtmos' ? 'Atmos' : undefined;
    return [name, spatial, layout || (stream.Channels ? `${stream.Channels} ch` : undefined)].filter(Boolean).join(' ');
}

export function movieBadges(item: BaseItemDto) {
    const source = item.MediaSources?.[0];
    const streams = source?.MediaStreams || item.MediaStreams || [];
    const video = streams.find(stream => stream.Type === 'Video');
    const audio = streams.find(stream => stream.Type === 'Audio' && stream.Index === source?.DefaultAudioStreamIndex)
        || streams.find(stream => stream.Type === 'Audio');
    const badges: string[] = [];
    if (video) {
        if ((video.Width || 0) >= 3800 || (video.Height || 0) >= 2100) badges.push('4K');
        else if ((video.Width || 0) >= 1900 || (video.Height || 0) >= 1000) badges.push('1080p');
        else if ((video.Width || 0) >= 1260 || (video.Height || 0) >= 700) badges.push('720p');
        const range = video.VideoRangeType || video.VideoRange || '';
        if (range.startsWith('DOVI') && range !== 'DOVIInvalid') badges.push('Dolby Vision');
        else if (range.includes('HDR10Plus')) badges.push('HDR10+');
        else if (range.includes('HDR10')) badges.push('HDR10');
        else if (range === 'HLG') badges.push('HLG');
        else if (range === 'HDR') badges.push('HDR');
    }
    const label = audio && audioLabel(audio);
    if (label) badges.push(label);
    return badges;
}
