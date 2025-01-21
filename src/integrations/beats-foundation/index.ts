import { Plugin, ReplicantConfig } from '../../core/interfaces';
import { EventEmitter } from 'events';
import { Message } from '../../core/types';
import { 
    Song, 
    GenerateSongRequest, 
    GenerationResponse, 
    PaginatedSongResponse,
    PaginationParams 
} from './types';

export interface BeatsFoundationConfig extends ReplicantConfig {
    apiKey: string;
    baseUrl?: string;
}

interface MusicPrompt {
    prompt: string;
    genre?: string;
    mood?: string;
    lyrics?: string;
    isInstrumental: boolean;
}

export class BeatsFoundationIntegration extends EventEmitter implements Plugin {
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly GENERATION_TIMEOUT = 300000; // 300 seconds
    private agent?: any;
    private beatsRunning: boolean = false;

    public readonly name = 'beats-foundation';
    public readonly version = '1.0.0';
    public readonly type = 'media' as const;

    constructor(config: BeatsFoundationConfig) {
        super();
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://www.beatsfoundation.com';
    }

    setAgent(agent: any): void {
        this.agent = agent;
    }

    async initialize(): Promise<void> {
        if (this.beatsRunning) return;
        this.beatsRunning = true;
    }

    async shutdown(): Promise<void> {
        if (!this.beatsRunning) return;
        this.beatsRunning = false;
    }

    async processMessage(message: Message): Promise<Message> {
        if (!this.beatsRunning) throw new Error('Beats Foundation integration not initialized');

        try {
            const song = await this.generateFromPrompt(message.content);
            
            return {
                role: 'assistant',
                content: `Generated song: "${song.title}"\nListen here: ${song.song_url}`,
                metadata: {
                    platform: 'beats-foundation',
                    song,
                    type: 'media',
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    private async generateFromPrompt(content: string): Promise<Song> {
        const musicPrompt = await this.synthesizePrompt(content);
        const response = await this.generateSong(musicPrompt);
        return response.song;
    }

    private async synthesizePrompt(content: string): Promise<GenerateSongRequest> {
        if (!this.agent) {
            // Fallback to basic extraction if no agent is available
            return this.extractGenerationParams(content);
        }

        const prompt = `Please analyze this request and extract musical parameters for song generation.
Format the response as JSON with these fields:
- prompt (string, max 200 chars): A clear prompt for the music generation
- genre (string, optional): The musical genre
- mood (string, optional): The emotional mood
- lyrics (string, optional): Any specific lyrics
- isInstrumental (boolean): Whether it should be instrumental

Request: "${content}"`;

        try {
            const response = await this.agent.chat.complete(prompt);
            
            if (!response?.content) {
                console.warn('AI synthesis returned no content, falling back to basic extraction');
                return this.extractGenerationParams(content);
            }

            const musicPrompt: MusicPrompt = JSON.parse(response.content);
            return {
                prompt: musicPrompt.prompt.slice(0, 200),
                genre: musicPrompt.genre,
                mood: musicPrompt.mood,
                lyrics: musicPrompt.lyrics,
                isInstrumental: musicPrompt.isInstrumental
            };
        } catch (error) {
            console.warn('Failed to parse AI prompt synthesis, falling back to basic extraction:', error);
            return this.extractGenerationParams(content);
        }
    }

    private async generateSong(params: GenerateSongRequest): Promise<GenerationResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, this.GENERATION_TIMEOUT);

        try {
            const response = await fetch(`${this.baseUrl}/api/songs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params),
                signal: controller.signal,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate song');
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Song generation timed out');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async fetchSongs(params?: PaginationParams): Promise<PaginatedSongResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());

        const url = `${this.baseUrl}/api/songs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch songs');
        }

        return await response.json();
    }

    async fetchSong(id: string): Promise<Song> {
        const response = await fetch(`${this.baseUrl}/api/songs/${id}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch song');
        }

        return await response.json();
    }

    private extractGenerationParams(content: string): GenerateSongRequest {
        // Basic parameter extraction - this could be enhanced with better parsing
        const params: GenerateSongRequest = {
            prompt: content.slice(0, 200) // Enforce 200 char limit
        };

        // Look for specific keywords in the content
        if (content.toLowerCase().includes('instrumental')) {
            params.isInstrumental = true;
        }

        // Extract genre if specified
        const genreMatch = content.match(/genre:\s*(\w+)/i);
        if (genreMatch) {
            params.genre = genreMatch[1];
        }

        // Extract mood if specified
        const moodMatch = content.match(/mood:\s*(\w+)/i);
        if (moodMatch) {
            params.mood = moodMatch[1];
        }

        // Extract lyrics if specified
        const lyricsMatch = content.match(/lyrics:\s*"([^"]+)"/i);
        if (lyricsMatch) {
            params.lyrics = lyricsMatch[1];
        }

        return params;
    }
} 