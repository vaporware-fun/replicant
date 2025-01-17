# Creating New Integrations

This guide will walk you through the process of creating new integrations for the Replicant framework. Whether you're adding support for a new platform, AI provider, or custom functionality, this guide will help you understand the integration process.

## Table of Contents
- [Overview](#overview)
- [Types of Integrations](#types-of-integrations)
- [Basic Integration Structure](#basic-integration-structure)
- [Step-by-Step Guide](#step-by-step-guide)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

Replicant uses a plugin-based architecture where each integration implements the `Plugin` interface and can optionally extend additional base classes or interfaces based on its functionality.

## Types of Integrations

1. **Platform Integrations**
   - Messaging platforms (Discord, Telegram, etc.)
   - Social media platforms (Twitter, etc.)
   - Custom communication channels

2. **AI Provider Integrations**
   - Language model providers
   - Specialized AI services
   - Custom AI implementations

3. **State Provider Integrations**
   - Database integrations
   - Memory management systems
   - Custom state handlers

## Basic Integration Structure

Every integration must implement the `Plugin` interface:

```typescript
interface Plugin {
    readonly name: string;           // Unique identifier for the plugin
    readonly version: string;        // Plugin version number
    readonly type: string;           // Plugin type (e.g., 'messaging', 'ai', 'storage')
    
    initialize(): Promise<void>;     // Setup code
    shutdown(): Promise<void>;       // Cleanup code
    setAgent(agent: Agent): void;    // Reference to main agent
}
```

## Step-by-Step Guide

### 1. Create the Integration Class

Start by creating a new class that implements the `Plugin` interface:

```typescript
import { Plugin, ReplicantConfig } from '../../core/interfaces';
import { EventEmitter } from 'events';
import { Message } from '../../core/types';

// Define configuration interface
export interface MyIntegrationConfig extends ReplicantConfig {
    apiKey: string;
    endpoint?: string;
    // Add other configuration options
}

export class MyIntegration extends EventEmitter implements Plugin {
    private agent?: Agent;
    
    public readonly name = 'my-integration';
    public readonly version = '1.0.0';
    public readonly type = 'custom';

    constructor(config: MyIntegrationConfig) {
        super();
        // Initialize your integration
    }

    setAgent(agent: Agent): void {
        this.agent = agent;
    }

    async initialize(): Promise<void> {
        // Setup code
    }

    async shutdown(): Promise<void> {
        // Cleanup code
    }
}
```

### 2. Add Message Handling

If your integration deals with messages, implement message handling:

```typescript
export class MyIntegration extends EventEmitter implements Plugin {
    // ... previous code ...

    async processMessage(message: Message): Promise<void> {
        // Handle outgoing messages
        try {
            await this.sendToExternalService(message);
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    private async handleIncomingMessage(rawMessage: any): Promise<void> {
        // Convert external message format to Replicant Message type
        const message: Message = {
            role: 'user',
            content: rawMessage.text,
            metadata: {
                platform: this.name,
                messageId: rawMessage.id,
                userId: rawMessage.sender,
                timestamp: new Date().toISOString()
            }
        };

        // Emit message event for the agent to handle
        this.emit('message', message);
    }
}
```

### 3. Implement Error Handling

Add proper error handling and logging:

```typescript
export class MyIntegration extends EventEmitter implements Plugin {
    // ... previous code ...

    private async handleError(error: Error, context: string): Promise<void> {
        console.error(`[${this.name}] Error in ${context}:`, error);
        
        // Emit error event
        this.emit('error', {
            integration: this.name,
            context,
            error,
            timestamp: new Date().toISOString()
        });

        // Optionally attempt recovery
        await this.attemptRecovery(context);
    }

    private async attemptRecovery(context: string): Promise<void> {
        // Implement recovery logic
        try {
            // Example: Reconnect to service
            await this.reconnect();
        } catch (error) {
            console.error(`[${this.name}] Recovery failed:`, error);
        }
    }
}
```

### 4. Add State Management

If your integration needs to maintain state:

```typescript
export class MyIntegration extends EventEmitter implements Plugin {
    private state: Map<string, any> = new Map();
    
    // ... previous code ...

    async saveState(key: string, value: any): Promise<void> {
        this.state.set(key, value);
        // Optionally persist to external storage
    }

    async loadState(key: string): Promise<any> {
        return this.state.get(key);
    }

    async clearState(): Promise<void> {
        this.state.clear();
    }
}
```

### 5. Register Event Handlers

Set up event handling in the initialize method:

```typescript
export class MyIntegration extends EventEmitter implements Plugin {
    // ... previous code ...

    async initialize(): Promise<void> {
        // Set up event listeners
        this.on('message', this.handleMessage.bind(this));
        this.on('error', this.handleError.bind(this));
        
        // Initialize external service connection
        await this.connect();
        
        // Start any necessary background tasks
        this.startBackgroundTasks();
    }

    private startBackgroundTasks(): void {
        // Example: Set up periodic checks
        setInterval(() => {
            this.checkForUpdates();
        }, 60000);
    }
}
```

## Best Practices

1. **Error Handling**
   - Always implement proper error handling
   - Use typed errors for different failure modes
   - Provide meaningful error messages
   - Implement recovery mechanisms

2. **Event Management**
   - Use TypeScript for event type safety
   - Document all emitted events
   - Clean up event listeners in shutdown

3. **State Management**
   - Keep state isolated and encapsulated
   - Implement proper cleanup
   - Handle state persistence if needed

4. **Testing**
   - Write unit tests for your integration
   - Implement mock services for testing
   - Test error conditions and recovery

Example test structure:

```typescript
describe('MyIntegration', () => {
    let integration: MyIntegration;
    let mockAgent: Agent;

    beforeEach(() => {
        mockAgent = TestUtils.createMockAgent();
        integration = new MyIntegration({
            domain: 'test',
            userId: 'test-user',
            platform: 'test',
            apiKey: 'test-key'
        });
        integration.setAgent(mockAgent);
    });

    it('should handle messages correctly', async () => {
        const message: Message = {
            role: 'user',
            content: 'test message'
        };

        await integration.processMessage(message);
        // Add assertions
    });

    it('should recover from errors', async () => {
        // Test error recovery
    });
});
```

## Examples

### Messaging Platform Integration

```typescript
import { Plugin, Message } from '../../core/interfaces';
import { EventEmitter } from 'events';

export class MessagingIntegration extends EventEmitter implements Plugin {
    public readonly type = 'messaging';

    async initialize(): Promise<void> {
        // Connect to messaging platform
        await this.connect();

        // Set up message handlers
        this.platform.on('message', async (rawMessage) => {
            const message = this.convertMessage(rawMessage);
            this.emit('message', message);
        });
    }

    async processMessage(message: Message): Promise<void> {
        // Send message to platform
        await this.platform.send(message);
    }
}
```

### AI Provider Integration

```typescript
import { Plugin, AIProvider } from '../../core/interfaces';

export class CustomAIProvider implements Plugin, AIProvider {
    public readonly type = 'ai';

    async processMessage(message: Message, context: ModelContextProtocol): Promise<AIResponse> {
        // Process message with AI service
        const response = await this.ai.generate(message, context);
        
        return {
            role: 'assistant',
            content: response.text,
            metadata: response.metadata
        };
    }
}
```

### Storage Integration

```typescript
import { Plugin, StorageProvider } from '../../core/interfaces';

export class CustomStorageProvider implements Plugin, StorageProvider {
    public readonly type = 'storage';

    async saveState(state: ConversationStateData): Promise<void> {
        // Save state to storage
        await this.storage.save(state);
    }

    async loadState(id: string): Promise<ConversationStateData | null> {
        // Load state from storage
        return await this.storage.load(id);
    }
}
``` 