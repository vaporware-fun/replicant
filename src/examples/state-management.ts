import { Agent, AnthropicProvider } from '../';
import { InMemoryStateProvider } from '../core/InMemoryStateProvider';
import { ConversationStateData } from '../core/interfaces';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Initialize the agent
    const agent = new Agent({
        domain: 'stateful-chat',
        userId: 'stateful-agent',
        platform: 'cli',
        capabilities: ['text-generation'],
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

    // Initialize the agent
    await agent.initialize();

    // Example conversation with state tracking
    const conversation: ConversationStateData = {
        id: 'demo-conversation',
        turnCount: 0,
        lastInteraction: new Date(),
        variables: {
            topic: 'state management',
            userPreference: 'technical'
        },
        userProfile: {
            id: 'demo-user',
            preferences: {
                language: 'English',
                expertise: 'developer'
            },
            history: {
                topics: ['state management'],
                interactions: 0,
                lastSeen: new Date()
            }
        },
        emotionalState: {
            user: 'neutral',
            agent: 'professional',
            confidence: 1.0
        },
        flags: {
            isNewUser: true,
            needsHelp: false
        }
    };

    // Save initial state
    await stateProvider.saveState(conversation);

    // Process some messages
    const messages = [
        "How does state management work?",
        "Can you remember my preferences?",
        "What was my first question?"
    ];

    for (const content of messages) {
        // Update conversation state
        const currentState = await stateProvider.loadState('demo-conversation');
        if (currentState) {
            currentState.turnCount++;
            currentState.lastInteraction = new Date();
            currentState.userProfile.history.interactions++;
            await stateProvider.saveState(currentState);
        }

        // Process message
        console.log('\nUser:', content);
        const response = await agent.processMessage({
            role: 'user',
            content,
            metadata: {
                timestamp: new Date().toISOString(),
                platform: 'cli',
                conversationId: 'demo-conversation'
            }
        });
        console.log('Assistant:', response.content);

        // Show current state
        const updatedState = await stateProvider.loadState('demo-conversation');
        console.log('\nCurrent State:', JSON.stringify(updatedState, null, 2), '\n');
    }

    // Cleanup
    await agent.shutdown();
}

main().catch(console.error); 