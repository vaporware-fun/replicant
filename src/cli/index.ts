import { Command } from 'commander';
import * as readline from 'readline';
import { Agent } from '../core/Agent';
import { VaporConfig } from '../core/interfaces';
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
    .name('vapor-cli')
    .description('CLI interface for Vapor AI Agent')
    .version('1.0.0');

program.command('chat')
    .description('Start a chat session with the AI agent')
    .action(async () => {
        const config: VaporConfig = {
            domain: 'cli',
            userId: 'cli-user',
            platform: 'cli',
            capabilities: ['text-generation', 'conversation'],
            permissions: ['chat'],
            userPreferences: {}
        };

        const agent = new Agent(config);
        await agent.initialize();

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

        prompt();
    });

program.parse(); 