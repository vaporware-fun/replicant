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

1. Install via npm:
```bash
npm install replicant-ai
```

2. Create a `.env` file:
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

## Quick Start

### Basic Agent Setup

```typescript
import { Agent, AnthropicProvider } from 'replicant-ai';
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
import { Agent, DiscordAgent, AnthropicProvider } from 'replicant-ai';
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

1. [Basic Chat](./src/examples/basic-chat.ts)
2. [Discord Bot](./src/examples/discord-bot.ts)
3. [Multi-platform Agent](./src/examples/full-example.ts)
4. [State Management](./src/examples/state-management.ts)
5. [Function Calling](./src/examples/function-calling.ts)

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