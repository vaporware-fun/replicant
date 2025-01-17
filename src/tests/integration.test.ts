import { Agent } from '../core/Agent';
import { AnthropicProvider } from '../integrations/ai/AnthropicProvider';
import { TwitterAgent } from '../integrations/x/TwitterAgent';
import { DiscordAgent } from '../integrations/discord/DiscordAgent';
import { TelegramAgent } from '../integrations/telegram/TelegramAgent';
import { InMemoryStateProvider } from '../core/InMemoryStateProvider';
import { Message, ConversationStateData } from '../core/interfaces';
import { AIResponse, AIProvider, ModelContextProtocol } from '../core/interfaces';
import dotenv from 'dotenv';
import { State } from '../integrations/core/StateProvider';
import { TwitterApi } from 'twitter-api-v2';
import { Client } from 'discord.js';
import { GatewayIntentBits } from 'discord.js';
import { Anthropic } from '@anthropic-ai/sdk';

// Enable Jest's timer mocks
beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

// Mock console.error
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = jest.fn();
});

afterEach(() => {
    console.error = originalConsoleError;
});

// Mock Telegraf
jest.mock('telegraf', () => {
    return {
        Telegraf: jest.fn().mockImplementation(() => ({
            launch: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue(undefined),
            on: jest.fn(),
            telegram: {
                sendMessage: jest.fn().mockResolvedValue({}),
                sendPhoto: jest.fn().mockResolvedValue({}),
                sendDocument: jest.fn().mockResolvedValue({}),
                sendAnimation: jest.fn().mockResolvedValue({}),
                sendVideo: jest.fn().mockResolvedValue({}),
                sendVoice: jest.fn().mockResolvedValue({}),
                sendLocation: jest.fn().mockResolvedValue({})
            }
        }))
    };
});

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
    return {
        Anthropic: jest.fn().mockImplementation(() => ({
            beta: {
                messages: {
                    create: jest.fn().mockImplementation(async ({ messages, system }) => {
                        // Validate input
                        if (!messages || !Array.isArray(messages)) {
                            throw new Error('Invalid messages array');
                        }

                        // Return mock response based on system prompt
                        const response = system?.includes('error') 
                            ? Promise.reject(new Error('API Error'))
                            : Promise.resolve({
                                content: [{ 
                                    type: 'text', 
                                    text: `Mock response for context: ${system || 'default'}`
                                }]
                            });

                        return response;
                    })
                }
            }
        }))
    };
});

// Mock timer functions
jest.mock('timers', () => ({
    setInterval: jest.fn(),
    clearInterval: jest.fn()
}));

// Mock Twitter API
jest.mock('twitter-api-v2', () => {
    let tweetCount = 0;
    const mockApi = {
        v2: {
            tweet: jest.fn().mockImplementation((text: string) => {
                if (text.includes('error')) {
                    return Promise.reject(new Error('API Error'));
                }
                if (text.includes('rate limit')) {
                    return Promise.reject(new Error('429: Too Many Requests'));
                }
                tweetCount++;
                return Promise.resolve({ data: { id: `mock-tweet-id-${tweetCount}` } });
            }),
            me: jest.fn().mockResolvedValue({ data: { id: 'mock-user-id' } }),
            userMentionTimeline: jest.fn().mockResolvedValue({
                data: [
                    { 
                        id: 'mention-1', 
                        text: 'Test mention 1',
                        author_id: 'user1'
                    }
                ]
            }),
            search: jest.fn().mockResolvedValue({
                data: [
                    { 
                        id: 'tweet-1', 
                        text: 'Test tweet 1',
                        author_id: 'user1'
                    }
                ]
            })
        }
    };
    return {
        TwitterApi: jest.fn().mockImplementation(() => mockApi)
    };
});

