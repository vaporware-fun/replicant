import { Agent, AnthropicProvider } from '../';
import { createInterface } from 'readline';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Initialize the agent
    const agent = new Agent({
        domain: 'chat',
        userId: 'cli-user',
        platform: 'cli',
        capabilities: ['text-generation'],
        permissions: ['read', 'write']
    });

    // Set up AI provider
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });
    await agent.setAIProvider(aiProvider);

    // Initialize the agent
    await agent.initialize();

    // Set up CLI interface
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('Chat initialized. Type "exit" to quit.\n');

    // Main chat loop
    while (true) {
        const input = await new Promise<string>(resolve => {
            rl.question('You: ', resolve);
        });

        if (input.toLowerCase() === 'exit') {
            break;
        }

        // Process user message
        const response = await agent.processMessage({
            role: 'user',
            content: input,
            metadata: {
                timestamp: new Date().toISOString(),
                platform: 'cli'
            }
        });

        console.log('\nAssistant:', response.content, '\n');
    }

    // Cleanup
    rl.close();
    await agent.shutdown();
}

main().catch(console.error); 