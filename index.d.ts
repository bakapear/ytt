import { YoutubeSearch, YoutubeVideo, YoutubeChannel, YoutubePlaylist, YoutubeFormats, YoutubeTranscript, YoutubeComment } from "./src/lib/structs";

export declare function resolve(value: string) : Promise<object>
export declare function search(query: string, filters?: object): Promise<YoutubeSearch>
export declare function video(videoId: string): Promise<YoutubeVideo>
export declare function channel(channelId: string): Promise<YoutubeChannel>
export declare function playlist(playlistId: string, startIndex?: number): Promise<YoutubePlaylist>
export declare function comments(videoId: string, commentId?: string): Promise<YoutubeComment[]>
export declare function download(videoId: string): Promise<YoutubeFormats>
export declare function transcript(videoId: string): Promise<YoutubeTranscript>
export declare function complete(query: string, lang?: string): Promise<string[]>
