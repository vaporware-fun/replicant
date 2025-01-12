import { TwitterApi } from 'twitter-api-v2';
import { Agent } from '../../core/Agent';
import { ReplicantConfig, Plugin, Message } from '../../core/interfaces';

export interface TwitterConfig extends ReplicantConfig {
    twitterApiKey: string;
    twitterApiSecret: string;
    twitterAccessToken: string;
    twitterAccessSecret: string;
}

export class TwitterAgent implements Plugin {
    private client: TwitterApi;
    private agent?: Agent;
    public readonly name: string = 'twitter';
    public readonly version: string = '1.0.0';
    public readonly type = 'social' as const;

    constructor(config: TwitterConfig) {
        this.client = new TwitterApi({
            appKey: config.twitterApiKey,
            appSecret: config.twitterApiSecret,
            accessToken: config.twitterAccessToken,
            accessSecret: config.twitterAccessSecret,
        });
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

    async initialize(): Promise<void> {
        // Verify credentials
        await this.client.v2.me();
    }

    async shutdown(): Promise<void> {
        // No cleanup needed for Twitter client
    }
} 