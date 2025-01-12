import { Agent, AnthropicProvider } from '../';
import { InMemoryStateProvider } from '../core/InMemoryStateProvider';
import { Message } from '../core/types';
import dotenv from 'dotenv';

dotenv.config();

interface Task {
    id: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
    assignedTo?: string;
    result?: any;
}

async function main() {
    // Create a swarm of specialized agents
    const agents = {
        coordinator: new Agent({
            domain: 'swarm-coordinator',
            userId: 'coordinator',
            platform: 'swarm',
            capabilities: ['coordination', 'task-assignment'],
            permissions: ['read', 'write', 'assign-tasks']
        }),
        researcher: new Agent({
            domain: 'research',
            userId: 'researcher',
            platform: 'swarm',
            capabilities: ['research', 'analysis'],
            permissions: ['read', 'write']
        }),
        writer: new Agent({
            domain: 'writing',
            userId: 'writer',
            platform: 'swarm',
            capabilities: ['writing', 'editing'],
            permissions: ['read', 'write']
        }),
        reviewer: new Agent({
            domain: 'review',
            userId: 'reviewer',
            platform: 'swarm',
            capabilities: ['review', 'quality-check'],
            permissions: ['read', 'write']
        })
    };

    // Set up AI provider for all agents
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });

    // Initialize all agents with providers
    for (const [role, agent] of Object.entries(agents)) {
        await agent.setAIProvider(aiProvider);
        await agent.setStateProvider(new InMemoryStateProvider());
        await agent.initialize();
    }

    // Example task: Create a research report
    const tasks: Task[] = [
        {
            id: 'research-1',
            description: 'Research the latest developments in AI agents',
            status: 'pending'
        },
        {
            id: 'research-2',
            description: 'Analyze market trends in AI frameworks',
            status: 'pending'
        },
        {
            id: 'write-1',
            description: 'Write initial draft of research report',
            status: 'pending'
        },
        {
            id: 'review-1',
            description: 'Review and provide feedback on the draft',
            status: 'pending'
        },
        {
            id: 'write-2',
            description: 'Incorporate feedback and finalize report',
            status: 'pending'
        }
    ];

    // Coordinator assigns and monitors tasks
    for (const task of tasks) {
        console.log(`\nProcessing task: ${task.id}`);
        
        // Coordinator decides which agent should handle the task
        const assignmentResponse = await agents.coordinator.processMessage({
            role: 'system',
            content: `Assign task: ${task.description}\nAvailable agents: researcher, writer, reviewer`,
            metadata: {
                timestamp: new Date().toISOString(),
                platform: 'swarm',
                taskId: task.id
            }
        });

        // Parse assignment decision (simplified)
        const assignedAgent = assignmentResponse.content.toLowerCase().includes('research') ? 'researcher' :
                            assignmentResponse.content.toLowerCase().includes('writ') ? 'writer' : 'reviewer';
        
        task.assignedTo = assignedAgent;
        task.status = 'in-progress';
        
        console.log(`Task ${task.id} assigned to ${assignedAgent}`);

        // Assigned agent processes the task
        const taskResponse = await agents[assignedAgent].processMessage({
            role: 'system',
            content: `Complete task: ${task.description}`,
            metadata: {
                timestamp: new Date().toISOString(),
                platform: 'swarm',
                taskId: task.id
            }
        });

        // Store task result
        task.result = taskResponse.content;
        task.status = 'completed';

        // Reviewer checks completed task if it's a writing task
        if (assignedAgent === 'writer') {
            const reviewResponse = await agents.reviewer.processMessage({
                role: 'system',
                content: `Review content: ${task.result}`,
                metadata: {
                    timestamp: new Date().toISOString(),
                    platform: 'swarm',
                    taskId: task.id
                }
            });

            console.log(`Review feedback: ${reviewResponse.content}`);
        }

        console.log(`Task ${task.id} completed by ${assignedAgent}`);
        console.log('Result:', task.result);
    }

    // Final report compilation
    const finalReport = await agents.writer.processMessage({
        role: 'system',
        content: `Compile final report using results from all tasks: ${JSON.stringify(tasks)}`,
        metadata: {
            timestamp: new Date().toISOString(),
            platform: 'swarm',
            type: 'final-compilation'
        }
    });

    console.log('\nFinal Report:', finalReport.content);

    // Cleanup
    for (const agent of Object.values(agents)) {
        await agent.shutdown();
    }
}

main().catch(console.error); 