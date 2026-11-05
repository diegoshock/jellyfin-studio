import { describe, expect, it } from 'vitest';
import { movieBadges, movieDuration } from './moviePresentation';

describe('Movie presentation from actual media metadata', () => {
    it('formats duration and does not invent missing runtimes', () => {
        expect(movieDuration(145 * 600000000)).toBe('2h 25m');
        expect(movieDuration(120 * 600000000)).toBe('2h');
        expect(movieDuration(20 * 10000000)).toBe('1m');
        expect(movieDuration(null)).toBeUndefined();
        expect(movieDuration(-1)).toBeUndefined();
    });

    it('uses the default audio track and verified spatial audio', () => {
        expect(movieBadges({ MediaSources: [{ DefaultAudioStreamIndex: 2, MediaStreams: [
            { Type: 'Video', Width: 3840, Height: 1600, VideoRangeType: 'HDR10' },
            { Type: 'Audio', Index: 1, Codec: 'aac', Channels: 2 },
            { Type: 'Audio', Index: 2, Codec: 'eac3', ChannelLayout: '5.1(side)', AudioSpatialFormat: 'DolbyAtmos' }
        ] }] })).toEqual(['4K', 'HDR10', 'DD+ Atmos 5.1']);
    });

    it('does not infer Atmos from Dolby Digital Plus or surround channels', () => {
        expect(movieBadges({ MediaStreams: [{ Type: 'Audio', Codec: 'eac3', Channels: 6 }] })).toEqual(['DD+ 6 ch']);
        expect(movieBadges({})).toEqual([]);
    });

    it('recognizes Dolby Vision while ignoring invalid or absent HDR information', () => {
        expect(movieBadges({ MediaStreams: [{ Type: 'Video', Width: 1920, VideoRangeType: 'DOVI' }] })).toEqual(['1080p', 'Dolby Vision']);
        expect(movieBadges({ MediaStreams: [{ Type: 'Video', Width: 1920, VideoRangeType: 'DOVIInvalid' }] })).toEqual(['1080p']);
    });
});
