import { Telegraf, Context } from 'telegraf';
import { Agent } from '../../core/Agent';
import { ReplicantConfig, Plugin } from '../../core/interfaces';
import { Update, Message as TelegramMessage } from 'telegraf/typings/core/types/typegram';
import { EventEmitter } from 'events';
import { Message } from '../../core/types';

export interface TelegramConfig extends ReplicantConfig {
    telegramToken: string;
}

export class TelegramAgent extends EventEmitter implements Plugin {
    private bot: Telegraf;
    private agent?: Agent;
    private telegramToken: string;
    public readonly name: string = 'telegram';
    public readonly version: string = '1.0.0';
    public readonly type = 'messaging' as const;

    constructor(config: TelegramConfig) {
        super();
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
            
            this.emit('message', {
                role: 'user',
                content: message.text,
                metadata: {
                    platform: 'telegram',
                    chatId: ctx.chat?.id.toString(),
                    userId: ctx.from?.id.toString(),
                    timestamp: new Date().toISOString()
                }
            });
        });

        await this.bot.launch();
    }

    async processMessage(message: Message): Promise<void> {
        const chatId = message.metadata?.chatId;
        if (!chatId) return;
        
        await this.bot.telegram.sendMessage(chatId, message.content);
    }

    async shutdown(): Promise<void> {
        await this.bot.stop();
    }
}