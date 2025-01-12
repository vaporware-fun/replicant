import { FeedbackProvider } from './interfaces';

export class BaseFeedbackProvider implements FeedbackProvider {
    name = 'feedback';
    version = '1.0.0';
    type = 'feedback' as const;

    private feedback: Array<{
        sessionId: string;
        rating: number;
        comments?: string;
        context: Record<string, any>;
        timestamp: Date;
    }> = [];

    private readonly sentimentKeywords = {
        positive: ['great', 'helpful', 'excellent', 'good', 'love', 'amazing', 'perfect', 'thanks'],
        negative: ['bad', 'unhelpful', 'poor', 'wrong', 'terrible', 'hate', 'awful', 'confused'],
        neutral: ['okay', 'fine', 'average', 'neutral', 'unsure', 'maybe']
    };

    async initialize(): Promise<void> {
        // Initialize feedback system
    }

    async shutdown(): Promise<void> {
        // Clean up resources
        this.feedback = [];
    }

    async recordFeedback(feedback: {
        sessionId: string;
        rating: number;
        comments?: string;
        context: Record<string, any>;
    }): Promise<void> {
        this.feedback.push({
            ...feedback,
            timestamp: new Date()
        });

        // Prune old feedback if needed
        if (this.feedback.length > 10000) {
            this.feedback = this.feedback.slice(-10000);
        }
    }

    async analyzeSentiment(feedback: string): Promise<{
        sentiment: 'positive' | 'negative' | 'neutral';
        confidence: number;
    }> {
        const words = feedback.toLowerCase().split(/\s+/);
        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;

        for (const word of words) {
            if (this.sentimentKeywords.positive.includes(word)) positiveCount++;
            if (this.sentimentKeywords.negative.includes(word)) negativeCount++;
            if (this.sentimentKeywords.neutral.includes(word)) neutralCount++;
        }

        const total = positiveCount + negativeCount + neutralCount;
        if (total === 0) return { sentiment: 'neutral', confidence: 0.5 };

        const scores = {
            positive: positiveCount / total,
            negative: negativeCount / total,
            neutral: neutralCount / total
        };

        const maxScore = Math.max(scores.positive, scores.negative, scores.neutral);
        let sentiment: 'positive' | 'negative' | 'neutral';

        if (maxScore === scores.positive) sentiment = 'positive';
        else if (maxScore === scores.negative) sentiment = 'negative';
        else sentiment = 'neutral';

        return {
            sentiment,
            confidence: maxScore
        };
    }

    async getFeedbackSummary(timeframe: { 
        start: Date; 
        end: Date; 
    }): Promise<{
        averageRating: number;
        commonThemes: string[];
        improvements: string[];
    }> {
        const relevantFeedback = this.feedback.filter(
            f => f.timestamp >= timeframe.start && f.timestamp <= timeframe.end
        );

        if (relevantFeedback.length === 0) {
            return {
                averageRating: 0,
                commonThemes: [],
                improvements: []
            };
        }

        // Calculate average rating
        const averageRating = relevantFeedback.reduce(
            (sum, f) => sum + f.rating, 
            0
        ) / relevantFeedback.length;

        // Extract themes and improvements from comments
        const themes = new Map<string, number>();
        const improvements = new Map<string, number>();

        for (const feedback of relevantFeedback) {
            if (feedback.comments) {
                const words = feedback.comments.toLowerCase().split(/\s+/);
                const sentiment = await this.analyzeSentiment(feedback.comments);

                // Group consecutive words as potential themes
                for (let i = 0; i < words.length - 1; i++) {
                    const phrase = words[i] + ' ' + words[i + 1];
                    if (sentiment.sentiment === 'positive') {
                        themes.set(phrase, (themes.get(phrase) || 0) + 1);
                    } else if (sentiment.sentiment === 'negative') {
                        improvements.set(phrase, (improvements.get(phrase) || 0) + 1);
                    }
                }
            }
        }

        // Sort and get top themes and improvements
        const sortByFrequency = (map: Map<string, number>) => 
            Array.from(map.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([phrase]) => phrase);

        return {
            averageRating,
            commonThemes: sortByFrequency(themes),
            improvements: sortByFrequency(improvements)
        };
    }
} 