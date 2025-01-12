import { Telegraf, Context } from 'telegraf';
import { Agent } from '../../core/Agent';
import { ReplicantConfig, Plugin } from '../../core/interfaces';
import { Update, Message } from 'telegraf/typings/core/types/typegram';

export interface TelegramConfig extends ReplicantConfig {
    telegramToken: string;
}

export class TelegramAgent implements Plugin {
    private bot: Telegraf;
    private agent?: Agent;
    private telegramToken: string;
    public readonly name: string = 'telegram';
    public readonly version: string = '1.0.0';
    public readonly type = 'messaging' as const;

    constructor(config: TelegramConfig) {
        this.telegramToken = config.telegramToken;
        this.bot = new Telegraf(this.telegramToken);
    }

    setAgent(agent: Agent) {
        this.agent = agent;
    }

    async initialize(): Promise<void> {
        this.bot.on('message', async (ctx: Context) => {
            const message = ctx.message;
            if (!message || !('text' in message)) return;
            
            if (this.agent) {
                const response = await this.agent.processMessage({
                    role: 'user',
                    content: message.text,
                    metadata: {
                        platform: 'telegram',
                        chatId: ctx.chat?.id.toString(),
                        userId: ctx.from?.id.toString(),
                        timestamp: new Date().toISOString()
                    }
                });
                
                await ctx.reply(response.content);
            }
        });

        await this.bot.launch();
    }

    async shutdown(): Promise<void> {
        await this.bot.stop();
    }
} 