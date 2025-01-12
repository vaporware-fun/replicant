export interface VaporConfig {
    // AI Configuration
    anthropicApiKey: string;
    model: string;
    
    // Social Integration Keys
    twitterApiKey?: string;
    twitterApiSecret?: string;
    twitterAccessToken?: string;
    twitterAccessSecret?: string;
    
    discordToken?: string;
    telegramToken?: string;
    
    // Wallet Configuration
    ethereumPrivateKey?: string;
    ethereumRpcUrl?: string;
}

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, any>;
}

// Enhanced MCP types
export interface MCPMetadata {
    domain?: string;
    conversation_id?: string;
    user_id?: string;
    platform?: string;
    capabilities?: string[];
    permissions?: string[];
    tools?: {
        name: string;
        description: string;
        parameters?: Record<string, any>;
    }[];
}

export interface ModelContextProtocol {
    messages: Message[];
    context?: {
        domain?: string;
        metadata: MCPMetadata;
    };
} 