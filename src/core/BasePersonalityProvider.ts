import { PersonalityProvider, PersonalityProfile, ModelContextProtocol, EmotionalState, ConversationExample, ResponsePattern, AIResponse } from './interfaces';

export class BasePersonalityProvider implements PersonalityProvider {
    private personality: PersonalityProfile = {
        traits: [
            {
                name: 'openness',
                value: 0.7,
                description: 'Curiosity and openness to new experiences'
            },
            {
                name: 'conscientiousness',
                value: 0.8,
                description: 'Organized and responsible approach'
            },
            {
                name: 'extraversion',
                value: 0.6,
                description: 'Engaging and sociable demeanor'
            },
            {
                name: 'agreeableness',
                value: 0.75,
                description: 'Friendly and cooperative nature'
            },
            {
                name: 'stability',
                value: 0.7,
                description: 'Emotional balance and resilience'
            }
        ],
        voice: {
            tone: 'friendly and professional',
            style: 'conversational',
            vocabulary: 'moderate'
        },
        background: {
            experiences: [
                'Helping users solve problems',
                'Learning from interactions',
                'Adapting to different contexts'
            ],
            knowledge: [
                'General conversation',
                'Problem-solving',
                'Social interaction'
            ],
            values: [
                'Helpfulness',
                'Honesty',
                'Continuous learning',
                'Respect for users'
            ]
        },
        adaptability: {
            learningRate: 0.8,
            contextSensitivity: 0.85,
            emotionalIntelligence: 0.75
        },
        examples: [],
        responsePatterns: []
    };

    private experiences: Array<{
        type: string;
        content: string;
        outcome: 'positive' | 'negative' | 'neutral';
        learnings: string[];
        timestamp: Date;
    }> = [];

    async initialize(): Promise<void> {
        // Nothing to initialize for base implementation
    }

    async shutdown(): Promise<void> {
        // Nothing to clean up
    }

    async getPersonality(): Promise<PersonalityProfile> {
        return this.personality;
    }

    async updatePersonality(updates: Partial<PersonalityProfile>): Promise<void> {
        this.personality = {
            ...this.personality,
            ...updates,
            adaptability: {
                ...this.personality.adaptability,
                ...updates.adaptability
            }
        };
    }

    async recordExperience(experience: {
        type: string;
        content: string;
        outcome: 'positive' | 'negative' | 'neutral';
        learnings: string[];
    }): Promise<void> {
        this.experiences.push({
            ...experience,
            timestamp: new Date()
        });

        // Update personality based on experience
        const adaptabilityUpdate = {
            learningRate: this.calculateLearningRateAdjustment(experience),
            contextSensitivity: this.calculateContextSensitivityAdjustment(experience),
            emotionalIntelligence: this.calculateEmotionalIntelligenceAdjustment(experience)
        };

        await this.updatePersonality({
            adaptability: adaptabilityUpdate
        });
    }

    async generateResponse(input: {
        message: string;
        context: ModelContextProtocol;
        emotionalState: EmotionalState;
    }): Promise<AIResponse> {
        // Find matching examples
        const relevantExample = this.findRelevantExample(input.message, input.emotionalState);
        
        // Find matching response patterns
        const relevantPattern = this.findRelevantPattern(input.message, input.emotionalState);
        
        // Generate response based on personality profile
        let response: string;
        let confidence: number;
        let reasoning: string;
        
        if (relevantExample) {
            // Adapt example response based on current context
            response = this.adaptExampleResponse(relevantExample, input);
            confidence = 0.9;
            reasoning = `Using adapted example: ${relevantExample.explanation}`;
        } else if (relevantPattern) {
            // Use response pattern
            response = this.generateFromPattern(relevantPattern, input);
            confidence = 0.8;
            reasoning = `Using response pattern for ${relevantPattern.trigger.type}: ${relevantPattern.trigger.value}`;
        } else {
            // Fallback to basic response
            response = "I understand and I'm here to help.";
            confidence = 0.6;
            reasoning = "Using fallback response due to no matching patterns";
        }

        return {
            content: this.applyPersonalityStyle(response),
            confidence,
            reasoning,
            metadata: {
                emotional_state: this.determineEmotionalResponse(input.emotionalState),
                context: input.context.metadata.domain
            }
        };
    }

