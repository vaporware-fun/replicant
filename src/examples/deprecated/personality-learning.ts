import { Agent } from '../../core/Agent';
import { BasePersonalityProvider } from '../../core/BasePersonalityProvider';
import { PersonalityProfile, Message } from '../../core/interfaces';

async function main() {
    // Create an agent with a custom personality
    const agent = new Agent({
        domain: 'customer-service',
        userId: 'agent-1',
        platform: 'chat',
        capabilities: ['text-generation', 'personality', 'learning'],
        permissions: ['read', 'write'],
        userPreferences: {
            language: 'en',
            timezone: 'UTC'
        }
    });

    // Create a personality provider with a specific profile
    const personalityProvider = new BasePersonalityProvider();
    await personalityProvider.initialize();

    // Customize the personality
    const customPersonality: Partial<PersonalityProfile> = {
        traits: [
            {
                name: 'empathy',
                value: 0.9,
                description: 'Strong ability to understand and share user feelings'
            },
            {
                name: 'patience',
                value: 0.85,
                description: 'High tolerance and willingness to explain thoroughly'
            },
            {
                name: 'adaptability',
                value: 0.8,
                description: 'Quick to adjust approach based on user needs'
            }
        ],
        voice: {
            tone: 'warm and supportive',
            style: 'conversational',
            vocabulary: 'moderate'
        },
        background: {
            experiences: [
                'Helping users with technical issues',
                'Explaining complex concepts simply',
                'Building rapport with users'
            ],
            knowledge: [
                'Technical troubleshooting',
                'Customer service best practices',
                'Clear communication techniques'
            ],
            values: [
                'User satisfaction',
                'Clear communication',
                'Continuous improvement',
                'Empathy in interactions'
            ]
        },
        adaptability: {
            learningRate: 0.9,
            contextSensitivity: 0.85,
            emotionalIntelligence: 0.9
        }
    };

    await personalityProvider.updatePersonality(customPersonality);
    await agent.setPersonalityProvider(personalityProvider);

    // Initialize the agent
    await agent.initialize();

    // Set up event listeners
    agent.on('message', (message: Message) => {
        console.log('\nAgent:', message.content);
        if (message.metadata?.reasoning) {
            console.log('Reasoning:', message.metadata.reasoning);
        }
        if (message.metadata?.confidence) {
            console.log('Confidence:', message.metadata.confidence);
        }
    });

    // Simulate a conversation that tests different aspects of personality
    const conversation = [
        {
            content: "I'm really frustrated with this product. Nothing seems to work!",
            metadata: { emotion: 'angry', context: 'technical-support' }
        },
        {
            content: "I don't understand what you mean by 'API endpoint'. Can you explain it more simply?",
            metadata: { emotion: 'confused', context: 'technical-explanation' }
        },
        {
            content: "Thank you for being so patient with me. I think I'm starting to understand.",
            metadata: { emotion: 'grateful', context: 'learning' }
        },
        {
            content: "I'm worried about implementing this in production. What if something goes wrong?",
            metadata: { emotion: 'anxious', context: 'implementation' }
        }
    ];

    // Process each message and provide feedback
    for (const message of conversation) {
        console.log('\nUser:', message.content);
        
        const response = await agent.processMessage({
            role: 'user',
            content: message.content,
            metadata: message.metadata
        });

        // Simulate user feedback based on the response
        const feedback = calculateFeedback(response);
        response.metadata = {
            ...response.metadata,
            feedback
        };

        // Record the experience
        await personalityProvider.recordExperience({
            type: 'conversation',
            content: `User: ${message.content}\nAgent: ${response.content}`,
            outcome: feedback > 0.7 ? 'positive' : feedback > 0.3 ? 'neutral' : 'negative',
            learnings: [
                `User emotion: ${message.metadata.emotion}`,
                `Context: ${message.metadata.context}`,
                `Response effectiveness: ${feedback}`
            ]
        });
    }

    // Get the final personality state
    const finalPersonality = await personalityProvider.getPersonality();
    console.log('\nFinal Personality Profile:', JSON.stringify(finalPersonality, null, 2));

    // Clean up
    await agent.shutdown();
}

function calculateFeedback(response: any): number {
    // Simulate feedback calculation based on response quality
    const hasReasoning = response.metadata?.reasoning ? 0.3 : 0;
    const hasHighConfidence = (response.metadata?.confidence || 0) > 0.8 ? 0.3 : 0;
    const hasPersonality = response.metadata?.personality ? 0.4 : 0;
    
    return hasReasoning + hasHighConfidence + hasPersonality;
}

// Run the example
main().catch(console.error); 