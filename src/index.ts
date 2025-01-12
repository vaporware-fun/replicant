// Core exports
export { Agent } from './core/Agent';
export { PluginManager } from './core/PluginManager';
export { type VaporConfig, type Message, type ModelContextProtocol } from './core/types';
export {
    type Integration,
    type MessagingPlatform,
    type SocialMediaPlatform,
    type WalletProvider,
    type AIProvider,
    type StorageProvider,
    type Plugin
} from './core/interfaces';

// AI Providers
export { AnthropicProvider, type AnthropicConfig } from './integrations/ai/AnthropicProvider';

// Social media integrations
export { TwitterAgent } from './integrations/x/TwitterAgent';
export { DiscordAgent } from './integrations/discord/DiscordAgent';
export { TelegramAgent } from './integrations/telegram/TelegramAgent';

// Wallet integration
export { EthereumWallet } from './wallet/EthereumWallet'; 