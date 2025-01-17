import { Telegraf, Context } from 'telegraf';
import { Agent } from '../../core/Agent';
import { ReplicantConfig, Plugin } from '../../core/interfaces';
import { Update, Message as TelegramMessage } from 'telegraf/typings/core/types/typegram';
import { Message } from '../../core/types';

export interface TelegramConfig extends ReplicantConfig {
    telegramToken: string;
}

export class TelegramAgent extends Agent implements Plugin {
    private bot: any;
    private botRunning: boolean = false;

    public readonly name: string = 'telegram';
    public readonly version: string = '1.0.0';
    public readonly type = 'messaging' as const;

    constructor(config: TelegramConfig) {
        super(config);
        this.bot = new Telegraf(config.telegramToken);
    }

    async initialize(): Promise<void> {
        if (this.botRunning) return;

        // Initialize base agent first
        await super.initialize();

        await this.bot.launch();
        this.botRunning = true;
    }

    async shutdown(): Promise<void> {
        if (!this.botRunning) return;

        // Shutdown base agent first
        await super.shutdown();

        await this.bot.stop();
        this.botRunning = false;
    }

    private async sendMessage(chatId: string, content: string, options?: any): Promise<void> {
        if (!this.bot) throw new Error('Telegram bot not initialized');

        // Split long messages
        const chunks = this.splitMessage(content);
        for (const chunk of chunks) {
            try {
                await this.bot.telegram.sendMessage(chatId, chunk, options);
            } catch (error) {
                console.error('Error sending message:', error);
                throw error;
            }
        }
    }

    private splitMessage(content: string, maxLength: number = 4096): string[] {
        if (content.length <= maxLength) return [content];

        const chunks: string[] = [];
        let remaining = content;

        while (remaining.length > 0) {
            let chunk = remaining.slice(0, maxLength);
            const lastNewline = chunk.lastIndexOf('\n');

            // Try to split at newline if possible
            if (lastNewline > 0 && remaining.length > maxLength) {
                chunk = chunk.slice(0, lastNewline);
            }

            chunks.push(chunk);
            remaining = remaining.slice(chunk.length);
        }

        return chunks;
    }

    async processMessage(message: Message): Promise<Message> {
        if (!this.bot) throw new Error('Telegram bot not initialized');

        const { content, metadata } = message;
        if (!metadata) throw new Error('Message metadata missing');

        const chatId = metadata.chatId as string;
        if (!chatId) throw new Error('Chat ID missing');

        try {
            const mediaType = metadata.mediaType as string | undefined;
            const mediaUrl = metadata.mediaUrl as string | undefined;
            const caption = content;

            switch (mediaType) {
                case 'photo':
                    if (!mediaUrl) throw new Error('Media URL missing');
                    await this.bot.telegram.sendPhoto(chatId, mediaUrl, { caption });
                    break;

                case 'document':
                    if (!mediaUrl) throw new Error('Media URL missing');
                    await this.bot.telegram.sendDocument(chatId, mediaUrl, { caption });
                    break;

                case 'animation':
                    if (!mediaUrl) throw new Error('Media URL missing');
                    await this.bot.telegram.sendAnimation(chatId, mediaUrl, { caption });
                    break;

                case 'video':
                    if (!mediaUrl) throw new Error('Media URL missing');
                    await this.bot.telegram.sendVideo(chatId, mediaUrl, { caption });
                    break;

                case 'voice':
                    if (!mediaUrl) throw new Error('Media URL missing');
                    await this.bot.telegram.sendVoice(chatId, mediaUrl, { caption });
                    break;

                case 'location':
                    const latitude = metadata.latitude as number;
                    const longitude = metadata.longitude as number;
                    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                        throw new Error('Invalid location coordinates');
                    }
                    await this.bot.telegram.sendLocation(chatId, latitude, longitude, { caption });
                    break;

                default:
                    await this.sendMessage(chatId, content);
            }

            // Return a response message
            return {
                role: 'assistant',
                content: 'Message sent successfully',
                metadata: {
                    platform: 'telegram',
                    chatId,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }
}