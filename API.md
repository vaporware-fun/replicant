# Replicant API Documentation

## Table of Contents
- [Core Types](#core-types)
- [Agent](#agent)
- [Platform Agents](#platform-agents)
- [AI Providers](#ai-providers)
- [State Management](#state-management)
- [Plugins](#plugins)

## Core Types

### ReplicantConfig

Configuration for creating a new agent:

```typescript
interface ReplicantConfig {
    domain: string;           // Domain/context the agent operates in
    userId: string;           // Unique identifier for the agent
    platform: string;         // Platform identifier (e.g., 'discord', 'telegram')
    capabilities: string[];   // List of agent capabilities
    permissions: string[];    // List of agent permissions
    tools?: string[];        // Optional list of available tools
}
```

### Message

Standard message format used throughout the system:

```typescript
interface Message {
    role: 'user' | 'assistant' | 'system';  // Role of the message sender
    content: string;                        // Message content
    metadata?: {                            // Optional metadata
        platform?: string;                  // Platform identifier
        timestamp?: string;                 // ISO timestamp
        userId?: string;                    // User identifier
        [key: string]: any;                 // Additional metadata
    };
}
```

### ModelContextProtocol

Context protocol for AI model interactions:

```typescript
interface ModelContextProtocol {
    messages: Message[];              // Conversation history
    context?: {
        domain?: string;             // Domain context
        metadata: MCPMetadata;       // Additional metadata
    };
}

interface MCPMetadata {
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
```

## Agent

The main `Agent` class coordinates all functionality:

```typescript
class Agent extends EventEmitter {
    constructor(config: ReplicantConfig);

    // Core Methods
    async initialize(): Promise<void>;
    async processMessage(message: Message): Promise<AIResponse>;
    async queueMessage(message: Message): Promise<void>;
    
    // Provider Management
    async setAIProvider(provider: AIProvider): Promise<void>;
    async setStateProvider(provider: StateProvider): Promise<void>;
    async setMemoryProvider(provider: MemoryProvider): Promise<void>;
    async setGoalProvider(provider: GoalProvider): Promise<void>;
    
    // Lifecycle Management
    async shutdown(): Promise<void>;
    async pause(): Promise<void>;
    async resume(): Promise<void>;
    
    // Events
    on('message', (response: Message) => void);
    on('error', (error: Error) => void);
}
```

## Platform Agents

### DiscordAgent

Discord platform integration:

```typescript
interface DiscordConfig extends ReplicantConfig {
    discordToken: string;    // Discord bot token
}

class DiscordAgent extends EventEmitter implements Plugin {
    constructor(config: DiscordConfig);
    
    // Core Methods
    async initialize(): Promise<void>;
    async processMessage(message: Message): Promise<void>;
    async shutdown(): Promise<void>;
    
    // Events
    on('message', (message: Message) => void);
    
    // Plugin Interface
    readonly name: string;
    readonly version: string;
    readonly type: 'messaging';
    setAgent(agent: Agent): void;
}
```

### TelegramAgent

Telegram platform integration:

```typescript
interface TelegramConfig extends ReplicantConfig {
    telegramToken: string;   // Telegram bot token
}

class TelegramAgent extends EventEmitter implements Plugin {
    constructor(config: TelegramConfig);
    
    // Core Methods
    async initialize(): Promise<void>;
    async processMessage(message: Message): Promise<void>;
    async shutdown(): Promise<void>;
    
    // Events
    on('message', (message: Message) => void);
    
    // Plugin Interface
    readonly name: string;
    readonly version: string;
    readonly type: 'messaging';
    setAgent(agent: Agent): void;
}
```

## AI Providers

### AnthropicProvider

Claude AI integration:

```typescript
interface AnthropicConfig {
    apiKey: string;          // Anthropic API key
    model: string;           // Model identifier
}

class AnthropicProvider implements AIProvider {
    constructor(config: AnthropicConfig);
    
    // Core Methods
    async initialize(): Promise<void>;
    async processMessage(message: Message, context: ModelContextProtocol): Promise<AIResponse>;
    async shutdown(): Promise<void>;
}
```

## State Management

### InMemoryStateProvider

In-memory state management:

```typescript
interface ConversationStateData {
    id: string;
    turnCount: number;
    lastInteraction: Date;
    variables: Record<string, any>;
    userProfile: {
        id: string;
        preferences: Record<string, any>;
        history: {
            topics: string[];
            interactions: number;
            lastSeen: Date;
        };
    };
    emotionalState: {
        user: string;
        agent: string;
        confidence: number;
    };
    flags: Record<string, boolean>;
}

class InMemoryStateProvider implements StateProvider {
    constructor();
    
    // Core Methods
    async initialize(): Promise<void>;
    async loadState(id: string): Promise<ConversationStateData | null>;
    async saveState(state: ConversationStateData): Promise<void>;
    async shutdown(): Promise<void>;
}
```

## Plugins

### Plugin Interface

Base interface for all plugins:

```typescript
interface Plugin {
    readonly name: string;           // Plugin name
    readonly version: string;        // Plugin version
    readonly type: string;           // Plugin type
    
    // Core Methods
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    setAgent(agent: Agent): void;
}
```

### Creating Custom Plugins

Example of creating a custom plugin:

```typescript
class CustomPlugin extends EventEmitter implements Plugin {
    public readonly name = 'custom-plugin';
    public readonly version = '1.0.0';
    public readonly type = 'custom';
    private agent?: Agent;

    constructor(config: any) {
        super();
        // Initialize plugin
    }

    setAgent(agent: Agent): void {
        this.agent = agent;
    }

    async initialize(): Promise<void> {
        // Setup plugin
    }

    async shutdown(): Promise<void> {
        // Cleanup plugin
    }

    // Custom methods
    async customMethod(): Promise<void> {
        // Implement custom functionality
    }
}
``` 