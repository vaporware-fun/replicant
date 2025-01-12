import { Agent } from '../core/Agent';
import { BaseSwarmProvider } from '../core/BaseSwarmProvider';
import { AnthropicProvider } from '../integrations/ai/AnthropicProvider';
import { Task, Message } from '../core/interfaces';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Initialize swarm provider with configuration
    const swarmProvider = new BaseSwarmProvider();
    await swarmProvider.initialize({
        maxAgents: 10,
        minAgents: 3,
        spawnThreshold: 0.8, // Spawn new agent when 80% of agents are busy
        mergeThreshold: 0.3, // Merge agents when less than 30% busy
        specializations: ['reader', 'analyzer', 'summarizer'],
        consensusThreshold: 0.7 // 70% of agents must agree for consensus
    });

    // Create AI provider for the agents
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });

    // Create tasks for document analysis
    const tasks: Task[] = [
        {
            id: 'task-1',
            goalId: 'doc-analysis',
            description: 'Split document into sections',
            type: 'reader',
            status: 'pending',
            priority: 9
        },
        {
            id: 'task-2',
            goalId: 'doc-analysis',
            description: 'Analyze key themes and concepts',
            type: 'analyzer',
            status: 'pending',
            priority: 8,
            dependencies: ['task-1']
        },
        {
            id: 'task-3',
            goalId: 'doc-analysis',
            description: 'Generate comprehensive summary',
            type: 'summarizer',
            status: 'pending',
            priority: 7,
            dependencies: ['task-2']
        }
    ];

    // Distribute tasks to swarm
    console.log('Distributing tasks to swarm...');
    for (const task of tasks) {
        const assignedAgents = await swarmProvider.distributeTask(task);
        console.log(`Task ${task.id} assigned to agents:`, assignedAgents);
    }

    // Monitor swarm metrics
    const metricsInterval = setInterval(async () => {
        const metrics = await swarmProvider.getSwarmMetrics();
        console.log('\nSwarm Metrics:', JSON.stringify(metrics, null, 2));
    }, 5000);

    // Simulate task execution and agent coordination
    setTimeout(async () => {
        // Propose a decision about document structure
        const topic = await swarmProvider.proposeDecision('document-structure', [
            'chronological',
            'thematic',
            'importance-based'
        ]);

        // Get active agents and have them vote
        const agents = await swarmProvider.getActiveAgents();
        for (const agentId of agents) {
            const vote = ['chronological', 'thematic', 'importance-based'][Math.floor(Math.random() * 3)];
            const confidence = 0.5 + Math.random() * 0.5;
            await swarmProvider.submitVote(agentId, topic, vote, confidence);
        }

        // Check consensus
        const decision = await swarmProvider.getConsensus(topic);
        if (decision) {
            console.log('\nConsensus reached:', JSON.stringify(decision, null, 2));
        }

        // Simulate task completion
        for (const task of tasks) {
            const progress = Math.random() * 100;
            const assignedAgents = await swarmProvider.distributeTask(task);
            for (const agentId of assignedAgents) {
                await swarmProvider.reportTaskProgress(agentId, task.id, progress);
            }
        }
    }, 2000);

    // Clean up after 10 seconds
    setTimeout(async () => {
        clearInterval(metricsInterval);
        await swarmProvider.shutdown();
        process.exit(0);
    }, 10000);
}

main().catch(console.error); 