import { Agent } from '../core/Agent';
import { AnthropicProvider } from '../integrations/ai/AnthropicProvider';
import { BasePatternMatchingProvider } from '../core/BasePatternMatchingProvider';
import { BaseGoalProvider } from '../core/BaseGoalProvider';
import { BaseCoordinationProvider } from '../core/BaseCoordinationProvider';
import { Message, PatternRule, KeywordPriority, AgentRole, Goal, Task, AgentTeam, Collaboration } from '../core/interfaces';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Initialize providers
    const patternProvider = new BasePatternMatchingProvider();
    const goalProvider = new BaseGoalProvider();
    const coordinationProvider = new BaseCoordinationProvider();

    // Set up pattern matching rules
    const documentPatterns: PatternRule[] = [
        {
            pattern: /section on (.*?):/i,
            priority: 10,
            transformations: [{
                from: /(.*)/,
                to: (matches) => `Found section: ${matches[1]}`
            }]
        },
        {
            pattern: /key point: (.*)/i,
            priority: 8,
            transformations: [{
                from: /(.*)/,
                to: (matches) => `Identified key point: ${matches[1]}`
            }]
        }
    ];

    const keywordPriorities: KeywordPriority[] = [
        {
            keyword: 'important',
            weight: 2,
            contexts: ['analysis'],
            decompositionRules: [{
                pattern: 'important (.*)',
                reassemblyRules: ['Noted important point: $1']
            }]
        }
    ];

    await patternProvider.initialize();
    for (const pattern of documentPatterns) {
        await patternProvider.addPattern(pattern);
    }
    await patternProvider.setKeywordPriorities(keywordPriorities);

    // Define team roles
    const roles: AgentRole[] = [
        {
            id: 'leader',
            name: 'Team Leader',
            capabilities: ['coordinate', 'summarize'],
            permissions: ['assign-tasks', 'review-work'],
            responsibilities: ['Coordinate team', 'Review final output']
        },
        {
            id: 'analyzer',
            name: 'Content Analyzer',
            capabilities: ['analyze', 'extract-info'],
            permissions: ['read-document'],
            responsibilities: ['Analyze content', 'Extract key points']
        },
        {
            id: 'summarizer',
            name: 'Content Summarizer',
            capabilities: ['summarize'],
            permissions: ['read-analysis'],
            responsibilities: ['Create summaries', 'Highlight key findings']
        }
    ];

    // Create agents
    const leaderAgent = new Agent({
        domain: 'document-analysis',
        userId: 'leader-1',
        platform: 'team',
        capabilities: roles[0].capabilities,
        permissions: roles[0].permissions
    });

    const analyzerAgent = new Agent({
        domain: 'document-analysis',
        userId: 'analyzer-1',
        platform: 'team',
        capabilities: roles[1].capabilities,
        permissions: roles[1].permissions
    });

    const summarizerAgent = new Agent({
        domain: 'document-analysis',
        userId: 'summarizer-1',
        platform: 'team',
        capabilities: roles[2].capabilities,
        permissions: roles[2].permissions
    });

    // Set up AI providers for each agent
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });

    await leaderAgent.setAIProvider(aiProvider);
    await analyzerAgent.setAIProvider(aiProvider);
    await summarizerAgent.setAIProvider(aiProvider);

    // Define tasks first to avoid reference error
    const taskIds = {
        analysis: uuidv4(),
        summary: uuidv4()
    };

    const tasks: Task[] = [
        {
            id: taskIds.analysis,
            goalId: '', // Will be set after goal creation
            description: 'Extract key points from document',
            status: 'pending',
            priority: 8,
            assignedTo: 'analyzer-1',
            weight: 1.0
        },
        {
            id: taskIds.summary,
            goalId: '', // Will be set after goal creation
            description: 'Create comprehensive summary',
            status: 'pending',
            priority: 7,
            assignedTo: 'summarizer-1',
            dependencies: [taskIds.analysis],
            weight: 0.8
        }
    ];

    // Create team with correct status type
    const team: AgentTeam = {
        id: 'doc-analysis-team',
        name: 'Document Analysis Team',
        members: [
            { agentId: 'leader-1', role: roles[0], status: 'active' as const },
            { agentId: 'analyzer-1', role: roles[1], status: 'active' as const },
            { agentId: 'summarizer-1', role: roles[2], status: 'active' as const }
        ],
        hierarchy: {
            leaderId: 'leader-1',
            reportingChain: {
                'leader-1': ['analyzer-1', 'summarizer-1']
            }
        }
    };

    await coordinationProvider.createTeam(team);

    // Create goal and update task goalIds
    const mainGoal: Goal = {
        id: uuidv4(),
        description: 'Analyze and summarize document',
        priority: 10,
        status: 'active',
        progress: 0,
        metrics: {
            successCriteria: ['Complete analysis', 'Generate summary'],
            currentMetrics: {}
        }
    };

    tasks.forEach(task => task.goalId = mainGoal.id);

    await goalProvider.addGoal(mainGoal);
    for (const task of tasks) {
        await goalProvider.addTask(task);
    }

    // Set up message handlers
    await coordinationProvider.registerMessageHandler('leader-1', async (message: Message) => {
        const response = await leaderAgent.processMessage(message);
        console.log('Leader:', response.content);
    });

    await coordinationProvider.registerMessageHandler('analyzer-1', async (message: Message) => {
        const response = await analyzerAgent.processMessage(message);
        console.log('Analyzer:', response.content);
    });

    await coordinationProvider.registerMessageHandler('summarizer-1', async (message: Message) => {
        const response = await summarizerAgent.processMessage(message);
        console.log('Summarizer:', response.content);
    });

    // Create collaboration with correct type
    const collaboration: Collaboration = {
        id: uuidv4(),
        teamId: team.id,
        type: 'task' as const,
        status: 'active',
        participants: ['leader-1', 'analyzer-1', 'summarizer-1'],
        context: {
            topic: 'Document Analysis',
            goal: mainGoal.id,
            sharedKnowledge: {}
        },
        messages: []
    };

    await coordinationProvider.startCollaboration(collaboration);

    // Simulate document analysis workflow
    const sampleDocument = `
    Section on Introduction:
    This document discusses important findings about climate change.
    
    Section on Key Findings:
    Key point: Global temperatures continue to rise
    Key point: Sea levels are increasing faster than expected
    
    Section on Recommendations:
    Important action items needed for immediate implementation.
    `;

    // Leader assigns work
    await coordinationProvider.broadcastMessage(team.id, {
        role: 'system',
        content: 'Beginning document analysis task',
        metadata: {
            document: sampleDocument
        }
    });

    // Analyzer processes document
    const matches = await patternProvider.findMatches(sampleDocument, { context: 'analysis' });
    const analysis = matches.map(m => {
        const transform = m.pattern.transformations[0];
        if (typeof transform.to === 'function') {
            return transform.to(m.matches);
        }
        return transform.to;
    }).join('\n');

    await coordinationProvider.broadcastMessage(team.id, {
        role: 'assistant',
        content: analysis,
        metadata: {
            from: 'analyzer-1',
            type: 'analysis'
        }
    });

    // Update task status
    await goalProvider.updateTask(taskIds.analysis, { status: 'completed' });

    // Summarizer creates summary
    await coordinationProvider.broadcastMessage(team.id, {
        role: 'assistant',
        content: 'Summary completed: Document outlines climate change findings and recommendations.',
        metadata: {
            from: 'summarizer-1',
            type: 'summary'
        }
    });

    // Update task and goal status
    await goalProvider.updateTask(taskIds.summary, { status: 'completed' });

    // Get final progress
    const progress = await goalProvider.evaluateProgress();
    console.log('Final Progress:', progress);

    // End collaboration
    await coordinationProvider.endCollaboration(collaboration.id, 'Document analysis completed successfully');

    // Clean up
    await leaderAgent.shutdown();
    await analyzerAgent.shutdown();
    await summarizerAgent.shutdown();
    await coordinationProvider.shutdown();
    await goalProvider.shutdown();
    await patternProvider.shutdown();
}

main().catch(console.error); 