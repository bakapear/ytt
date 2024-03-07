import { YouTubeSearch, YouTubeVideo, YouTubeChannel, YouTubePlaylist, YouTubeFormats, YouTubeTranscript } from './src/lib/structs.js'

enum Period { 'hour', 'day', 'week', 'month', 'year' }
enum Type { 'video', 'channel', 'playlist', 'movie' }
enum Duration { 'short', 'long', 'medium' }
enum Features { 'live', '4k', 'hd', 'subtitles', 'cc', '360', 'vr180', '3d', 'hdr', 'location', 'purchased' }
enum Sort { 'relevance', 'rating', 'age', 'views' }

interface SearchFilters {
    period: keyof typeof Period
    type: keyof typeof Type
    duration: keyof typeof Duration
    features: keyof typeof Features
    sort: keyof typeof Sort
}


export declare function resolve(value: string) : Promise<object>
export declare function search(query: string, filters?: SearchFilters): Promise<YouTubeSearch>
export declare function video(videoId: string): Promise<YouTubeVideo>
export declare function channel(channelId: string): Promise<YouTubeChannel>
export declare function playlist(playlistId: string, startIndex?: number): Promise<YouTubePlaylist>
export declare function download(videoId: string): Promise<YouTubeFormats>
export declare function transcript(videoId: string, lang?: string): Promise<YouTubeTranscript>
export declare function complete(query: string, lang?: string): Promise<string[]>
