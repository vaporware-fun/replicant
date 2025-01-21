import { BeatsFoundationIntegration } from './index';
import { Message } from '../../core/types';
import { Song, PaginatedSongResponse } from './types';

describe('BeatsFoundationIntegration', () => {
    let integration: BeatsFoundationIntegration;
    let mockAgent: any;

    beforeEach(() => {
        mockAgent = {
            chat: {
                complete: jest.fn()
            }
        };

        integration = new BeatsFoundationIntegration({
            apiKey: 'test-key',
            domain: 'test',
            userId: 'test-user',
            platform: 'test',
            capabilities: [],
            permissions: []
        });
        integration.setAgent(mockAgent);
        jest.resetAllMocks();
    });

    describe('processMessage', () => {
        it('should process message and generate song', async () => {
            const mockSong = {
                id: 'test-id',
                title: 'Test Song',
                audio_url: 'https://example.com/audio.mp3',
                song_url: 'https://example.com/song',
                streams: 0,
                upvote_count: 0,
                username: 'test-user'
            };

            mockAgent.chat.complete.mockResolvedValue({
                content: JSON.stringify({
                    prompt: 'Create an upbeat pop song about summer',
                    genre: 'pop',
                    mood: 'upbeat',
                    lyrics: 'Summer days, feeling the sunshine...',
                    isInstrumental: false
                })
            });

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ song: mockSong })
            });

            const message: Message = {
                role: 'user',
                content: 'I want a happy summer song that makes people want to dance'
            };

            await integration.initialize();
            const response = await integration.processMessage(message);
            
            expect(response.role).toBe('assistant');
            expect(response.metadata?.song).toEqual(mockSong);
            expect(response.metadata?.platform).toBe('beats-foundation');
            expect(response.metadata?.type).toBe('media');
            expect(response.content).toContain(mockSong.title);
            expect(response.content).toContain(mockSong.song_url);
        });

        it('should throw error if not initialized', async () => {
            const message: Message = {
                role: 'user',
                content: 'Create a song'
            };

            await expect(integration.processMessage(message))
                .rejects.toThrow('Beats Foundation integration not initialized');
        });

        it('should handle AI synthesis failure gracefully', async () => {
            const mockSong = {
                id: 'test-id',
                title: 'Test Song',
                audio_url: 'https://example.com/audio.mp3',
                song_url: 'https://example.com/song',
                streams: 0,
                upvote_count: 0,
                username: 'test-user'
            };

            mockAgent.chat.complete.mockResolvedValue(undefined);

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ song: mockSong })
            });

            await integration.initialize();
            const response = await integration.processMessage({
                role: 'user',
                content: 'Create a happy instrumental song genre: pop mood: upbeat'
            });

            expect(response.role).toBe('assistant');
            expect(response.metadata?.song).toEqual(mockSong);
            expect(response.metadata?.type).toBe('media');
            expect(response.content).toContain(mockSong.title);
        });
    });

    describe('fetchSongs', () => {
        it('should fetch songs with pagination', async () => {
            const mockResponse: PaginatedSongResponse = {
                songs: [{
                    id: 'test-id',
                    title: 'Test Song',
                    audio_url: 'https://example.com/audio.mp3',
                    song_url: 'https://example.com/song',
                    streams: 0,
                    upvote_count: 0,
                    username: 'test-user'
                }],
                pagination: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    totalPages: 1
                }
            };

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            await integration.initialize();
            const result = await integration.fetchSongs({ page: 1, limit: 10 });
            
            expect(result).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/songs?page=1&limit=10')
            );
        });
    });

    describe('fetchSong', () => {
        it('should fetch a single song', async () => {
            const mockSong: Song = {
                id: 'test-id',
                title: 'Test Song',
                audio_url: 'https://example.com/audio.mp3',
                song_url: 'https://example.com/song',
                streams: 0,
                upvote_count: 0,
                username: 'test-user'
            };

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockSong)
            });

            await integration.initialize();
            const song = await integration.fetchSong('test-id');
            
            expect(song).toEqual(mockSong);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/songs/test-id')
            );
        });
    });
}); 