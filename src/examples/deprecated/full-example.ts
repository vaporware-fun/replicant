import { Agent } from '../../core/Agent';
import { AnthropicProvider } from '../../integrations/ai/AnthropicProvider';
import { DiscordAgent } from '../../integrations/discord/DiscordAgent';
import { TelegramAgent } from '../../integrations/telegram/TelegramAgent';
import { InMemoryStateProvider } from '../../core/InMemoryStateProvider';
import { Message } from '../../core/interfaces';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    // Initialize the main agent
    const agent = new Agent({
        domain: 'assistant',
        userId: 'main-agent',
        platform: 'multi-platform',
        capabilities: ['chat', 'social-media'],
        permissions: ['send-messages', 'read-messages']
    });

    // Set up providers
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });

    const stateProvider = new InMemoryStateProvider();

    await agent.setAIProvider(aiProvider);
    await agent.setStateProvider(stateProvider);

    // Initialize platform-specific agents
    const discordAgent = new DiscordAgent({
        domain: 'discord',
        userId: 'discord-bot',
        platform: 'discord',
        capabilities: ['chat', 'social-media'],
        permissions: ['send-messages', 'read-messages'],
        discordToken: process.env.DISCORD_TOKEN!
    });

    const telegramAgent = new TelegramAgent({
        domain: 'telegram',
        userId: 'telegram-bot',
        platform: 'telegram',
        capabilities: ['chat', 'social-media'],
        permissions: ['send-messages', 'read-messages'],
        telegramToken: process.env.TELEGRAM_TOKEN!
    });

    // Initialize all components
    await agent.initialize();
    await discordAgent.initialize();
    await telegramAgent.initialize();

    // Set up message handlers
    discordAgent.on('message', async (message: Message) => {
        await agent.queueMessage(message);
    });

    telegramAgent.on('message', async (message: Message) => {
        await agent.queueMessage(message);
    });

    agent.on('message', async (response: Message) => {
        // Route response to appropriate platform
        if (response.metadata?.platform === 'discord') {
            await discordAgent.processMessage({
                role: 'assistant',
                content: response.content,
                metadata: {
                    channelId: response.metadata.channelId,
                    platform: 'discord'
                }
            });
        } else if (response.metadata?.platform === 'telegram') {
            await telegramAgent.processMessage({
                role: 'assistant',
                content: response.content,
                metadata: {
                    chatId: response.metadata.chatId,
                    platform: 'telegram'
                }
            });
        }
    });

    // Handle shutdown
    process.on('SIGINT', async () => {
        console.log('Shutting down...');
        await agent.shutdown();
        await discordAgent.shutdown();
        await telegramAgent.shutdown();
        process.exit(0);
    });

    console.log('Agent is running. Press Ctrl+C to exit.');
}

main().catch(console.error); 