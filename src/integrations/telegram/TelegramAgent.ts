import { Telegraf, Context } from 'telegraf';
import { Agent } from '../../core/Agent';
import { VaporConfig, Plugin } from '../../core/interfaces';
import { Update, Message } from 'telegraf/typings/core/types/typegram';

export interface TelegramConfig extends VaporConfig {
    telegramToken: string;
}

export class TelegramAgent extends Agent implements Plugin {
    private bot: Telegraf;
    private telegramToken: string;
    public readonly name: string = 'telegram';
    public readonly version: string = '1.0.0';
    public readonly type: 'messaging' = 'messaging';

    constructor(config: TelegramConfig) {
        super(config);

        if (!config.telegramToken) {
            throw new Error('Telegram token is required for TelegramAgent');
        }

        this.telegramToken = config.telegramToken;
        this.bot = new Telegraf(this.telegramToken);
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        // Handle direct messages and mentions
        this.bot.on('text', async (ctx: Context<Update>) => {
            try {
                const message = ctx.message;
                if (!message || !('text' in message)) return;

                const response = await this.processMessage({
                    role: 'user',
                    content: message.text,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        chatId: ctx.chat?.id,
                        userId: ctx.from?.id,
                        platform: 'telegram'
                    }
                });

                await ctx.reply(response.content);
            } catch (error) {
                console.error('Error processing message:', error);
                await ctx.reply('Sorry, I encountered an error processing your message.');
            }
        });

        // Handle errors
        this.bot.catch((err: unknown, ctx: Context<Update>) => {
            console.error('Telegram bot error:', err);
            if (ctx.chat) {
                ctx.reply('An error occurred while processing your request.').catch(console.error);
            }
        });
    }

    async initialize(): Promise<void> {
        await super.initialize();
        try {
            await this.bot.launch();
            console.log('Telegram bot started');

            // Enable graceful stop
            process.once('SIGINT', () => this.bot.stop('SIGINT'));
            process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
        } catch (error) {
            throw new Error(`Failed to start Telegram bot: ${error}`);
        }
    }

    async shutdown(): Promise<void> {
        await this.bot.stop();
        await super.shutdown();
    }
} 