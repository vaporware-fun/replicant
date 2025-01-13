# Replicant

A TypeScript framework for building autonomous AI agents with advanced media processing, swarm coordination, and Web3 capabilities.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🤖 **AI-powered Agents**
  - Event-driven architecture
  - Pluggable AI providers (Claude, etc.)
  - Context-aware conversations
  - Long-term memory management
  
- 🌐 **Multi-platform Support**
  - Discord integration
  - Telegram integration
  - Twitter/X integration
  - Extensible plugin system
  
- 💬 **Advanced Communication**
  - Real-time message processing
  - Multi-agent coordination
  - Platform-specific message handling
  
- 🧠 **State Management**
  - Persistent conversation state
  - User profile tracking
  - Emotional state monitoring
  
- 🔌 **Extensible Architecture**
  - Plugin system
  - Custom provider support
  - Type-safe implementation

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/replicant.git
cd replicant
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
# Required for AI
ANTHROPIC_API_KEY=your_anthropic_api_key

# For Discord integration
DISCORD_TOKEN=your_discord_bot_token

# For Telegram integration
TELEGRAM_TOKEN=your_telegram_bot_token

# For Twitter/X integration (optional)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
```

4. Build the project:
```bash
npm run build
```

## Quick Start

### Basic Agent Setup

```typescript
import { Agent, AnthropicProvider } from '../';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Initialize the agent
    const agent = new Agent({
        domain: 'customer-service',
        userId: 'agent-1',
        platform: 'cli',
        capabilities: ['text-generation'],
        permissions: ['read', 'write']
    });

    // Set up AI provider
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });
    await agent.setAIProvider(aiProvider);

    // Initialize and start processing
    await agent.initialize();
    
    // Process a message
    const response = await agent.processMessage({
        role: 'user',
        content: 'Hello! How can you help me today?',
        metadata: {
            timestamp: new Date().toISOString(),
            platform: 'cli'
        }
    });

    console.log('Response:', response.content);
}

main().catch(console.error);
```

### Discord Integration

```typescript
import { Agent, DiscordAgent, AnthropicProvider } from '../';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Initialize main agent
    const agent = new Agent({
        domain: 'discord-bot',
        userId: 'agent-1',
        platform: 'discord',
        capabilities: ['text-generation'],
        permissions: ['read', 'write']
    });

    // Set up AI provider
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });
    await agent.setAIProvider(aiProvider);

    // Initialize Discord agent
    const discordAgent = new DiscordAgent({
        domain: 'discord',
        userId: 'discord-bot',
        platform: 'discord',
        capabilities: ['chat'],
        permissions: ['send-messages', 'read-messages'],
        discordToken: process.env.DISCORD_TOKEN!
    });

    // Set up message handling
    discordAgent.on('message', async (message) => {
        await agent.queueMessage(message);
    });

    agent.on('message', async (response) => {
        if (response.metadata?.platform === 'discord') {
            await discordAgent.processMessage(response);
        }
    });

    // Initialize everything
    await agent.initialize();
    await discordAgent.initialize();
}

main().catch(console.error);
```

### Twitter/X Integration

```typescript
import { Agent, TwitterAgent, AnthropicProvider } from '../';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Initialize main agent
    const agent = new Agent({
        domain: 'twitter-bot',
        userId: 'twitter-assistant',
        platform: 'twitter',
        capabilities: ['text-generation', 'social-media'],
        permissions: ['read', 'write']
    });

    // Set up AI provider
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });
    await agent.setAIProvider(aiProvider);

    // Initialize Twitter agent with monitoring rules
    const twitterAgent = new TwitterAgent({
        domain: 'twitter',
        userId: 'twitter-bot',
        platform: 'twitter',
        capabilities: ['social-media'],
        permissions: ['tweet', 'reply'],
        twitterApiKey: process.env.TWITTER_API_KEY!,
        twitterApiSecret: process.env.TWITTER_API_SECRET!,
        twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN!,
        twitterAccessSecret: process.env.TWITTER_ACCESS_SECRET!,
        monitoringRules: {
            keywords: ['#AI', '#MachineLearning', 'artificial intelligence'],
            usernames: ['OpenAI', 'AnthropicAI'],
            includeRetweets: false,
            includeQuotes: true,
            replyProbability: 0.3,    // 30% chance to reply
            quoteProbability: 0.1     // 10% chance to quote tweet
        }
    });

    // Set up message handling
    twitterAgent.on('message', async (message) => {
        switch (message.metadata?.type) {
            case 'mention':
                // Handle direct mentions
                console.log(`Received mention: ${message.content}`);
                await agent.queueMessage(message);
                break;
            case 'monitored':
                // Handle monitored tweets (keywords/users)
                console.log(`Found monitored tweet: ${message.content}`);
                if (message.metadata.interaction !== 'none') {
                    await agent.queueMessage(message);
                }
                break;
        }
    });

    agent.on('message', async (response) => {
        if (response.metadata?.platform === 'twitter') {
            // Handle different interaction types
            await twitterAgent.processMessage(response);
        }
    });

    // Initialize everything
    await agent.initialize();
    await twitterAgent.initialize();
}