    private findRelevantExample(message: string, emotionalState: EmotionalState): ConversationExample | null {
        return this.personality.examples.find(example => {
            const emotionMatch = example.emotion === emotionalState.user;
            const contentMatch = message.toLowerCase().includes(example.input.toLowerCase());
            return emotionMatch || contentMatch;
        }) || null;
    }

    private findRelevantPattern(message: string, emotionalState: EmotionalState): ResponsePattern | null {
        return this.personality.responsePatterns.find(pattern => {
            if (pattern.trigger.type === 'emotion') {
                return pattern.trigger.value === emotionalState.user;
            }
            if (pattern.trigger.type === 'keyword') {
                return message.toLowerCase().includes(pattern.trigger.value.toLowerCase());
            }
            return false;
        }) || null;
    }

    private adaptExampleResponse(example: ConversationExample, input: {
        message: string;
        context: ModelContextProtocol;
        emotionalState: EmotionalState;
    }): string {
        // Start with the example response
        let response = example.response;
        
        // Adapt based on current context
        if (input.context.metadata.domain !== example.context) {
            response = this.adjustResponseForContext(response, input.context.metadata.domain);
        }
        
        return response;
    }

    private generateFromPattern(pattern: ResponsePattern, input: {
        message: string;
        context: ModelContextProtocol;
        emotionalState: EmotionalState;
    }): string {
        // Select a template based on context and emotional state
        const templateIndex = Math.floor(Math.random() * pattern.templates.length);
        let response = pattern.templates[templateIndex];
        
        // Adjust response based on pattern style
        if (pattern.style.formality === 'formal') {
            response = this.makeResponseFormal(response);
        }
        
        return response;
    }

    private applyPersonalityStyle(response: string): string {
        // Apply common phrases if appropriate
        if (this.personality.voice.commonPhrases) {
            const shouldAddPhrase = Math.random() < 0.3; // 30% chance
            if (shouldAddPhrase) {
                const phrase = this.personality.voice.commonPhrases[
                    Math.floor(Math.random() * this.personality.voice.commonPhrases.length)
                ];
                response = `${phrase} ${response}`;
            }
        }
        
        return response;
    }

    private determineEmotionalResponse(userEmotion: EmotionalState): EmotionalState {
        // Adjust agent's emotional state based on user's emotion and personality traits
        const empathy = this.personality.traits.find(t => t.name === 'empathy')?.value || 0.5;
        
        return {
            user: userEmotion.user,
            agent: this.calculateAgentEmotion(userEmotion.user, empathy),
            confidence: 0.8
        };
    }

    private calculateAgentEmotion(userEmotion: string, empathy: number): string {
        // Map user emotions to appropriate agent responses based on empathy level
        const emotionMap: Record<string, string> = {
            angry: empathy > 0.7 ? 'understanding' : 'neutral',
            frustrated: empathy > 0.7 ? 'supportive' : 'helpful',
            confused: empathy > 0.7 ? 'patient' : 'informative',
            happy: empathy > 0.7 ? 'enthusiastic' : 'positive'
        };
        
        return emotionMap[userEmotion] || 'neutral';
    }

    private adjustResponseForContext(response: string, domain?: string): string {
        if (!domain) return response;
        return response;
    }

    private adjustForCustomerService(text: string): string {
        return `As your support representative, ${text}`;
    }

    private adjustForTechnicalSupport(text: string): string {
        return `From a technical perspective, ${text}`;
    }

    private adjustForSales(text: string): string {
        return `Looking at this from a business perspective, ${text}`;
    }

