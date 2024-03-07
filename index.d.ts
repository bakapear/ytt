import { YouTubeSearch, YouTubeVideo, YouTubeChannel, YouTubePlaylist, YouTubeFormats, YouTubeTranscript, YouTubeComment } from "./src/lib/structs";

export declare function resolve(value: string) : Promise<object>
export declare function search(query: string, filters?: object): Promise<YouTubeSearch>
export declare function video(videoId: string): Promise<YouTubeVideo>
export declare function channel(channelId: string): Promise<YouTubeChannel>
export declare function playlist(playlistId: string, startIndex?: number): Promise<YouTubePlaylist>
export declare function download(videoId: string): Promise<YouTubeFormats>
export declare function transcript(videoId: string, lang?: string): Promise<YouTubeTranscript>
export declare function complete(query: string, lang?: string): Promise<string[]>
