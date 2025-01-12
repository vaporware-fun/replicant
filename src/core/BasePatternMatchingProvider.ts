import { PatternMatchingProvider, PatternRule, KeywordPriority } from './interfaces';

export class BasePatternMatchingProvider implements PatternMatchingProvider {
    private patterns: PatternRule[] = [];
    private keywordPriorities: KeywordPriority[] = [];

    async initialize(): Promise<void> {
        // Initialize with default patterns if needed
    }

    async shutdown(): Promise<void> {
        // Clean up if needed
    }

    async addPattern(pattern: PatternRule): Promise<void> {
        this.patterns.push(pattern);
        // Sort patterns by priority
        this.patterns.sort((a, b) => b.priority - a.priority);
    }

    async removePattern(pattern: string | RegExp): Promise<void> {
        this.patterns = this.patterns.filter(p => 
            p.pattern.toString() !== pattern.toString()
        );
    }

    async setKeywordPriorities(priorities: KeywordPriority[]): Promise<void> {
        this.keywordPriorities = priorities.sort((a, b) => b.weight - a.weight);
    }

    async findMatches(input: string, context: Record<string, any>): Promise<Array<{
        pattern: PatternRule;
        matches: string[];
        score: number;
    }>> {
        const matches: Array<{
            pattern: PatternRule;
            matches: string[];
            score: number;
        }> = [];

        for (const pattern of this.patterns) {
            // Check context requirements
            if (pattern.context) {
                const { required = [], forbidden = [] } = pattern.context;
                const contextKeys = Object.keys(context);
                
                if (required.some(key => !contextKeys.includes(key))) continue;
                if (forbidden.some(key => contextKeys.includes(key))) continue;
            }

            // Try to match pattern
            const regex = typeof pattern.pattern === 'string' 
                ? new RegExp(pattern.pattern, 'i')
                : pattern.pattern;

            const matchResult = input.match(regex);
            if (matchResult) {
                // Calculate score based on priority and keyword weights
                let score = pattern.priority;
                
                // Add keyword weights
                for (const kp of this.keywordPriorities) {
                    if (input.toLowerCase().includes(kp.keyword.toLowerCase()) &&
                        (!kp.contexts.length || kp.contexts.some(c => context[c]))) {
                        score += kp.weight;
                    }
                }

                matches.push({
                    pattern,
                    matches: matchResult.slice(1),
                    score
                });
            }
        }

        return matches.sort((a, b) => b.score - a.score);
    }

    async transform(input: string, patterns: PatternRule[]): Promise<{
        output: string;
        transformations: string[];
        reasoning: string;
    }> {
        let output = input;
        const transformations: string[] = [];
        const reasoningSteps: string[] = [];

        for (const pattern of patterns) {
            for (const transformation of pattern.transformations) {
                const regex = typeof transformation.from === 'string'
                    ? new RegExp(transformation.from, 'gi')
                    : transformation.from;

                const matches = output.match(regex);
                if (matches) {
                    const oldOutput = output;
                    if (typeof transformation.to === 'function') {
                        output = output.replace(regex, (...args) => {
                            const fn = transformation.to as (matches: string[]) => string;
                            return fn(args);
                        });
                    } else {
                        output = output.replace(regex, transformation.to as string);
                    }

                    if (output !== oldOutput) {
                        transformations.push(`${oldOutput} -> ${output}`);
                        reasoningSteps.push(
                            `Applied transformation: ${transformation.from} -> ${transformation.to}`
                        );
                    }
                }
            }
        }

        return {
            output,
            transformations,
            reasoning: reasoningSteps.join('\n')
        };
    }
} 