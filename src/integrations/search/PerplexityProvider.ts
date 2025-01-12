import { SearchProvider, SearchResult } from '../../core/interfaces';
import axios from 'axios';

interface PerplexitySearchResponse {
    results: Array<{
        text: string;
        url: string;
        timestamp: string;
        relevance: number;
        title?: string;
        author?: string;
        publish_date?: string;
    }>;
}

interface PerplexitySummaryResponse {
    summary: string;
}

export class PerplexityProvider implements SearchProvider {
    name = 'perplexity';
    version = '1.0.0';
    type = 'search' as const;

    private apiKey: string;
    private baseUrl = 'https://api.perplexity.ai';

    constructor(config: { apiKey: string }) {
        this.apiKey = config.apiKey;
    }

    async initialize(): Promise<void> {
        // Verify API key and connection
        try {
            await this.validateApiKey();
        } catch (error: any) {
            throw new Error('Failed to initialize Perplexity provider: ' + (error.message || 'Unknown error'));
        }
    }

    async shutdown(): Promise<void> {
        // Nothing to clean up
    }

    async search(query: string, options: {
        maxResults?: number;
        minRelevance?: number;
        recency?: 'hour' | 'day' | 'week' | 'month' | 'any';
    } = {}): Promise<SearchResult[]> {
        const { maxResults = 5, minRelevance = 0.7, recency = 'any' } = options;

        try {
            const response = await axios.post<PerplexitySearchResponse>(
                `${this.baseUrl}/search`,
                {
                    query,
                    max_results: maxResults,
                    recency: recency === 'any' ? undefined : recency
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.results
                .filter(result => result.relevance >= minRelevance)
                .map(result => ({
                    content: result.text,
                    source: result.url,
                    timestamp: new Date(result.timestamp),
                    relevance: result.relevance,
                    metadata: {
                        title: result.title,
                        url: result.url,
                        author: result.author,
                        publishDate: result.publish_date ? new Date(result.publish_date) : undefined
                    }
                }));
        } catch (error: any) {
            throw new Error('Failed to search Perplexity: ' + (error.message || 'Unknown error'));
        }
    }

    async validateSource(source: string): Promise<boolean> {
        try {
            const response = await axios.get(source);
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async summarizeResults(results: SearchResult[]): Promise<string> {
        if (results.length === 0) return 'No results found.';

        try {
            const response = await axios.post<PerplexitySummaryResponse>(
                `${this.baseUrl}/summarize`,
                {
                    texts: results.map(r => r.content)
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.summary;
        } catch (error: any) {
            // Fallback to basic summary if API fails
            return results
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, 3)
                .map(r => r.content)
                .join('\n\n');
        }
    }

    private async validateApiKey(): Promise<void> {
        try {
            await axios.get(`${this.baseUrl}/validate`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
        } catch (error) {
            throw new Error('Invalid API key or API unavailable');
        }
    }
} 