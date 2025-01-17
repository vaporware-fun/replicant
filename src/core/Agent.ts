import { AIProvider, Message, StateProvider, ConversationStateData } from './interfaces';
import { EventEmitter } from 'events';

export class Agent extends EventEmitter {
    private domain: string;
    private userId: string;
    private platform: string;
    private capabilities: string[];
    private permissions: string[];
    private aiProvider?: AIProvider;
    private stateProvider?: StateProvider;
    private isRunning: boolean = false;

    constructor(config: {
        domain: string;
        userId: string;
        platform: string;
        capabilities: string[];
        permissions: string[];
    }) {
        super();
        this.domain = config.domain;
        this.userId = config.userId;
        this.platform = config.platform;
        this.capabilities = config.capabilities;
        this.permissions = config.permissions;
    }

    setAIProvider(provider: AIProvider) {
        this.aiProvider = provider;
    }

    protected getAIProvider(): AIProvider | undefined {
        return this.aiProvider;
    }

    setStateProvider(provider: StateProvider) {
        this.stateProvider = provider;
    }

    async initialize(): Promise<void> {
        if (!this.stateProvider) {
            throw new Error('State provider not set');
        }
        if (!this.aiProvider) {
            throw new Error('AI provider not set');
        }

        await this.stateProvider.initialize();
        await this.aiProvider.initialize();
        this.isRunning = true;
    }

    async shutdown(): Promise<void> {
        if (!this.isRunning) return;

        if (this.stateProvider) {
            await this.stateProvider.shutdown();
        }
        if (this.aiProvider) {
            await this.aiProvider.shutdown();
        }
        this.isRunning = false;
    }

    async processMessage(message: Message): Promise<Message> {
        if (!this.isRunning) {
            throw new Error('Agent not running');
        }
        if (!this.stateProvider) {
            throw new Error('State provider not set');
        }
        if (!this.aiProvider) {
            throw new Error('AI provider not set');
        }

        try {
            // Load state
            const state = await this.stateProvider.loadState(this.domain);
            if (!state) {
                // Initialize new state
                const newState: ConversationStateData = {
                    id: this.domain,
                    turnCount: 0,
                    lastInteraction: new Date(),
                    variables: {
                        contextWindow: []
                    },
                    userProfile: {
                        id: this.userId,
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
                await this.stateProvider.saveState(newState);
            }

            // Process message
            const response = await this.aiProvider.processMessage(message);

            // Update state
            await this.updateContextWindow(message, response);

            // Emit event
            this.emit('message', response);

            return response;
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    private async updateContextWindow(message: Message, response: Message): Promise<void> {
        if (!this.stateProvider) {
            throw new Error('State provider not set');
        }

        try {
            const state = await this.stateProvider.loadState(this.domain);
            if (!state) {
                throw new Error('State not found');
            }

            // Keep only last 98 messages to make room for new message and response
            if (state.variables.contextWindow.length >= 98) {
                state.variables.contextWindow = state.variables.contextWindow.slice(-98);
            }

            // Add new message and response
            state.variables.contextWindow.push(message);
            state.variables.contextWindow.push(response);

            // Update last interaction
            state.lastInteraction = new Date();

            // Increment turn count
            state.turnCount++;

            // Update emotional state if available
            if (response.metadata?.emotional_state) {
                state.emotionalState = response.metadata.emotional_state;
            }

            await this.stateProvider.saveState(state);
        } catch (error) {
            console.error('Error updating context window:', error);
            // Don't throw, just log the error
        }
    }
} 