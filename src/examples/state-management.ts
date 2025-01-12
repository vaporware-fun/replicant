import { InMemoryStateProvider } from '../core/InMemoryStateProvider';
import { ConversationStateData } from '../core/interfaces';

async function main() {
    const stateProvider = new InMemoryStateProvider();
    await stateProvider.initialize();

    const conversationId = 'test-conversation';
    const userId = 'test-user';

    // Initial state
    const initialState: ConversationStateData = {
        id: conversationId,
        turnCount: 0,
        lastInteraction: new Date(),
        variables: {},
        userProfile: {
            id: userId,
            preferences: {},
            history: {
                topics: [],
                interactions: 0,
                lastSeen: new Date()
            }
        },
        emotionalState: {
            user: 'neutral',
            agent: 'neutral',
            confidence: 1.0
        },
        flags: {}
    };

    // Save initial state
    await stateProvider.saveState(initialState);

    // Update state with new topic
    const stateWithTopic: ConversationStateData = {
        ...initialState,
        turnCount: 1,
        lastInteraction: new Date(),
        userProfile: {
            ...initialState.userProfile,
            history: {
                ...initialState.userProfile.history,
                topics: ['AI']
            }
        }
    };
    await stateProvider.saveState(stateWithTopic);

    // Update state with user emotion
    const stateWithEmotion: ConversationStateData = {
        ...stateWithTopic,
        turnCount: 2,
        lastInteraction: new Date(),
        emotionalState: {
            user: 'excited',
            agent: 'enthusiastic',
            confidence: 0.9
        }
    };
    await stateProvider.saveState(stateWithEmotion);

    // Update state with preferences
    const stateWithPreferences: ConversationStateData = {
        ...stateWithEmotion,
        turnCount: 3,
        lastInteraction: new Date(),
        userProfile: {
            ...stateWithEmotion.userProfile,
            preferences: {
                language: 'en',
                notifications: true
            }
        }
    };
    await stateProvider.saveState(stateWithPreferences);

    // Update state with variables
    const stateWithVariables: ConversationStateData = {
        ...stateWithPreferences,
        turnCount: 4,
        lastInteraction: new Date(),
        variables: {
            lastCommand: 'help',
            context: 'tutorial'
        }
    };
    await stateProvider.saveState(stateWithVariables);

    // Update state with flags
    const stateWithFlags: ConversationStateData = {
        ...stateWithVariables,
        turnCount: 5,
        lastInteraction: new Date(),
        flags: {
            hasCompletedTutorial: true,
            isSubscribed: false
        }
    };
    await stateProvider.saveState(stateWithFlags);

    // Load and verify final state
    const finalState = await stateProvider.loadState(conversationId);
    console.log('Final State:', finalState);

    await stateProvider.shutdown();
}

main().catch(console.error); 