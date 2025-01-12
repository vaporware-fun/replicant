# Vapor Framework

A TypeScript framework for building AI agents with social media integration and Web3 capabilities.

## Features

- 🤖 AI-powered conversational agents
- 🌐 Multi-platform support (Discord, Telegram, Twitter)
- 💬 Context-aware conversations
- 🧠 Memory and state management
- 🔌 Pluggable architecture
- 🎭 Emotional state tracking
- 🔒 Type-safe implementation

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- API keys for the services you want to use:
  - Anthropic API key for Claude
  - Discord bot token
  - Telegram bot token
  - Twitter API credentials (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vapor-framework.git
cd vapor-framework
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
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

### Running the Examples

1. Basic CLI Chat:
```bash
npm run build
node dist/cli/index.js chat
```

2. Full Example (with all integrations):
```bash
npm run build
node dist/examples/full-example.js
```

3. Function Calling Example:
```bash
npm run build
node dist/examples/function-calling.js
```

4. State Management Example:
```bash
npm run build
node dist/examples/state-management.js
```

## Basic Usage

Here's a simple example of creating an AI agent:

```typescript
import { Agent } from 'vapor-framework';
import { AnthropicProvider } from 'vapor-framework/integrations/ai';
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

    // Initialize the agent
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

    // Clean up
    await agent.shutdown();
}

main().catch(console.error);
```

## Architecture

The Vapor Framework is built around these core concepts:

1. **Agent**: The main class that coordinates all functionality
2. **Plugins**: Modular integrations (Discord, Telegram, etc.)
3. **State Management**: Conversation and user state tracking
4. **Memory**: Long-term storage and retrieval
5. **Function Calling**: Extensible function registration and execution

## Available Integrations

- **AI Providers**:
  - Anthropic Claude
  
- **Messaging Platforms**:
  - Discord
  - Telegram
  
- **Social Media**:
  - Twitter/X
  
- **Storage**:
  - In-Memory State Provider
  - Vector Memory Provider (using Qdrant)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 