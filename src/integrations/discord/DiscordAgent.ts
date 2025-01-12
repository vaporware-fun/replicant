import { Client, GatewayIntentBits, Message as DiscordMessage } from 'discord.js';
import { Agent } from '../../core/Agent';
import { VaporConfig, Plugin } from '../../core/interfaces';

export interface DiscordConfig extends VaporConfig {
    discordToken: string;
}

export class DiscordAgent extends Agent implements Plugin {
    private client: Client;
    private discordToken: string;
    public readonly name: string = 'discord';
    public readonly version: string = '1.0.0';
    public readonly type: 'messaging' = 'messaging';

    constructor(config: DiscordConfig) {
        super(config);

        if (!config.discordToken) {
            throw new Error('Discord token is required for DiscordAgent');
        }

        this.discordToken = config.discordToken;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user?.tag}`);
        });

        this.client.on('messageCreate', async (message: DiscordMessage) => {
            // Ignore messages from bots (including self)
            if (message.author.bot) return;

            // Process messages that mention the bot
            if (message.mentions.has(this.client.user!)) {
                try {
                    const content = message.content.replace(`<@${this.client.user?.id}>`, '').trim();
                    const response = await this.processMessage({
                        role: 'user',
                        content,
                        metadata: {
                            timestamp: new Date().toISOString(),
                            channelId: message.channelId,
                            userId: message.author.id,
                            platform: 'discord'
                        }
                    });

                    await message.reply(response.content);
                } catch (error) {
                    console.error('Error processing message:', error);
                    await message.reply('Sorry, I encountered an error processing your message.');
                }
            }
        });
    }

    async initialize(): Promise<void> {
        await super.initialize();
        await this.client.login(this.discordToken);
    }

    async shutdown(): Promise<void> {
        await this.client.destroy();
        await super.shutdown();
    }
} 