    private makeResponseFormal(response: string): string {
        // Simple formality adjustments
        return response
            .replace(/don't/g, 'do not')
            .replace(/can't/g, 'cannot')
            .replace(/won't/g, 'will not')
            .replace(/I'm/g, 'I am');
    }

    async evolvePersonality(feedback: {
        interactions: Array<{
            input: string;
            response: string;
            feedback: number;
        }>;
        timeframe: {
            start: Date;
            end: Date;
        };
    }): Promise<{
        changes: Partial<PersonalityProfile>;
        reasoning: string;
    }> {
        const relevantExperiences = this.experiences.filter(
            exp => exp.timestamp >= feedback.timeframe.start && exp.timestamp <= feedback.timeframe.end
        );

        const averageFeedback = feedback.interactions.reduce((sum, i) => sum + i.feedback, 0) 
            / feedback.interactions.length;

        // Adjust traits based on feedback and experiences
        const traitAdjustments = this.calculateTraitAdjustments(averageFeedback, relevantExperiences);

        const changes: Partial<PersonalityProfile> = {
            traits: this.personality.traits.map(trait => ({
                ...trait,
                value: Math.max(0, Math.min(1, trait.value + (traitAdjustments[trait.name] || 0)))
            }))
        };

        return {
            changes,
            reasoning: this.generateEvolutionReasoning(changes, feedback, relevantExperiences)
        };
    }

    private calculateLearningRateAdjustment(experience: {
        outcome: 'positive' | 'negative' | 'neutral';
        learnings: string[];
    }): number {
        const currentRate = this.personality.adaptability.learningRate;
        const adjustment = experience.outcome === 'positive' ? 0.01 : -0.005;
        return Math.max(0, Math.min(1, currentRate + adjustment));
    }

    private calculateContextSensitivityAdjustment(experience: {
        type: string;
        outcome: 'positive' | 'negative' | 'neutral';
    }): number {
        const currentSensitivity = this.personality.adaptability.contextSensitivity;
        const adjustment = experience.outcome === 'positive' ? 0.01 : -0.005;
        return Math.max(0, Math.min(1, currentSensitivity + adjustment));
    }

    private calculateEmotionalIntelligenceAdjustment(experience: {
        type: string;
        outcome: 'positive' | 'negative' | 'neutral';
    }): number {
        const currentEI = this.personality.adaptability.emotionalIntelligence;
        const adjustment = experience.outcome === 'positive' ? 0.01 : -0.005;
        return Math.max(0, Math.min(1, currentEI + adjustment));
    }

    private calculateTraitAdjustments(averageFeedback: number, experiences: Array<{
        type: string;
        outcome: 'positive' | 'negative' | 'neutral';
    }>): Record<string, number> {
        const adjustments: Record<string, number> = {};
        const baseAdjustment = 0.01;

        // Calculate adjustments based on feedback and experiences
        this.personality.traits.forEach(trait => {
            const positiveExperiences = experiences.filter(e => e.outcome === 'positive').length;
            const totalExperiences = experiences.length;
            const successRate = totalExperiences > 0 ? positiveExperiences / totalExperiences : 0;

            adjustments[trait.name] = baseAdjustment * (averageFeedback * 0.5 + successRate * 0.5);
        });

        return adjustments;
    }

    private generateEvolutionReasoning(
        changes: Partial<PersonalityProfile>,
        feedback: { interactions: Array<{ feedback: number }> },
        experiences: Array<{ outcome: string }>
    ): string {
        const averageFeedback = feedback.interactions.reduce((sum, i) => sum + i.feedback, 0) 
            / feedback.interactions.length;
        const positiveExperiences = experiences.filter(e => e.outcome === 'positive').length;
        const totalExperiences = experiences.length;

        return `Personality evolved based on ${totalExperiences} experiences ` +
            `(${positiveExperiences} positive) and average feedback of ${averageFeedback.toFixed(2)}. ` +
            `Adjustments made to maintain optimal interaction quality and learning capability.`;
    }
} 