// Mock Discord.js
jest.mock('discord.js', () => ({
    Client: jest.fn().mockImplementation(() => ({
        login: jest.fn().mockResolvedValue(undefined),
        destroy: jest.fn().mockResolvedValue(undefined),
        channels: {
            fetch: jest.fn().mockImplementation(async (channelId) => {
                if (channelId === 'invalid-channel') {
                    throw new Error('Channel not found');
                }
                return {
                    isTextBased: () => true,
                    send: jest.fn().mockImplementation(async (content) => {
                        if (content === 'error-message') {
                            throw new Error('Failed to send message');
                        }
                        return { id: 'mock-message-id' };
                    })
                };
            })
        }
    })),
    GatewayIntentBits: {
        Guilds: 1,
        GuildMessages: 2,
        MessageContent: 4
    }
}));

dotenv.config();

// Mock AI Provider
class MockAIProvider implements AIProvider {
    async initialize(): Promise<void> {}
    async shutdown(): Promise<void> {}

    async processMessage(message: Message): Promise<Message> {
        return {
            role: 'assistant',
            content: 'Mock response',
            metadata: {
                confidence: 1.0,
                reasoning: 'Mock reasoning',
                emotional_state: {
                    user: 'neutral',
                    agent: 'helpful',
                    confidence: 1.0
                }
            }
        };
    }
}

