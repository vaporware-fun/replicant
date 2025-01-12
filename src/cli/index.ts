import { Command } from 'commander';
import * as readline from 'readline';
import { Agent } from '../core/Agent';
import { ReplicantConfig } from '../core/interfaces';
import { AnthropicProvider } from '../integrations/ai/AnthropicProvider';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
    .name('replicant-cli')
    .description('CLI interface for Replicant AI Agent')
    .version('1.0.0');

program.command('chat')
    .description('Start a chat with the AI agent')
    .action(async () => {
        const config: ReplicantConfig = {
            domain: 'cli-chat',
            userId: 'user-1',
            platform: 'cli',
            capabilities: ['text-generation'],
            permissions: ['read', 'write']
        };

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('Chat session started. Type "exit" to quit.');
        
        const prompt = () => {
            rl.question('You: ', async (input) => {
                if (input.toLowerCase() === 'exit') {
                    await agent.shutdown();
                    rl.close();
                    return;
                }

                try {
                    const response = await agent.processMessage({
                        role: 'user',
                        content: input,
                        metadata: {
                            timestamp: new Date().toISOString()
                        }
                    });
                    console.log('Agent:', response.content);
                } catch (error) {
                    console.error('Error:', error);
                }

                prompt();
            });
        };

        const agent = new Agent(config);
        await agent.initialize();

        prompt();
    });

program.parse(); 