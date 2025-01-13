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

export class TwitterAgent extends EventEmitter implements Plugin {
    private client: TwitterApi;
    private agent?: Agent;
    private lastMentionId?: string;
    private lastSearchId?: string;
    private mentionCheckInterval: NodeJS.Timeout | null = null;
    private searchCheckInterval: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private monitoringRules?: TwitterMonitoringRules;

    public readonly name: string = 'twitter';
    public readonly version: string = '1.0.0';
    public readonly type = 'social' as const;

    constructor(config: TwitterConfig) {
        super();
        this.client = new TwitterApi({
            appKey: config.twitterApiKey,
            appSecret: config.twitterApiSecret,
            accessToken: config.twitterAccessToken,
            accessSecret: config.twitterAccessSecret,
        });
        this.monitoringRules = config.monitoringRules;
        this.mentionCheckInterval = null;
        this.searchCheckInterval = null;
        this.isRunning = false;
    }

    setAgent(agent: Agent) {
        this.agent = agent;
    }

    async tweet(content: string): Promise<string> {
        try {
            const tweet = await this.client.v2.tweet(content);
            return `Tweet posted successfully: ${tweet.data.id}`;
        } catch (error) {
            console.error('Error posting tweet:', error);
            throw new Error('Failed to post tweet');
        }
    }

    async reply(tweetId: string, content: string): Promise<string> {
        try {
            const reply = await this.client.v2.reply(content, tweetId);
            return `Reply posted successfully: ${reply.data.id}`;
        } catch (error) {
            console.error('Error posting reply:', error);
            throw new Error('Failed to post reply');
        }
    }

    private async checkMentions() {
        if (!this.isRunning) return;

        try {
            // Get mentions with expanded user information
            const mentions = await this.client.v2.userMentionTimeline(await this.getUserId(), {
                since_id: this.lastMentionId,
                expansions: ['author_id', 'referenced_tweets.id'],
                'tweet.fields': ['created_at', 'conversation_id', 'in_reply_to_user_id'],
                'user.fields': ['username', 'name']
            });

            for (const mention of mentions.data?.data || []) {
                // Update last mention ID
                if (!this.lastMentionId || mention.id > this.lastMentionId) {
                    this.lastMentionId = mention.id;
                }

                // Convert to standard message format
                const message: Message = {
                    role: 'user',
                    content: mention.text,
                    metadata: {
                        platform: 'twitter',
                        messageId: mention.id,
                        userId: mention.author_id,
                        timestamp: new Date().toISOString(),
                        conversationId: mention.conversation_id,
                        inReplyToId: mention.referenced_tweets?.[0]?.id,
                        type: 'mention'
                    }
                };

                // Emit message event
                this.emit('message', message);
            }
        } catch (error) {
            console.error('Error checking mentions:', error);
        }
    }

    private async getUserId(): Promise<string> {
        const me = await this.client.v2.me();
        return me.data.id;
    }

    private buildSearchQuery(): string {
        const rules = this.monitoringRules;
        if (!rules) return '';

        const parts: string[] = [];
        
        // Add keywords
        if (rules.keywords?.length) {
            parts.push(`(${rules.keywords.join(' OR ')})`);
        }

        // Add usernames
        if (rules.usernames?.length) {
            const userPart = rules.usernames.map(u => `from:${u}`).join(' OR ');
            parts.push(`(${userPart})`);
        }

        // Exclude retweets if not wanted
        if (!rules.includeRetweets) {
            parts.push('-is:retweet');
        }

        // Exclude quotes if not wanted
        if (!rules.includeQuotes) {
            parts.push('-is:quote');
        }

        return parts.join(' ');
    }

    private async checkKeywordsAndUsers() {
        if (!this.isRunning || !this.monitoringRules) return;

        try {
            const query = this.buildSearchQuery();
            if (!query) return;

            const tweets = await this.client.v2.search(query, {
                since_id: this.lastSearchId,
                expansions: ['author_id', 'referenced_tweets.id'],
                'tweet.fields': ['created_at', 'conversation_id', 'in_reply_to_user_id'],
                'user.fields': ['username', 'name']
            });

            for (const tweet of tweets.data?.data || []) {
                // Update last search ID
                if (!this.lastSearchId || tweet.id > this.lastSearchId) {
                    this.lastSearchId = tweet.id;
                }

                // Decide whether to interact
                const shouldReply = Math.random() < (this.monitoringRules.replyProbability || 0);
                const shouldQuote = Math.random() < (this.monitoringRules.quoteProbability || 0);

                // Convert to standard message format
                const message: Message = {
                    role: 'user',
                    content: tweet.text,
                    metadata: {
                        platform: 'twitter',
                        messageId: tweet.id,
                        userId: tweet.author_id,
                        timestamp: new Date().toISOString(),
                        conversationId: tweet.conversation_id,
                        type: 'monitored',
                        interaction: shouldReply ? 'reply' : shouldQuote ? 'quote' : 'none'
                    }
                };

                // Emit message event
                this.emit('message', message);
            }
        } catch (error) {
            console.error('Error checking keywords and users:', error);
        }
    }

    async quoteTweet(tweetId: string, content: string): Promise<string> {
        try {
            const tweet = await this.client.v2.quote(content, tweetId);
            return `Quote tweet posted successfully: ${tweet.data.id}`;
        } catch (error) {
            console.error('Error posting quote tweet:', error);
            throw new Error('Failed to post quote tweet');
        }
    }

    async initialize(): Promise<void> {
        // Verify credentials
        await this.client.v2.me();
        
        // Start monitoring
        this.isRunning = true;

        // Start mention monitoring
        this.mentionCheckInterval = setInterval(
            () => this.checkMentions(),
            60000 // Check every minute by default
        );

        // Start keyword and user monitoring if rules are set
        if (this.monitoringRules) {
            this.searchCheckInterval = setInterval(
                () => this.checkKeywordsAndUsers(),
                120000 // Check every 2 minutes
            );
        }

        // Do initial checks
        await this.checkMentions();
        if (this.monitoringRules) {
            await this.checkKeywordsAndUsers();
        }
    }

    async processMessage(message: Message): Promise<void> {
        if (!message.metadata?.messageId) {
            // New tweet
            await this.tweet(message.content);
        } else if (message.metadata.interaction === 'quote') {
            // Quote tweet
            await this.quoteTweet(message.metadata.messageId, message.content);
        } else {
            // Reply to tweet
            await this.reply(message.metadata.messageId, message.content);
        }
    }

    async shutdown(): Promise<void> {
        this.isRunning = false;
        if (this.mentionCheckInterval) {
            clearInterval(this.mentionCheckInterval);
            this.mentionCheckInterval = null;
        }
        if (this.searchCheckInterval) {
            clearInterval(this.searchCheckInterval);
            this.searchCheckInterval = null;
        }
    }
} 