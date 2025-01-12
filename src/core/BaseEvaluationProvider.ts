import { EvaluationProvider, AIResponse } from './interfaces';

export class BaseEvaluationProvider implements EvaluationProvider {
    name = 'evaluation';
    version = '1.0.0';
    type = 'evaluation' as const;

    private benchmarkResults: Map<string, {
        accuracy: number;
        latency: number;
        consistency: number;
        timestamp: Date;
    }> = new Map();

    async initialize(): Promise<void> {
        // Initialize evaluation system
    }

    async shutdown(): Promise<void> {
        // Clean up resources
        this.benchmarkResults.clear();
    }

    async evaluateResponse(
        response: AIResponse, 
        criteria: Record<string, (response: AIResponse) => number>
    ): Promise<Record<string, number>> {
        const results: Record<string, number> = {};
        
        for (const [name, evaluator] of Object.entries(criteria)) {
            try {
                results[name] = evaluator(response);
            } catch (error) {
                console.error(`Failed to evaluate criterion ${name}:`, error);
                results[name] = 0;
            }
        }

        return results;
    }

    async benchmarkAgent(tests: Array<{ 
        input: string; 
        expectedOutput: string;
    }>): Promise<{
        accuracy: number;
        latency: number;
        consistency: number;
    }> {
        const results = {
            accuracy: 0,
            latency: 0,
            consistency: 0
        };

        const startTime = Date.now();
        const scores: number[] = [];

        for (const test of tests) {
            const testStartTime = Date.now();
            
            try {
                // Calculate similarity score (simple example - in production use better metrics)
                const score = this.calculateSimilarity(test.expectedOutput, test.input);
                scores.push(score);
                
                results.latency += Date.now() - testStartTime;
            } catch (error) {
                console.error('Test failed:', error);
                scores.push(0);
            }
        }

        // Calculate final metrics
        results.accuracy = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        results.latency /= tests.length; // Average latency
        results.consistency = 1 - this.calculateStandardDeviation(scores);

        return results;
    }

    async compareAgents(agentIds: string[], scenario: string): Promise<Record<string, number>> {
        const results: Record<string, number> = {};

        for (const agentId of agentIds) {
            const benchmarkResult = this.benchmarkResults.get(agentId);
            if (benchmarkResult) {
                results[agentId] = (
                    benchmarkResult.accuracy * 0.4 + 
                    (1000 / Math.max(1, benchmarkResult.latency)) * 0.3 + 
                    benchmarkResult.consistency * 0.3
                );
            } else {
                results[agentId] = 0;
            }
        }

        return results;
    }

    private calculateSimilarity(str1: string, str2: string): number {
        // Simple Jaccard similarity - in production use more sophisticated metrics
        const set1 = new Set(str1.toLowerCase().split(/\s+/));
        const set2 = new Set(str2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    private calculateStandardDeviation(numbers: number[]): number {
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const squareDiffs = numbers.map(num => Math.pow(num - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((sum, num) => sum + num, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }
} 