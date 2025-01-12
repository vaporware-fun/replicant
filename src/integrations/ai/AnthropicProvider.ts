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
    private context: ModelContextProtocol;

    constructor(config: AnthropicConfig) {
        this.config = config;
        this.client = new Anthropic({
            apiKey: this.config.apiKey,
        });
        this.context = {
            messages: [],
            metadata: {
                domain: 'general',
                conversation_id: '',
                user_id: '',
                platform: 'anthropic',
                capabilities: ['text-generation', 'conversation'],
                permissions: [],
                tools: []
            }
        };
    }

    async initialize(): Promise<void> {
        // Already initialized in constructor
    }

    async shutdown(): Promise<void> {
        // Nothing to clean up for Anthropic
    }

    async processMessage(message: Message, context: ModelContextProtocol): Promise<AIResponse> {
        this.context = context;
        
        // Prepare system message with MCP context if it's not already present
        const systemPrompt = this.buildSystemPrompt(context.metadata);

        const response = await this.client.beta.messages.create({
            model: this.config.model,
            max_tokens: this.config.maxTokens || 1024,
            system: systemPrompt,
            messages: context.messages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }))
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';

        return {
            content,
            confidence: 0.9,
            reasoning: 'Generated using Anthropic Claude model',
            metadata: {
                emotional_state: {
                    user: 'neutral',
                    agent: 'helpful',
                    confidence: 1.0
                },
                variables: {},
                context: context.metadata.domain
            }
        };
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
        this.context = context;
    }

    async clearContext(): Promise<void> {
        this.context = {
            messages: [],
            metadata: {
                domain: 'general',
                conversation_id: '',
                user_id: '',
                platform: 'anthropic',
                capabilities: ['text-generation', 'conversation'],
                permissions: [],
                tools: []
            }
        };
    }
} 