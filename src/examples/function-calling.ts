import { Agent, AnthropicProvider } from '../';
import { Message } from '../core/types';
import dotenv from 'dotenv';

dotenv.config();

// Example functions that can be called by the agent
const functions = {
    getWeather: async (location: string): Promise<string> => {
        // Simulate weather API call
        return `The weather in ${location} is sunny and 22°C`;
    },
    
    setReminder: async (time: string, message: string): Promise<string> => {
        // Simulate setting a reminder
        return `Reminder set for ${time}: ${message}`;
    },
    
    searchDatabase: async (query: string): Promise<string[]> => {
        // Simulate database search
        return [`Result 1 for "${query}"`, `Result 2 for "${query}"`];
    }
};

async function main() {
    // Initialize the agent
    const agent = new Agent({
        domain: 'function-calling',
        userId: 'function-agent',
        platform: 'cli',
        capabilities: ['text-generation', 'function-calling'],
        permissions: ['read', 'write', 'execute-functions']
    });

    // Set up AI provider with function definitions
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });

    await agent.setAIProvider(aiProvider);
    await agent.initialize();

    // Example messages that require function calling
    const messages: Message[] = [
        {
            role: 'user',
            content: 'What\'s the weather like in London?',
            metadata: {
                timestamp: new Date().toISOString(),
                platform: 'cli'
            }
        },
        {
            role: 'user',
            content: 'Set a reminder for tomorrow at 9 AM to check emails',
            metadata: {
                timestamp: new Date().toISOString(),
                platform: 'cli'
            }
        },
        {
            role: 'user',
            content: 'Search the database for recent transactions',
            metadata: {
                timestamp: new Date().toISOString(),
                platform: 'cli'
            }
        }
    ];

    // Process messages and handle function calls
    for (const message of messages) {
        console.log('\nUser:', message.content);

        const response = await agent.processMessage(message);
        console.log('Assistant:', response.content);

        // Handle function calls if present in response
        if (response.metadata?.functionCall) {
            const { name, arguments: args } = response.metadata.functionCall;
            if (name in functions) {
                try {
                    // @ts-ignore - Dynamic function call
                    const result = await functions[name](...Object.values(args));
                    console.log('Function Result:', result);

                    // Let the agent process the function result
                    const functionResponse = await agent.processMessage({
                        role: 'system',
                        content: `Function ${name} returned: ${JSON.stringify(result)}`,
                        metadata: {
                            timestamp: new Date().toISOString(),
                            platform: 'cli',
                            functionResult: true
                        }
                    });
                    console.log('Assistant:', functionResponse.content);
                } catch (error) {
                    console.error(`Error executing function ${name}:`, error);
                }
            }
        }
    }

    // Cleanup
    await agent.shutdown();
}

main().catch(console.error); 