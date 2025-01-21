export interface BeatsFoundationError {
    error: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginatedSongResponse {
    songs: Song[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface Song {
    id: string;
    title: string;
    audio_url: string;
    streams: number;
    upvote_count: number;
    song_url: string;
    username: string;
}

export interface GenerateSongRequest {
    prompt: string;
    lyrics?: string;
    genre?: string;
    mood?: string;
    isInstrumental?: boolean;
}

export interface GenerationResponse {
    song: Song;
} 