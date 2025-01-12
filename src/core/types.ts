export interface ReplicantConfig {
    domain: string;
    userId: string;
    platform: string;
    capabilities: string[];
    permissions: string[];
    tools?: string[];
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