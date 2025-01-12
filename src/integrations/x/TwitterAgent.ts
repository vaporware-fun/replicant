import { TwitterApi } from 'twitter-api-v2';
import { Agent } from '../../core/Agent';
import { VaporConfig, Plugin, Message } from '../../core/interfaces';

export interface TwitterConfig extends VaporConfig {
    twitterApiKey: string;
    twitterApiSecret: string;
    twitterAccessToken: string;
    twitterAccessSecret: string;
}

export class TwitterAgent extends Agent implements Plugin {
    private twitter: TwitterApi;
    public readonly name: string = 'twitter';
    public readonly version: string = '1.0.0';
    public readonly type: 'social' = 'social';

    constructor(config: TwitterConfig) {
        super(config);
        
        if (!config.twitterApiKey || !config.twitterApiSecret || 
            !config.twitterAccessToken || !config.twitterAccessSecret) {
            throw new Error('Twitter credentials are required for TwitterAgent');
        }

        this.twitter = new TwitterApi({
            appKey: config.twitterApiKey,
            appSecret: config.twitterApiSecret,
            accessToken: config.twitterAccessToken,
            accessSecret: config.twitterAccessSecret,
        });
    }

    async tweet(content: string): Promise<string> {
        try {
            const tweet = await this.twitter.v2.tweet(content);
            return `Tweet posted successfully: ${tweet.data.id}`;
        } catch (error) {
            throw new Error(`Failed to post tweet: ${error}`);
        }
    }

    async reply(tweetId: string, content: string): Promise<string> {
        try {
            const reply = await this.twitter.v2.reply(content, tweetId);
            return `Reply posted successfully: ${reply.data.id}`;
        } catch (error) {
            throw new Error(`Failed to post reply: ${error}`);
        }
    }

    async processAndTweet(prompt: string): Promise<string> {
        const response = await this.processMessage({
            role: 'user',
            content: prompt,
            metadata: {
                timestamp: new Date().toISOString(),
                platform: 'twitter'
            }
        });
        return this.tweet(response.content);
    }

    async initialize(): Promise<void> {
        await super.initialize();
        // Verify credentials
        await this.twitter.v2.me();
    }

    async shutdown(): Promise<void> {
        // Nothing to clean up for Twitter
        await super.shutdown();
    }
} 