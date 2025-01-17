import { Anthropic } from '@anthropic-ai/sdk';
import { AIProvider, Message, ModelContextProtocol, MCPMetadata, AIResponse } from '../../core/interfaces';

export interface AnthropicConfig {
    apiKey: string;
    model: string;
    maxTokens?: number;
}

export class AnthropicProvider implements AIProvider {
    private client: Anthropic;
    private config: AnthropicConfig;
    private context: ModelContextProtocol = {
        messages: [],
        metadata: {
            domain: 'general',
            conversation_id: '',
            user_id: '',
            platform: 'anthropic',
            capabilities: ['text-generation'],
            permissions: [],
            tools: []
        }
    };

    constructor(config: AnthropicConfig) {
        this.config = config;
        this.client = new Anthropic({
            apiKey: this.config.apiKey,
        });
    }

    async initialize(): Promise<void> {
        // Already initialized in constructor
    }

    async shutdown(): Promise<void> {
        // Nothing to clean up for Anthropic
    }

    async processMessage(message: Message): Promise<Message> {
        try {
            // Add the new message to the context
            this.context.messages.push(message);

            // Prepare system message with MCP context
            const systemPrompt = this.buildSystemPrompt(this.context.metadata);

            const response = await this.client.beta.messages.create({
                model: this.config.model,
                max_tokens: this.config.maxTokens || 1024,
                system: systemPrompt,
                messages: this.context.messages.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }))
            });

            const content = response.content[0].type === 'text' ? response.content[0].text : '';

            // Create the response message
            const responseMessage: Message = {
                role: 'assistant',
                content,
                metadata: {
                    confidence: 0.9,
                    reasoning: 'Generated using Anthropic Claude model',
                    emotional_state: {
                        user: 'neutral',
                        agent: 'helpful',
                        confidence: 1.0
                    },
                    context: this.context.metadata.domain
                }
            };

            // Add the response to the context
            this.context.messages.push(responseMessage);

            return responseMessage;
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    private buildSystemPrompt(metadata: MCPMetadata): string {
        const contextParts = [];

        if (metadata.domain) {
            contextParts.push(`Domain: ${metadata.domain}`);
        }

        if (metadata.capabilities?.length) {
            contextParts.push(`Capabilities: ${metadata.capabilities.join(', ')}`);
        }

        if (metadata.permissions?.length) {
            contextParts.push(`Permissions: ${metadata.permissions.join(', ')}`);
        }

        return contextParts.join('\n');
    }

    async setContext(context: ModelContextProtocol): Promise<void> {
        this.context = {
            messages: [...context.messages],
            metadata: { ...context.metadata }
        };
    }

    async clearContext(): Promise<void> {
        this.context = {
            messages: [],
            metadata: {
                domain: 'general',
                conversation_id: '',
                user_id: '',
                platform: 'anthropic',
                capabilities: ['text-generation'],
                permissions: [],
                tools: []
            }
        };
    }
} 