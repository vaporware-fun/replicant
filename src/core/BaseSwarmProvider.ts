import { SwarmProvider, SwarmConfig, SwarmMetrics, SwarmDecision, Task, Agent } from './interfaces';

export class BaseSwarmProvider implements SwarmProvider {
    name = 'base-swarm';
    version = '1.0.0';
    type = 'swarm' as const;

    private config!: SwarmConfig;
    private agents: Map<string, Agent> = new Map();
    private decisions: Map<string, SwarmDecision> = new Map();
    private taskAssignments: Map<string, Set<string>> = new Map();
    private metrics: SwarmMetrics = {
        agentCount: 0,
        taskDistribution: {},
        consensusRate: 0,
        averageResponseTime: 0,
        resourceUtilization: 0
    };

    async initialize(config: SwarmConfig): Promise<void> {
        this.config = config;
        // Spawn initial agents based on minAgents config
        for (let i = 0; i < config.minAgents; i++) {
            const specialization = config.specializations[i % config.specializations.length];
            await this.spawnAgent(specialization);
        }
    }

    async shutdown(): Promise<void> {
        // Shutdown all agents
        for (const agent of this.agents.values()) {
            await agent.shutdown();
        }
        this.agents.clear();
        this.decisions.clear();
        this.taskAssignments.clear();
    }

    async spawnAgent(specialization: string): Promise<string> {
        if (this.agents.size >= this.config.maxAgents) {
            throw new Error('Maximum number of agents reached');
        }

        const agentId = `swarm-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const agent = new Agent({
            domain: specialization,
            userId: agentId,
            platform: 'swarm',
            capabilities: ['task-execution', 'decision-making'],
            permissions: ['read-messages', 'send-messages']
        });

        await agent.initialize();
        this.agents.set(agentId, agent);
        this.updateMetrics();
        
        return agentId;
    }

    async mergeAgents(agentIds: string[]): Promise<void> {
        if (agentIds.length < 2) return;
        if (this.agents.size - agentIds.length + 1 < this.config.minAgents) {
            throw new Error('Cannot merge agents: would result in too few agents');
        }

        // Create a new agent with combined knowledge
        const newAgentId = await this.spawnAgent('merged');
        const newAgent = this.agents.get(newAgentId)!;

        // Shutdown merged agents
        for (const agentId of agentIds) {
            const agent = this.agents.get(agentId);
            if (agent) {
                await agent.shutdown();
                this.agents.delete(agentId);
            }
        }

        this.updateMetrics();
    }

    async getActiveAgents(): Promise<string[]> {
        return Array.from(this.agents.keys());
    }

    async proposeDecision(topic: string, options: string[]): Promise<string> {
        const decision: SwarmDecision = {
            topic,
            options,
            votes: {},
            confidence: 0,
            reasoning: [],
            timestamp: new Date()
        };

        this.decisions.set(topic, decision);
        return topic;
    }

    async submitVote(agentId: string, topic: string, vote: string, confidence: number): Promise<void> {
        const decision = this.decisions.get(topic);
        if (!decision) throw new Error('Decision not found');
        if (!decision.options.includes(vote)) throw new Error('Invalid vote option');

        decision.votes[agentId] = vote;
        decision.reasoning.push(`Agent ${agentId} voted for ${vote} with confidence ${confidence}`);
        
        this.updateDecisionConfidence(decision);
    }

    async getConsensus(topic: string): Promise<SwarmDecision | null> {
        const decision = this.decisions.get(topic);
        if (!decision) return null;

        const totalVotes = Object.keys(decision.votes).length;
        if (totalVotes < this.agents.size * this.config.consensusThreshold) {
            return null;
        }

        return decision;
    }

    async distributeTask(task: Task): Promise<string[]> {
        const availableAgents = Array.from(this.agents.entries())
            .filter(([agentId]) => {
                const currentTasks = this.taskAssignments.get(agentId)?.size || 0;
                return currentTasks < 3; // Max 3 tasks per agent
            })
            .map(([agentId]) => agentId);

        if (availableAgents.length === 0) {
            // Spawn new agent if below maxAgents
            if (this.agents.size < this.config.maxAgents) {
                const newAgentId = await this.spawnAgent(task.type || 'general');
                availableAgents.push(newAgentId);
            } else {
                throw new Error('No available agents and cannot spawn more');
            }
        }

        // Assign task to agents based on specialization and current load
        const assignedAgents = availableAgents.slice(0, Math.ceil(Math.sqrt(availableAgents.length)));
        
        for (const agentId of assignedAgents) {
            let tasks = this.taskAssignments.get(agentId);
            if (!tasks) {
                tasks = new Set();
                this.taskAssignments.set(agentId, tasks);
            }
            tasks.add(task.id);
        }

        this.updateMetrics();
        return assignedAgents;
    }

    async reportTaskProgress(agentId: string, taskId: string, progress: number): Promise<void> {
        const tasks = this.taskAssignments.get(agentId);
        if (!tasks || !tasks.has(taskId)) {
            throw new Error('Task not assigned to agent');
        }

        if (progress >= 100) {
            tasks.delete(taskId);
            if (tasks.size === 0) {
                this.taskAssignments.delete(agentId);
            }
        }

        this.updateMetrics();
    }

    async getSwarmMetrics(): Promise<SwarmMetrics> {
        return this.metrics;
    }

    private updateMetrics(): void {
        // Update agent count
        this.metrics.agentCount = this.agents.size;

        // Update task distribution
        const taskCounts: Record<string, number> = {};
        for (const tasks of this.taskAssignments.values()) {
            for (const taskId of tasks) {
                taskCounts[taskId] = (taskCounts[taskId] || 0) + 1;
            }
        }
        this.metrics.taskDistribution = taskCounts;

        // Update consensus rate
        const totalDecisions = this.decisions.size;
        const consensusReached = Array.from(this.decisions.values())
            .filter(d => Object.keys(d.votes).length >= this.agents.size * this.config.consensusThreshold)
            .length;
        this.metrics.consensusRate = totalDecisions > 0 ? consensusReached / totalDecisions : 0;

        // Update resource utilization
        const totalPossibleTasks = this.agents.size * 3; // Max 3 tasks per agent
        const currentTasks = Array.from(this.taskAssignments.values())
            .reduce((sum, tasks) => sum + tasks.size, 0);
        this.metrics.resourceUtilization = totalPossibleTasks > 0 ? currentTasks / totalPossibleTasks : 0;
    }

    private updateDecisionConfidence(decision: SwarmDecision): void {
        const votes = Object.values(decision.votes);
        const totalVotes = votes.length;
        if (totalVotes === 0) return;

        // Calculate vote distribution
        const distribution: Record<string, number> = {};
        for (const vote of votes) {
            distribution[vote] = (distribution[vote] || 0) + 1;
        }

        // Find the most voted option
        const maxVotes = Math.max(...Object.values(distribution));
        const consensus = maxVotes / totalVotes;

        decision.confidence = consensus;
    }
} 