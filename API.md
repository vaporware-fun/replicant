# Replicant API Documentation

## Table of Contents
- [Core Types](#core-types)
- [Agent](#agent)
- [Platform Agents](#platform-agents)
- [AI Providers](#ai-providers)
- [State Management](#state-management)
- [Plugins](#plugins)

## Core Types

### ModelContextProtocol

The Model Context Protocol (MCP) defines how context is provided to Claude:

```typescript
interface ModelContextProtocol {
    messages: Message[];              // Conversation history
    context?: {
        domain?: string;             // Domain context (e.g., 'customer-service')
        metadata: MCPMetadata;       // Additional structured context
    };
}

interface MCPMetadata {
    domain?: string;                 // Optional domain override
    conversation_id?: string;        // Unique conversation identifier
    user_id?: string;               // User identifier
    platform?: string;              // Platform identifier
    capabilities?: string[];        // Available capabilities
    permissions?: string[];         // Granted permissions
    tools?: {                       // Available tools/functions
        name: string;
        description: string;
        parameters?: Record<string, any>;
    }[];
    memories?: string[];           // Relevant past interactions
    custom_data?: Record<string, any>; // Additional context
}
```

The MCP enables:
- **Contextual Awareness**: Claude understands its role and capabilities
- **Memory Integration**: Access to relevant past interactions
- **Tool Discovery**: Awareness of available functions and APIs
- **Permission Management**: Understanding of allowed actions
- **Platform Context**: Platform-specific behavior adaptation

Example usage with the AnthropicProvider:

```typescript
class AnthropicProvider implements AIProvider {
    async processMessage(message: Message, context: ModelContextProtocol): Promise<AIResponse> {
        // The provider automatically formats the context for Claude
        const response = await this.claude.messages.create({
            model: this.model,
            messages: context.messages,
            system: this.formatSystemPrompt(context)
        });
        
        return {
            role: 'assistant',
            content: response.content,
            metadata: {
                confidence: response.metadata?.confidence,
                ...response.metadata
            }
        };
    }
}
```

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

## Testing

### Unit Testing

The framework provides utilities for testing agents and plugins:

```typescript
import { TestUtils, MockAIProvider, MockStateProvider } from '../testing';

describe('Agent', () => {
    let agent: Agent;
    let mockAI: MockAIProvider;
    let mockState: MockStateProvider;

    beforeEach(() => {
        mockAI = new MockAIProvider();
        mockState = new MockStateProvider();
        
        agent = new Agent({
            domain: 'test',
            userId: 'test-agent',
            platform: 'test',
            capabilities: ['test'],
            permissions: ['test']
        });

        await agent.setAIProvider(mockAI);
        await agent.setStateProvider(mockState);
    });

    it('should process messages correctly', async () => {
        const response = await agent.processMessage({
            role: 'user',
            content: 'test message'
        });

        expect(response.content).toBeDefined();
        expect(mockAI.processMessage).toHaveBeenCalled();
    });
});
```

### Integration Testing

Example of testing platform integrations:

```typescript
describe('DiscordAgent', () => {
    let agent: Agent;
    let discordAgent: DiscordAgent;

    beforeEach(async () => {
        agent = TestUtils.createTestAgent();
        discordAgent = new DiscordAgent({
            domain: 'discord-test',
            userId: 'test-bot',
            platform: 'discord',
            capabilities: ['chat'],
            permissions: ['send-messages'],
            discordToken: 'test-token'
        });

        await agent.initialize();
        await discordAgent.initialize();
    });

    it('should handle Discord messages', async () => {
        const message = TestUtils.createDiscordMessage('test message');
        await discordAgent.handleMessage(message);
        
        expect(agent.messageQueue.length).toBe(1);
    });
});
```

### Mock Providers

The framework includes mock providers for testing:

```typescript
class MockAIProvider implements AIProvider {
    async processMessage(message: Message): Promise<AIResponse> {
        return {
            role: 'assistant',
            content: 'Mock response',
            metadata: {
                confidence: 1.0
            }
        };
    }
}

class MockStateProvider implements StateProvider {
    private state: Map<string, ConversationStateData> = new Map();

    async loadState(id: string): Promise<ConversationStateData | null> {
        return this.state.get(id) || null;
    }

    async saveState(data: ConversationStateData): Promise<void> {
        this.state.set(data.id, data);
    }
}
```

### Test Utilities

Helper functions for common testing scenarios:

```typescript
export class TestUtils {
    static createTestAgent(config?: Partial<ReplicantConfig>): Agent {
        return new Agent({
            domain: 'test',
            userId: 'test-agent',
            platform: 'test',
            capabilities: ['test'],
            permissions: ['test'],
            ...config
        });
    }

    static createTestMessage(content: string): Message {
        return {
            role: 'user',
            content,
            metadata: {
                timestamp: new Date().toISOString(),
                platform: 'test'
            }
        };
    }

    static async waitForAgentResponse(agent: Agent): Promise<Message> {
        return new Promise((resolve) => {
            agent.once('message', resolve);
        });
    }
}
```

### Performance Testing

Example of testing agent performance:

```typescript
describe('Agent Performance', () => {
    it('should handle high message volume', async () => {
        const agent = TestUtils.createTestAgent();
        const messageCount = 1000;
        const startTime = Date.now();

        const messages = Array.from({ length: messageCount }, (_, i) => ({
            role: 'user',
            content: `Test message ${i}`,
            metadata: { timestamp: new Date().toISOString() }
        }));

        await Promise.all(messages.map(msg => agent.queueMessage(msg)));
        
        const endTime = Date.now();
        const timePerMessage = (endTime - startTime) / messageCount;
        
        expect(timePerMessage).toBeLessThan(100); // Less than 100ms per message
    });
});
``` 