main().catch(console.error);
```

The Twitter agent now supports:
- Monitoring mentions and tags
- Tracking specific keywords and hashtags
- Following specific user accounts
- Configurable interaction probabilities
- Automatic replies and quote tweets
- Filtering of retweets and quotes
- Real-time tweet monitoring

## Core Concepts

### Agent

The `Agent` class is the core component that coordinates all functionality. It:
- Processes messages using AI providers
- Manages conversation state
- Coordinates with platform-specific agents
- Handles memory and state management

### Plugins

Plugins are modular components that extend the agent's functionality:
- **Platform Plugins**: Discord, Telegram, Twitter agents
- **AI Providers**: Anthropic Claude integration
- **State Providers**: Memory and conversation state management
- **Custom Plugins**: Extend the `Plugin` interface to add new capabilities

### Message Processing

Messages flow through the system in this order:
1. Platform agent receives message (Discord, Telegram, etc.)
2. Message is converted to standard format and queued
3. Main agent processes message using AI provider
4. Response is routed back to appropriate platform
5. Platform agent sends response to user

### Model Context Protocol (MCP)

The framework leverages Claude's Model Context Protocol to provide rich, structured context for each interaction:

```typescript
// Example of MCP context structure
const context: ModelContextProtocol = {
    messages: conversationHistory,
    context: {
        domain: 'customer-service',
        metadata: {
            user_id: 'user-123',
            platform: 'discord',
            capabilities: ['text-generation', 'function-calling'],
            permissions: ['read', 'write'],
            tools: [
                {
                    name: 'searchKnowledgeBase',
                    description: 'Search the support knowledge base',
                    parameters: {
                        query: 'string',
                        category: 'string'
                    }
                }
            ]
        }
    }
};
```

The framework automatically:
1. **Maintains Conversation History**: Tracks and provides relevant message history
2. **Provides Domain Context**: Includes agent domain and role information
3. **Specifies Capabilities**: Lists available tools and permissions
4. **Includes Metadata**: Adds platform-specific context and user information
5. **Manages Memory**: Incorporates relevant memories and past interactions

This structured context helps Claude:
- Maintain consistent persona and behavior
- Make informed decisions about tool usage
- Understand user context and history
- Respect platform-specific limitations
- Access relevant past interactions

Example usage in code:

```typescript
const agent = new Agent({
    domain: 'customer-service',
    capabilities: ['text-generation', 'function-calling'],
    metadata: {
        // Custom metadata for Claude
        persona: 'helpful support agent',
        tone: 'professional',
        expertise: ['technical-support', 'billing']
    }
});

// The framework automatically includes this context
// in every interaction with Claude
const response = await agent.processMessage({
    role: 'user',
    content: 'I need help with billing',
    metadata: {
        userId: 'user-123',
        platform: 'discord'
    }
});
```

## Architecture

### Core Components

1. **Agent**
   - Message processing
   - State management
   - Plugin coordination
   - Event handling

2. **Plugins**
   - Platform integrations
   - AI providers
   - State providers
   - Custom extensions

3. **State Management**
   - Conversation tracking
   - User profiles
   - Memory storage
   - Emotional state

4. **Event System**
   - Message events
   - Platform events
   - Error handling
   - State changes

## API Reference

### Agent Class

```typescript
class Agent {
    constructor(config: ReplicantConfig);
    
    // Core methods
    async initialize(): Promise<void>;
    async processMessage(message: Message): Promise<AIResponse>;
    async queueMessage(message: Message): Promise<void>;
    
