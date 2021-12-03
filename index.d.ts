import { YoutubeSearch, YoutubeVideo, YoutubeChannel, YoutubePlaylist, YoutubeFormats, YoutubeTranscript } from "./src/lib/structure";

export declare function resolve(value: string) : Promise<object>
export declare function search(value: string, opts?: object): Promise<YoutubeSearch>
export declare function video(value: string): Promise<YoutubeVideo>
export declare function channel(value: string): Promise<YoutubeChannel>
export declare function playlist(value: string, opts?: object): Promise<YoutubePlaylist>
export declare function download(value: string): Promise<YoutubeFormats>
export declare function transcript(value: string): Promise<YoutubeTranscript>
export declare function complete(value: string, lang?: string): Promise<string[]>
