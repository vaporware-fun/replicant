import { Agent, DiscordAgent, AnthropicProvider } from '../';
import { InMemoryStateProvider } from '../core/InMemoryStateProvider';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Initialize main agent
    const agent = new Agent({
        domain: 'discord-bot',
        userId: 'discord-assistant',
        platform: 'discord',
        capabilities: ['text-generation', 'chat'],
        permissions: ['read', 'write']
    });

    // Set up providers
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });

    const stateProvider = new InMemoryStateProvider();

    await agent.setAIProvider(aiProvider);
    await agent.setStateProvider(stateProvider);

    // Initialize Discord agent
    const discordAgent = new DiscordAgent({
        domain: 'discord',
        userId: 'discord-bot',
        platform: 'discord',
        capabilities: ['chat'],
        permissions: ['send-messages', 'read-messages'],
        discordToken: process.env.DISCORD_TOKEN!
    });

    // Set up message handling
    discordAgent.on('message', async (message) => {
        console.log(`Received message from ${message.metadata?.userId}: ${message.content}`);
        await agent.queueMessage(message);
    });

    agent.on('message', async (response) => {
        if (response.metadata?.platform === 'discord') {
            console.log(`Sending response to ${response.metadata.channelId}: ${response.content}`);
            await discordAgent.processMessage(response);
        }
    });

    // Initialize everything
    await agent.initialize();
    await discordAgent.initialize();

    console.log('Discord bot is running! Press Ctrl+C to exit.');

    // Handle shutdown
    process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await agent.shutdown();
        await discordAgent.shutdown();
        process.exit(0);
    });
}

main().catch(console.error); 