describe('Integration Tests', () => {
    let agent: Agent;
    let mockAIProvider: MockAIProvider;
    let stateProvider: InMemoryStateProvider;

    beforeEach(async () => {
        // Initialize main agent
        agent = new Agent({
            domain: 'test',
            userId: 'test-agent',
            platform: 'test',
            capabilities: ['chat', 'social-media'],
            permissions: ['send-messages', 'read-messages']
        });

        // Set up providers
        mockAIProvider = new MockAIProvider();
        stateProvider = new InMemoryStateProvider();

        // Set providers
        agent.setAIProvider(mockAIProvider);
        agent.setStateProvider(stateProvider);

        // Initialize state
        await stateProvider.saveState({
            id: 'test-agent',
            turnCount: 0,
            lastInteraction: new Date(),
            variables: {
                contextWindow: []
            },
            userProfile: {
                id: 'test-user',
                preferences: {},
                history: {
                    topics: [],
                    interactions: 0,
                    lastSeen: new Date()
                }
            },
            emotionalState: {
                user: 'neutral',
                agent: 'neutral',
                confidence: 0.8
            },
            flags: {}
        });

        await agent.initialize();
    });

    afterEach(async () => {
        await agent.shutdown();
        jest.clearAllMocks();
    });

    describe('Core Agent', () => {
        let agent: Agent;
        let stateProvider: InMemoryStateProvider;
        let mockAIProvider: any;

        beforeEach(async () => {
            stateProvider = new InMemoryStateProvider();
            mockAIProvider = {
                initialize: jest.fn().mockResolvedValue(undefined),
                shutdown: jest.fn().mockResolvedValue(undefined),
                processMessage: jest.fn().mockResolvedValue({
                    role: 'assistant',
                    content: 'Mock response',
                    metadata: {
                        emotional_state: {
                            user: 'neutral',
                            agent: 'neutral',
                            confidence: 0.8
                        }
                    }
                })
            };

            agent = new Agent({
                domain: 'test-agent',
                userId: 'test-user',
                platform: 'test',
                capabilities: ['chat'],
                permissions: ['send-messages', 'read-messages']
            });

            agent.setAIProvider(mockAIProvider);
            agent.setStateProvider(stateProvider);

            // Initialize with a saved state
            const initialState: ConversationStateData = {
                id: 'test-agent',
                turnCount: 0,
                lastInteraction: new Date(),
                variables: {
                    contextWindow: []
                },
                userProfile: {
                    id: 'test-user',
                    preferences: {},
                    history: {
                        topics: [],
                        interactions: 0,
                        lastSeen: new Date()
                    }
                },
                emotionalState: {
                    user: 'neutral',
                    agent: 'neutral',
                    confidence: 0.8
                },
                flags: {}
            };

            await stateProvider.saveState(initialState);
            await agent.initialize();
        });

        afterEach(async () => {
            if (agent) {
                await agent.shutdown();
            }
            jest.clearAllMocks();
        });

        it('should maintain state across multiple interactions', async () => {
            const messages: Message[] = [
                { role: 'user' as const, content: 'My name is Alice' },
                { role: 'user' as const, content: 'I like cats' },
                { role: 'user' as const, content: 'What is my name?' }
            ];

            for (const message of messages) {
                await agent.processMessage(message);
            }

            const state = await stateProvider.loadState('test-agent');
            expect(state).toBeDefined();
            expect(state?.variables.contextWindow).toHaveLength(6); // 3 messages + 3 responses
            expect(state?.variables.contextWindow).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ content: 'My name is Alice' }),
                    expect.objectContaining({ content: 'I like cats' }),
                    expect.objectContaining({ content: 'What is my name?' })
                ])
            );
        });

        it('should handle message queue overflow', async () => {
            const messages = Array.from({ length: 100 }, (_, i) => ({
                role: 'user' as const,
                content: `Message ${i + 1}`,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            }));

            for (const message of messages) {
                await agent.processMessage(message);
            }

            const state = await stateProvider.loadState('test-agent');
            expect(state?.variables.contextWindow.length).toBeLessThanOrEqual(100);
            expect(state?.variables.contextWindow).toContainEqual(
                expect.objectContaining({ content: 'Mock response' })
            );
            expect(state?.variables.contextWindow[0]).toEqual(
                expect.objectContaining({ content: 'Message 51' })
            );
        });

        it('should handle state provider failures gracefully', async () => {
            // Mock state provider to throw errors
            stateProvider.saveState = jest.fn().mockRejectedValue(new Error('State save failed'));

            const message: Message = {
                role: 'user' as const,
                content: 'Test message'
            };

            // Should not throw
            await expect(agent.processMessage(message)).resolves.toBeDefined();
        });

        it('should emit events for message processing', async () => {
            const message: Message = {
                role: 'user' as const,
                content: 'Test message'
            };

            const messageHandler = jest.fn();
            agent.on('message', messageHandler);

            await agent.processMessage(message);

            expect(messageHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    role: 'assistant',
                    content: 'Mock response'
                })
            );
        });
    });

    describe('Twitter Integration', () => {
        let twitterAgent: TwitterAgent;
        let twitterApiMock: any;
        let mockAIProvider: any;

        beforeEach(() => {
            // Reset timer mocks
            jest.useFakeTimers();
            
            // Mock Twitter API
            twitterApiMock = {
                v2: {
                    tweet: jest.fn().mockImplementation((text: string) => {
                        if (text.includes('error')) {
                            return Promise.reject(new Error('API Error'));
                        }
                        if (text.includes('rate limit')) {
                            return Promise.reject(new Error('429: Too Many Requests'));
                        }
                        return Promise.resolve({ data: { id: 'mock-tweet-id-1' } });
                    }),
                    me: jest.fn().mockResolvedValue({ data: { id: 'mock-user-id' } }),
                    userMentionTimeline: jest.fn().mockResolvedValue({
                        data: [
                            { 
                                id: 'mention-1', 
                                text: 'Test mention 1',
                                author_id: 'user1'
                            }
                        ]
                    }),
                    search: jest.fn().mockResolvedValue({
                        data: [
                            { 
                                id: 'tweet-1', 
                                text: 'Test tweet 1',
                                author_id: 'user1'
                            }
                        ]
                    })
                }
            };
            
            // Mock AI provider
            mockAIProvider = {
                initialize: jest.fn().mockResolvedValue(undefined),
                shutdown: jest.fn().mockResolvedValue(undefined),
                processMessage: jest.fn().mockResolvedValue({
                    role: 'assistant',
                    content: 'Mock response',
                    metadata: {
                        confidence: 0.9,
                        reasoning: 'Generated using mock AI provider',
                        platform: 'twitter',
                        tweetId: 'mock-tweet-id-1'
                    }
                })
            };

            // Initialize Twitter Agent
            twitterAgent = new TwitterAgent({
                domain: 'test-domain',
                userId: 'test-user',
                platform: 'twitter',
                capabilities: ['text-generation'],
                permissions: ['read', 'write'],
                twitterApiKey: 'test-key',
                twitterApiSecret: 'test-secret',
                twitterAccessToken: 'test-token',
                twitterAccessSecret: 'test-secret',
                monitoringRules: {
                    keywords: ['test', 'example'],
                    usernames: ['user1', 'user2']
                }
            });

            // Set providers
            twitterAgent.setStateProvider(new InMemoryStateProvider());
            twitterAgent.setAIProvider(mockAIProvider);
            (twitterAgent as any).client = twitterApiMock;
        });

        afterEach(() => {
            jest.useRealTimers();
            jest.clearAllMocks();
        });

        it('should process a message and send a tweet', async () => {
            const message: Message = {
                role: 'user' as const,
                content: 'Test tweet',
                metadata: { platform: 'twitter' }
            };

            const response = await twitterAgent.processMessage(message);
            expect(response.role).toBe('assistant');
            expect(response.content).toBe('Test tweet');
            expect(response.metadata?.platform).toBe('twitter');
            expect(response.metadata?.tweetId).toBe('mock-tweet-id-1');
        });

        it('should handle long messages by splitting them', async () => {
            const longMessage: Message = {
                role: 'user' as const,
                content: 'A'.repeat(300),
                metadata: { platform: 'twitter' }
            };

            const response = await twitterAgent.processMessage(longMessage);
            expect(response.role).toBe('assistant');
            expect(response.metadata?.tweetId).toBe('mock-tweet-id-1');
            expect(twitterApiMock.v2.tweet).toHaveBeenCalledTimes(2);
        });

        it('should handle API errors', async () => {
            const message: Message = {
                role: 'user' as const,
                content: 'error message',
                metadata: { platform: 'twitter' }
            };

            await expect(twitterAgent.processMessage(message)).rejects.toThrow('API Error');
        });

        it('should handle rate limits', async () => {
            const message: Message = {
                role: 'user' as const,
                content: 'rate limit message',
                metadata: { platform: 'twitter' }
            };

            await expect(twitterAgent.processMessage(message)).rejects.toThrow('429: Too Many Requests');
        });

        it('should initialize and start monitoring', async () => {
            const setIntervalSpy = jest.spyOn(global, 'setInterval');
            await twitterAgent.initialize();
            
            expect(setIntervalSpy).toHaveBeenCalledTimes(2);
            expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
            
            await twitterAgent.shutdown();
        });

        it('should shutdown and stop monitoring', async () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            await twitterAgent.initialize();
            
            // Create mock intervals
            const intervals = [
                setInterval(() => {}, 1000),
                setInterval(() => {}, 1000)
            ];
            
            // Store intervals in agent
            (twitterAgent as any).mentionCheckInterval = intervals[0];
            (twitterAgent as any).searchCheckInterval = intervals[1];
            
            await twitterAgent.shutdown();
            expect((twitterAgent as any).twitterRunning).toBe(false);
            expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
            intervals.forEach(interval => {
                expect(clearIntervalSpy).toHaveBeenCalledWith(interval);
            });
        });

        it('should check mentions and process them', async () => {
            await twitterAgent.initialize();
            
            // Manually trigger mention check
            await (twitterAgent as any).checkMentions();
            
            expect(twitterApiMock.v2.me).toHaveBeenCalled();
            expect(twitterApiMock.v2.userMentionTimeline).toHaveBeenCalledWith('mock-user-id', expect.objectContaining({
                since_id: undefined
            }));
            expect(mockAIProvider.processMessage).toHaveBeenCalledWith(expect.objectContaining({
                role: 'user',
                content: 'Test mention 1',
                metadata: expect.objectContaining({
                    platform: 'twitter',
                    isMention: true,
                    author_id: 'user1'
                })
            }));
            
            await twitterAgent.shutdown();
        });

        it('should check keywords and process matching tweets', async () => {
            await twitterAgent.initialize();
            
            // Manually trigger keyword check
            await (twitterAgent as any).checkKeywordsAndUsers();
            
            const expectedQuery = '(test OR example) (from:user1 OR from:user2) -is:retweet -is:quote';
            expect(twitterApiMock.v2.search).toHaveBeenCalledWith(expectedQuery, expect.objectContaining({
                since_id: undefined
            }));
            expect(mockAIProvider.processMessage).toHaveBeenCalledWith(expect.objectContaining({
                role: 'user',
                content: 'Test tweet 1',
                metadata: expect.objectContaining({
                    platform: 'twitter',
                    isKeywordMatch: true,
                    author_id: 'user1'
                })
            }));
            
            await twitterAgent.shutdown();
        });

        it('should build correct search query from monitoring rules', () => {
            const query = (twitterAgent as any).buildSearchQuery();
            expect(query).toBe('(test OR example) (from:user1 OR from:user2) -is:retweet -is:quote');
        });

        it('should throw error when client is not initialized', async () => {
            (twitterAgent as any).client = null;
            const message = {
                role: 'user' as const,
                content: 'Test message',
                metadata: { platform: 'twitter' }
            };
            
            await expect(twitterAgent.processMessage(message)).rejects.toThrow('Twitter client not initialized');
        });

        it('should handle errors in mention checking', async () => {
            await twitterAgent.initialize();
            const error = new Error('API Error');
            twitterApiMock.v2.me.mockRejectedValueOnce(error);
            
            await (twitterAgent as any).checkMentions();
            
            expect(console.error).toHaveBeenCalledWith('Error checking mentions:', expect.any(Error));
            await twitterAgent.shutdown();
        });

        it('should handle errors in keyword checking', async () => {
            await twitterAgent.initialize();
            const error = new Error('API Error');
            twitterApiMock.v2.search.mockRejectedValueOnce(error);
            
            await (twitterAgent as any).checkKeywordsAndUsers();
            
            expect(console.error).toHaveBeenCalledWith('Error checking keywords and users:', expect.any(Error));
            await twitterAgent.shutdown();
        });
    });

    describe('Discord Integration', () => {
        let discordAgent: DiscordAgent;
        let discordClientMock: any;
        let stateProvider: InMemoryStateProvider;
        let mockAIProvider: any;

        beforeEach(async () => {
            discordClientMock = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent
                ]
            });

            stateProvider = new InMemoryStateProvider();
            mockAIProvider = {
                initialize: jest.fn().mockResolvedValue(undefined),
                shutdown: jest.fn().mockResolvedValue(undefined),
                processMessage: jest.fn().mockResolvedValue({
                    role: 'assistant',
                    content: 'Mock response'
                })
            };

            discordAgent = new DiscordAgent({
                domain: 'discord-test',
                userId: 'discord-bot',
                platform: 'discord',
                capabilities: ['messaging'],
                permissions: ['send-messages', 'read-messages'],
                discordToken: 'mock-token'
            });

            // Set up the mock client before initializing
            discordAgent['client'] = discordClientMock;
            discordAgent.setStateProvider(stateProvider);
            discordAgent.setAIProvider(mockAIProvider);
            await discordAgent.initialize();
        });

        afterEach(async () => {
            await discordAgent.shutdown();
            jest.clearAllMocks();
        });

        it('should process a message and send it to Discord', async () => {
            const message: Message = {
                role: 'user',
                content: 'Test message',
                metadata: {
                    platform: 'discord',
                    channelId: 'mock-channel'
                }
            };

            const response = await discordAgent.processMessage(message);
            expect(response.role).toBe('assistant');
            expect(response.content).toBe('Test message');
            expect(response.metadata?.platform).toBe('discord');
            expect(response.metadata?.channelId).toBe('mock-channel');
        });

        it('should handle long messages by splitting them', async () => {
            const longMessage: Message = {
                role: 'user',
                content: 'A'.repeat(2500),
                metadata: {
                    platform: 'discord',
                    channelId: 'mock-channel'
                }
            };

            const response = await discordAgent.processMessage(longMessage);
            expect(response.role).toBe('assistant');
            expect(response.metadata?.channelId).toBe('mock-channel');
        });

        it('should handle channel fetch errors', async () => {
            // Set up the mock to reject
            discordClientMock.channels.fetch.mockRejectedValueOnce(new Error('Channel not found'));

            const message: Message = {
                role: 'user',
                content: 'Test message',
                metadata: {
                    platform: 'discord',
                    channelId: 'invalid-channel'
                }
            };

            await expect(discordAgent.processMessage(message)).rejects.toThrow('Channel not found');
        });

        it('should handle message send errors', async () => {
            const message: Message = {
                role: 'user',
                content: 'error-message',
                metadata: {
                    platform: 'discord',
                    channelId: 'mock-channel'
                }
            };

            await expect(discordAgent.processMessage(message)).rejects.toThrow('Failed to send message');
        });
    });

    describe('Telegram Integration', () => {
        let telegramAgent: TelegramAgent;
        let telegramBotMock: any;
        let stateProvider: InMemoryStateProvider;
        let mockAIProvider: any;

        beforeEach(async () => {
            telegramBotMock = {
                launch: jest.fn().mockResolvedValue(undefined),
                stop: jest.fn().mockResolvedValue(undefined),
                telegram: {
                    sendMessage: jest.fn().mockResolvedValue({}),
                    sendPhoto: jest.fn().mockResolvedValue({}),
                    sendDocument: jest.fn().mockResolvedValue({}),
                    sendAnimation: jest.fn().mockResolvedValue({}),
                    sendVideo: jest.fn().mockResolvedValue({}),
                    sendVoice: jest.fn().mockResolvedValue({}),
                    sendLocation: jest.fn().mockResolvedValue({})
                }
            };

            stateProvider = new InMemoryStateProvider();
            mockAIProvider = {
                initialize: jest.fn().mockResolvedValue(undefined),
                shutdown: jest.fn().mockResolvedValue(undefined),
                processMessage: jest.fn().mockResolvedValue({
                    role: 'assistant',
                    content: 'Mock response',
                    metadata: {
                        emotional_state: {
                            user: 'neutral',
                            agent: 'neutral',
                            confidence: 0.8
                        }
                    }
                })
            };

            telegramAgent = new TelegramAgent({
                domain: 'telegram-test',
                userId: 'telegram-bot',
                platform: 'telegram',
                capabilities: ['messaging'],
                permissions: ['send-messages', 'read-messages'],
                telegramToken: 'mock-token'
            });

            telegramAgent.setAIProvider(mockAIProvider);
            telegramAgent.setStateProvider(stateProvider);
            telegramAgent['bot'] = telegramBotMock;
            await telegramAgent.initialize();
        });

        it('should handle text messages', async () => {
            const message: Message = {
                role: 'user',
                content: 'Test message',
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    timestamp: new Date().toISOString()
                }
            };

            await telegramAgent.processMessage(message);
            expect(telegramBotMock.telegram.sendMessage).toHaveBeenCalledWith('123', 'Test message', undefined);
        });

        it('should handle messages with images', async () => {
            const message: Message = {
                role: 'user',
                content: 'Test image',
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    mediaType: 'photo',
                    mediaUrl: 'https://example.com/image.jpg',
                    timestamp: new Date().toISOString()
                }
            };

            await telegramAgent.processMessage(message);
            expect(telegramBotMock.telegram.sendPhoto).toHaveBeenCalledWith('123', 'https://example.com/image.jpg', { caption: 'Test image' });
        });

        it('should handle messages with documents', async () => {
            const message: Message = {
                role: 'user',
                content: 'Test document',
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    mediaType: 'document',
                    mediaUrl: 'https://example.com/document.pdf',
                    timestamp: new Date().toISOString()
                }
            };

            await telegramAgent.processMessage(message);
            expect(telegramBotMock.telegram.sendDocument).toHaveBeenCalledWith('123', 'https://example.com/document.pdf', { caption: 'Test document' });
        });

        it('should handle messages with animations', async () => {
            const message: Message = {
                role: 'user',
                content: 'Test animation',
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    mediaType: 'animation',
                    mediaUrl: 'https://example.com/animation.gif',
                    timestamp: new Date().toISOString()
                }
            };

            await telegramAgent.processMessage(message);
            expect(telegramBotMock.telegram.sendAnimation).toHaveBeenCalledWith('123', 'https://example.com/animation.gif', { caption: 'Test animation' });
        });

        it('should handle messages with videos', async () => {
            const message: Message = {
                role: 'user',
                content: 'Test video',
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    mediaType: 'video',
                    mediaUrl: 'https://example.com/video.mp4',
                    timestamp: new Date().toISOString()
                }
            };

            await telegramAgent.processMessage(message);
            expect(telegramBotMock.telegram.sendVideo).toHaveBeenCalledWith('123', 'https://example.com/video.mp4', { caption: 'Test video' });
        });

        it('should handle messages with voice notes', async () => {
            const message: Message = {
                role: 'user',
                content: 'Test voice note',
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    mediaType: 'voice',
                    mediaUrl: 'https://example.com/voice.ogg',
                    timestamp: new Date().toISOString()
                }
            };

            await telegramAgent.processMessage(message);
            expect(telegramBotMock.telegram.sendVoice).toHaveBeenCalledWith('123', 'https://example.com/voice.ogg', { caption: 'Test voice note' });
        });

        it('should handle messages with location', async () => {
            const message: Message = {
                role: 'user',
                content: 'Test location',
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    mediaType: 'location',
                    latitude: 40.7128,
                    longitude: -74.0060,
                    timestamp: new Date().toISOString()
                }
            };

            await telegramAgent.processMessage(message);
            expect(telegramBotMock.telegram.sendLocation).toHaveBeenCalledWith('123', 40.7128, -74.0060, { caption: 'Test location' });
        });

        it('should handle message send failure', async () => {
            telegramBotMock.telegram.sendMessage.mockRejectedValueOnce(new Error('Failed to send message'));

            const message: Message = {
                role: 'user',
                content: 'Test message',
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    timestamp: new Date().toISOString()
                }
            };

            await expect(telegramAgent.processMessage(message)).rejects.toThrow('Failed to send message');
        });

        it('should handle rate limits', async () => {
            telegramBotMock.telegram.sendMessage.mockRejectedValueOnce(new Error('429: Too Many Requests'));

            const message: Message = {
                role: 'user',
                content: 'Test message',
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    timestamp: new Date().toISOString()
                }
            };

            await expect(telegramAgent.processMessage(message)).rejects.toThrow('429: Too Many Requests');
        });

        it('should handle initialization failure', async () => {
            const failingAgent = new TelegramAgent({
                domain: 'telegram-test',
                userId: 'telegram-bot',
                platform: 'telegram',
                capabilities: ['messaging'],
                permissions: ['send-messages', 'read-messages'],
                telegramToken: 'invalid-token'
            });

            failingAgent.setAIProvider(mockAIProvider);
            failingAgent.setStateProvider(stateProvider);

            telegramBotMock.launch.mockRejectedValueOnce(new Error('Invalid token'));
            failingAgent['bot'] = telegramBotMock;

            await expect(failingAgent.initialize()).rejects.toThrow('Invalid token');
        });

        it('should handle long messages', async () => {
            const longMessage: Message = {
                role: 'user',
                content: 'A'.repeat(5000),
                metadata: {
                    platform: 'telegram',
                    chatId: '123',
                    timestamp: new Date().toISOString()
                }
            };

            await telegramAgent.processMessage(longMessage);
            expect(telegramBotMock.telegram.sendMessage).toHaveBeenCalledTimes(2);
            expect(telegramBotMock.telegram.sendMessage.mock.calls[0][1].length).toBeLessThanOrEqual(4096);
            expect(telegramBotMock.telegram.sendMessage.mock.calls[1][1].length).toBeLessThanOrEqual(4096);
        });
    });

    describe('Anthropic Integration', () => {
        let anthropicProvider: AnthropicProvider;
        let mockAnthropicClient: any;

        beforeEach(() => {
            mockAnthropicClient = new Anthropic({
                apiKey: 'mock-key'
            });

            anthropicProvider = new AnthropicProvider({
                apiKey: 'mock-key',
                model: 'claude-3-opus-20240229'
            });

            // Set up the mock client
            (anthropicProvider as any).client = mockAnthropicClient;
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should process messages with proper context', async () => {
            const message = {
                role: 'user' as const,
                content: 'Test message',
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };

            const context = {
                messages: [message],
                metadata: {
                    domain: 'test-domain',
                    conversation_id: 'test-conv',
                    user_id: 'test-user',
                    platform: 'anthropic',
                    capabilities: ['text-generation'],
                    permissions: ['read-messages'],
                    tools: []
                }
            };

            await anthropicProvider.setContext(context);
            const response = await anthropicProvider.processMessage(message);

            expect(response).toBeDefined();
            expect(response.role).toBe('assistant');
            expect(response.content).toContain('Mock response for context');
            expect(response.metadata?.confidence).toBe(0.9);
            expect(mockAnthropicClient.beta.messages.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'claude-3-opus-20240229',
                    system: expect.stringContaining('Domain: test-domain')
                })
            );
        });

        it('should handle API errors gracefully', async () => {
            const message = {
                role: 'user' as const,
                content: 'Test message'
            };

            const context = {
                messages: [message],
                metadata: {
                    domain: 'error',
                    conversation_id: '',
                    user_id: '',
                    platform: 'anthropic',
                    capabilities: [],
                    permissions: [],
                    tools: []
                }
            };

            await anthropicProvider.setContext(context);
            await expect(anthropicProvider.processMessage(message)).rejects.toThrow('API Error');
        });

        it('should maintain context between messages', async () => {
            const messages = [
                { role: 'user' as const, content: 'First message' },
                { role: 'user' as const, content: 'Second message' }
            ];

            const context = {
                messages: [],
                metadata: {
                    domain: 'test-domain',
                    conversation_id: 'test-conv',
                    user_id: 'test-user',
                    platform: 'anthropic',
                    capabilities: ['text-generation'],
                    permissions: ['read-messages'],
                    tools: []
                }
            };

            await anthropicProvider.setContext(context);

            for (const message of messages) {
                await anthropicProvider.processMessage(message);
            }

            expect(mockAnthropicClient.beta.messages.create).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({ content: 'First message' }),
                        expect.objectContaining({ content: 'Second message' })
                    ])
                })
            );
        });

        it('should clear context correctly', async () => {
            const message = {
                role: 'user' as const,
                content: 'Test message'
            };

            await anthropicProvider.clearContext();
            const response = await anthropicProvider.processMessage(message);

            expect(response.metadata?.context).toBe('general');
            expect(mockAnthropicClient.beta.messages.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({ content: 'Test message' })
                    ])
                })
            );
        });
    });
}); 