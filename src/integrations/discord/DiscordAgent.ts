import { Client, GatewayIntentBits, Message as DiscordMessage } from 'discord.js';
import { Agent } from '../../core/Agent';
import { ReplicantConfig, Plugin } from '../../core/interfaces';
import { EventEmitter } from 'events';
import { Message } from '../../core/types';

export interface DiscordConfig extends ReplicantConfig {
    discordToken: string;
}

export class DiscordAgent extends EventEmitter implements Plugin {
    private client: Client;
    private agent?: Agent;
    private discordToken: string;
    public readonly name: string = 'discord';
    public readonly version: string = '1.0.0';
    public readonly type = 'messaging' as const;

    constructor(config: DiscordConfig) {
        super();
        this.discordToken = config.discordToken;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });
    }

    setAgent(agent: Agent) {
        this.agent = agent;
    }

    async initialize(): Promise<void> {
        this.client.on('messageCreate', async (message: DiscordMessage) => {
            if (message.author.bot) return;
            
            this.emit('message', {
                role: 'user',
                content: message.content,
                metadata: {
                    platform: 'discord',
                    channelId: message.channelId,
                    userId: message.author.id,
                    timestamp: message.createdAt.toISOString()
                }
            });
        });

        await this.client.login(this.discordToken);
    }

    async processMessage(message: Message): Promise<void> {
        const channelId = message.metadata?.channelId;
        if (!channelId) return;
        
        const channel = await this.client.channels.fetch(channelId);
        if (channel?.isTextBased() && 'send' in channel) {
            await channel.send(message.content);
        }
    }

    async shutdown(): Promise<void> {
        this.client.destroy();
    }
} 