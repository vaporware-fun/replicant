import { Client, GatewayIntentBits, Message as DiscordMessage } from 'discord.js';
import { Agent } from '../../core/Agent';
import { ReplicantConfig, Plugin } from '../../core/interfaces';
import { EventEmitter } from 'events';
import { Message } from '../../core/types';

export interface DiscordConfig extends ReplicantConfig {
    discordToken: string;
}

export class DiscordAgent extends Agent implements Plugin {
    private client: any;
    private config: DiscordConfig;
    private discordRunning: boolean = false;

    public readonly name: string = 'discord';
    public readonly version: string = '1.0.0';
    public readonly type = 'social' as const;

    constructor(config: DiscordConfig) {
        super(config);
        this.config = config;
    }

    async initialize(): Promise<void> {
        await super.initialize();
        if (this.discordRunning) return;

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        await this.client.login(this.config.discordToken);
        this.discordRunning = true;
    }

    async shutdown(): Promise<void> {
        await super.shutdown();
        if (!this.discordRunning) return;

        await this.client?.destroy();
        this.discordRunning = false;
    }

    async processMessage(message: Message): Promise<Message> {
        if (!this.client) throw new Error('Discord client not initialized');
        if (!message.metadata?.channelId) throw new Error('Channel ID is required');

        try {
            const channel = await this.client.channels.fetch(message.metadata.channelId);
            if (!channel?.isTextBased()) throw new Error('Channel is not text-based');

            // Split long messages
            if (message.content.length > 2000) {
                const parts = this.splitMessage(message.content);
                for (const part of parts) {
                    await channel.send(part);
                }
            } else {
                await channel.send(message.content);
            }

            return {
                role: 'assistant',
                content: message.content,
                metadata: {
                    platform: 'discord',
                    channelId: message.metadata.channelId,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    private splitMessage(content: string): string[] {
        const parts: string[] = [];
        let remaining = content;
        const maxLength = 2000;

        while (remaining.length > 0) {
            if (remaining.length <= maxLength) {
                parts.push(remaining);
                break;
            }

            // Find last space within maxLength
            let splitIndex = remaining.lastIndexOf(' ', maxLength);
            if (splitIndex === -1) {
                splitIndex = maxLength;
            }

            parts.push(remaining.substring(0, splitIndex));
            remaining = remaining.substring(splitIndex + 1);
        }

        return parts;
    }
} 