    // Provider setup
    async setAIProvider(provider: AIProvider): Promise<void>;
    async setStateProvider(provider: StateProvider): Promise<void>;
    
    // Lifecycle
    async shutdown(): Promise<void>;
    async pause(): Promise<void>;
    async resume(): Promise<void>;
}
```

### Platform Agents

#### DiscordAgent

```typescript
class DiscordAgent extends EventEmitter implements Plugin {
    constructor(config: DiscordConfig);
    
    async initialize(): Promise<void>;
    async processMessage(message: Message): Promise<void>;
    async shutdown(): Promise<void>;
}
```

#### TelegramAgent

```typescript
class TelegramAgent extends EventEmitter implements Plugin {
    constructor(config: TelegramConfig);
    
    async initialize(): Promise<void>;
    async processMessage(message: Message): Promise<void>;
    async shutdown(): Promise<void>;
}
```

## Examples

See the [examples](./src/examples) directory for more detailed examples:

1. [Basic Chat](./src/examples/basic-chat.ts) - Simple CLI-based chat agent
2. [Discord Bot](./src/examples/discord-bot.ts) - Discord platform integration
3. [Multi-platform Agent](./src/examples/full-example.ts) - Multiple platform support
4. [State Management](./src/examples/state-management.ts) - Conversation state tracking
5. [Function Calling](./src/examples/function-calling.ts) - Custom function integration
6. [Swarm Coordination](./src/examples/swarm-coordination.ts) - Multi-agent collaboration

### Swarm Coordination Example

```typescript
// Create specialized agents
const agents = {
    coordinator: new Agent({
        domain: 'swarm-coordinator',
        capabilities: ['coordination']
    }),
    researcher: new Agent({
        domain: 'research',
        capabilities: ['research']
    }),
    writer: new Agent({
        domain: 'writing',
        capabilities: ['writing']
    })
};

// Coordinator assigns tasks
const task = {
    id: 'research-1',
    description: 'Research AI trends'
};

const assignedAgent = await coordinator.assignTask(task);
const result = await assignedAgent.processTask(task);
```

## Advanced Usage

### Memory Management

The framework provides different memory providers:

```typescript
// In-memory state
const stateProvider = new InMemoryStateProvider();

// Vector memory (requires Qdrant)
const memoryProvider = new VectorMemoryProvider({
    url: 'http://localhost:6333'
});

await agent.setStateProvider(stateProvider);
await agent.setMemoryProvider(memoryProvider);
```

### Custom Plugins

Create your own plugins by implementing the Plugin interface:

```typescript
class CustomPlugin implements Plugin {
    public readonly name = 'custom-plugin';
    public readonly version = '1.0.0';
    
    async initialize(): Promise<void> {
        // Setup code
    }
    
    async shutdown(): Promise<void> {
        // Cleanup code
    }
}
```

### Error Handling

The framework provides comprehensive error handling:

```typescript
agent.on('error', (error) => {
    console.error('Agent error:', error);
});

try {
    await agent.processMessage(message);
} catch (error) {
    if (error instanceof AIProviderError) {
        // Handle AI provider errors
    } else if (error instanceof StateError) {
        // Handle state management errors
    }
}
```

## Troubleshooting

### Common Issues

1. **AI Provider Connection**
   - Ensure your API key is valid
   - Check your network connection
   - Verify the model name is correct

2. **Platform Integration**
   - Confirm bot tokens are valid
   - Check required permissions
   - Ensure proper event handling

3. **Memory Management**
   - Verify database connections
   - Check storage limits
   - Monitor memory usage

### Debug Mode

Enable debug mode for detailed logging:

```typescript
const agent = new Agent({
    ...config,
    debug: true
});
```

### Performance Optimization

1. **Memory Usage**
   - Adjust context window size
   - Use appropriate state providers
   - Clean up unused resources

2. **Response Time**
   - Use model caching
   - Implement request batching
   - Optimize prompt engineering

## Security Best Practices

1. **API Keys**
   - Use environment variables
   - Rotate keys regularly
   - Implement key restrictions

2. **Data Privacy**
   - Sanitize user inputs
   - Encrypt sensitive data
   - Implement access controls

3. **Platform Security**
   - Use secure connections
   - Implement rate limiting
   - Monitor for abuse

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run tests: `npm test`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 