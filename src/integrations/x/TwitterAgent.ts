import { TwitterApi } from 'twitter-api-v2';
import { Agent } from '../../core/Agent';
import { ReplicantConfig, Plugin } from '../../core/interfaces';
import { EventEmitter } from 'events';
import { Message } from '../../core/types';

export interface TwitterMonitoringRules {
    keywords?: string[];           // Keywords to monitor
    usernames?: string[];         // Usernames to monitor
    includeRetweets?: boolean;    // Whether to include retweets
    includeQuotes?: boolean;      // Whether to include quote tweets
    replyProbability?: number;    // Probability of replying (0-1)
    quoteProbability?: number;    // Probability of quote tweeting (0-1)
}

export interface TwitterConfig extends ReplicantConfig {
    twitterApiKey: string;
    twitterApiSecret: string;
    twitterAccessToken: string;
    twitterAccessSecret: string;
    mentionCheckInterval?: number;     // How often to check for mentions (ms)
    monitoringRules?: TwitterMonitoringRules;
}

export class TwitterAgent extends Agent implements Plugin {
    private client: any;
    private config: TwitterConfig;
    private twitterRunning: boolean = false;
    private mentionCheckInterval: NodeJS.Timeout | undefined;
    private searchCheckInterval: NodeJS.Timeout | undefined;
    private lastMentionId: string | undefined;
    private lastSearchId: string | undefined;

    public readonly name: string = 'twitter';
    public readonly version: string = '1.0.0';
    public readonly type = 'social' as const;

    constructor(config: TwitterConfig) {
        super(config);
        this.config = config;
    }

    async initialize(): Promise<void> {
        if (!this.client) {
            this.client = new TwitterApi({
                appKey: this.config.twitterApiKey,
                appSecret: this.config.twitterApiSecret,
                accessToken: this.config.twitterAccessToken,
                accessSecret: this.config.twitterAccessSecret
            });
        }

        this.twitterRunning = true;

        if (this.config.monitoringRules) {
            this.mentionCheckInterval = setInterval(() => this.checkMentions(), 60000);
            this.searchCheckInterval = setInterval(() => this.checkKeywordsAndUsers(), 60000);
        }
    }

    async shutdown(): Promise<void> {
        await super.shutdown();
        if (!this.twitterRunning) return;

        if (this.mentionCheckInterval) {
            clearInterval(this.mentionCheckInterval);
        }

        if (this.searchCheckInterval) {
            clearInterval(this.searchCheckInterval);
        }

        this.twitterRunning = false;
    }

    async processMessage(message: Message): Promise<Message> {
        if (!this.client) throw new Error('Twitter client not initialized');

        try {
            const tweetId = await this.tweet(message.content, message.metadata?.tweetId ? {
                reply: { in_reply_to_tweet_id: message.metadata.tweetId }
            } : undefined);

            return {
                role: 'assistant',
                content: message.content,
                metadata: {
                    platform: 'twitter',
                    tweetId,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    private async tweet(content: string, options?: any): Promise<string> {
        if (!this.client) throw new Error('Twitter client not initialized');

        try {
            // Split long messages
            if (content.length > 280) {
                const parts = this.splitMessage(content);
                let lastTweetId: string | undefined;
                for (const part of parts) {
                    const tweetOptions = lastTweetId ? 
                        { ...options, reply: { in_reply_to_tweet_id: lastTweetId } } : 
                        options;
                    const tweet = await this.client.v2.tweet(part, tweetOptions);
                    lastTweetId = tweet.data.id;
                }
                return lastTweetId!;
            }

            const tweet = await this.client.v2.tweet(content, options);
            return tweet.data.id;
        } catch (error) {
            console.error('Error sending tweet:', error);
            throw error;
        }
    }

    private splitMessage(content: string): string[] {
        const parts: string[] = [];
        let remaining = content;
        const maxLength = 280;

        while (remaining.length > 0) {
            if (remaining.length <= maxLength) {
                parts.push(remaining);
                break;
            }

            // Find last space within maxLength
            let splitIndex = remaining.lastIndexOf(' ', maxLength);
            if (splitIndex === -1) {
                splitIndex = maxLength;
            }

            parts.push(remaining.substring(0, splitIndex));
            remaining = remaining.substring(splitIndex + 1);
        }

        return parts;
    }

    private async checkMentions(): Promise<void> {
        if (!this.client || !this.twitterRunning) return;

        try {
            const me = await this.client.v2.me();
            const mentions = await this.client.v2.userMentionTimeline(me.data.id, {
                since_id: this.lastMentionId
            });

            if (mentions.data) {
                for (const mention of mentions.data) {
                    if (!this.lastMentionId || mention.id > this.lastMentionId) {
                        this.lastMentionId = mention.id;
                    }

                    const aiProvider = this.getAIProvider();
                    if (aiProvider) {
                        const message = {
                            role: 'user' as const,
                            content: mention.text,
                            metadata: {
                                platform: 'twitter',
                                tweetId: mention.id,
                                isMention: true,
                                author_id: mention.author_id,
                                timestamp: new Date().toISOString()
                            }
                        };
                        const response = await aiProvider.processMessage(message);
                        await this.processMessage(response);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking mentions:', error);
        }
    }

    private async checkKeywordsAndUsers(): Promise<void> {
        if (!this.client || !this.twitterRunning || !this.config.monitoringRules) return;

        try {
            const query = this.buildSearchQuery();
            if (!query) return;

            const tweets = await this.client.v2.search(query, {
                since_id: this.lastSearchId
            });

            if (tweets.data) {
                for (const tweet of tweets.data) {
                    if (!this.lastSearchId || tweet.id > this.lastSearchId) {
                        this.lastSearchId = tweet.id;
                    }

                    const aiProvider = this.getAIProvider();
                    if (aiProvider) {
                        const message = {
                            role: 'user' as const,
                            content: tweet.text,
                            metadata: {
                                platform: 'twitter',
                                tweetId: tweet.id,
                                isKeywordMatch: true,
                                author_id: tweet.author_id,
                                timestamp: new Date().toISOString()
                            }
                        };
                        const response = await aiProvider.processMessage(message);
                        await this.processMessage(response);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking keywords and users:', error);
        }
    }

    private buildSearchQuery(): string {
        const rules = this.config.monitoringRules;
        if (!rules) return '';

        const parts: string[] = [];

        if (rules.keywords?.length) {
            parts.push(`(${rules.keywords.join(' OR ')})`);
        }

        if (rules.usernames?.length) {
            parts.push(`(${rules.usernames.map(u => `from:${u}`).join(' OR ')})`);
        }

        if (!rules.includeRetweets) {
            parts.push('-is:retweet');
        }

        if (!rules.includeQuotes) {
            parts.push('-is:quote');
        }

        return parts.join(' ');
    }
} 