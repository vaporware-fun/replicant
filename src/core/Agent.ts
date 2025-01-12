import { EventEmitter } from 'events';
import {
    ReplicantConfig,
    Message,
    ModelContextProtocol,
    AIProvider,
    PersonalityProvider,
    StateProvider,
    MemoryProvider,
    AIResponse,
    Plugin,
    ConversationStateData,
    GoalProvider,
    Task,
    TaskSchedule
} from './interfaces';

export class Agent extends EventEmitter {
    private config: ReplicantConfig;
    private aiProvider?: AIProvider;
    private personalityProvider?: PersonalityProvider;
    private stateProvider?: StateProvider;
    private memoryProvider?: MemoryProvider;
    private goalProvider?: GoalProvider;
    private isRunning: boolean = false;
    private messageQueue: Message[] = [];
    private contextWindow: Message[] = [];
    private readonly maxContextSize: number = 100;
    private taskCheckInterval: number = 60000; // Check tasks every minute
    private taskTimer?: NodeJS.Timeout;

    constructor(config: ReplicantConfig) {
        super();
        this.config = config;
    }

    async setMemoryProvider(provider: MemoryProvider): Promise<void> {
        this.memoryProvider = provider;
    }

    async setStateProvider(provider: StateProvider): Promise<void> {
        this.stateProvider = provider;
    }

    async setGoalProvider(provider: GoalProvider): Promise<void> {
        this.goalProvider = provider;
    }

    async initialize(): Promise<void> {
        if (this.isRunning) return;
        
        await this.aiProvider?.initialize();
        await this.personalityProvider?.initialize();
        await this.stateProvider?.initialize();
        await this.memoryProvider?.initialize();
        await this.goalProvider?.initialize();
        
        // Load persistent state
        if (this.stateProvider) {
            const state = await this.stateProvider.loadState(this.config.userId || '');
            if (state?.variables?.contextWindow) {
                this.contextWindow = state.variables.contextWindow;
            }
        }

        this.isRunning = true;
        this.startMessageLoop();
        this.startTaskLoop();
    }

    private async startTaskLoop() {
        if (!this.goalProvider) return;

        const checkTasks = async () => {
            if (!this.goalProvider) return;
            
            try {
                const tasks = await this.goalProvider.getNextTasks(5);
                for (const task of tasks) {
                    if (this.shouldExecuteTask(task)) {
                        const startTime = Date.now();
                        await this.executeTask(task);
                        const executionTime = Date.now() - startTime;
                        await this.goalProvider.updateTaskMetrics(task.id, executionTime);
                    }
                }
            } catch (error) {
                this.emit('error', error instanceof Error ? error : new Error(String(error)));
            }
        };

        // Initial check
        await checkTasks();
        
        // Set up periodic checks
        this.taskTimer = setInterval(checkTasks, this.taskCheckInterval);
    }

    private shouldExecuteTask(task: Task): boolean {
        if (!task.schedule) return true;

        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        // Check day of week if specified
        if (task.schedule.daysOfWeek && !task.schedule.daysOfWeek.includes(day)) {
            return false;
        }

        // Check time ranges
        for (const range of task.schedule.timeRanges) {
            if (hour >= range.start && hour < range.end) {
                if (task.weight !== undefined) {
                    task.weight *= range.multiplier;
                }
                return true;
            }
        }

        return false;
    }

    private async executeTask(task: Task): Promise<void> {
        // Convert task to message format
        const taskMessage: Message = {
            role: 'system',
            content: `Execute task: ${task.description}`,
            metadata: {
                taskId: task.id,
                goalId: task.goalId,
                priority: task.priority,
                weight: task.weight
            }
        };

        await this.queueMessage(taskMessage);
    }

    async shutdown(): Promise<void> {
        this.isRunning = false;
        if (this.taskTimer) {
            clearInterval(this.taskTimer);
        }
        
        // Save state before shutting down
        if (this.stateProvider) {
            const stateData: ConversationStateData = {
                id: this.config.userId || '',
                turnCount: this.contextWindow.length,
                lastInteraction: new Date(),
                variables: {
                    contextWindow: this.contextWindow
                },
                userProfile: {
                    id: this.config.userId || '',
                    preferences: this.config.userPreferences || {},
                    history: {
                        topics: [],
                        interactions: this.contextWindow.length,
                        lastSeen: new Date()
                    }
                },
                emotionalState: {
                    user: 'neutral',
                    agent: 'neutral',
                    confidence: 1.0
                },
                flags: {}
            };
            await this.stateProvider.saveState(stateData);
        }

        await this.aiProvider?.shutdown();
        await this.personalityProvider?.shutdown();
        await this.stateProvider?.shutdown();
        await this.memoryProvider?.shutdown();
        await this.goalProvider?.shutdown();
    }

    async pause(): Promise<void> {
        this.isRunning = false;
        // Save state but don't shut down providers
        if (this.stateProvider) {
            const stateData: ConversationStateData = {
                id: this.config.userId || '',
                turnCount: this.contextWindow.length,
                lastInteraction: new Date(),
                variables: {
                    contextWindow: this.contextWindow
                },
                userProfile: {
                    id: this.config.userId || '',
                    preferences: this.config.userPreferences || {},
                    history: {
                        topics: [],
                        interactions: this.contextWindow.length,
                        lastSeen: new Date()
                    }
                },
                emotionalState: {
                    user: 'neutral',
                    agent: 'neutral',
                    confidence: 1.0
                },
                flags: {}
            };
            await this.stateProvider.saveState(stateData);
        }
    }

    async resume(): Promise<void> {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startMessageLoop();
            this.startTaskLoop();
        }
    }

    private async startMessageLoop() {
        while (this.isRunning) {
            if (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift()!;
                try {
                    const response = await this.processMessage(message);
                    this.emit('message', {
                        role: 'assistant',
                        content: response.content,
                        metadata: response.metadata
                    });
                    
                    // Store in memory if significant
                    if (this.memoryProvider && this.isSignificantInteraction(message, response)) {
                        await this.memoryProvider.storeMemory({
                            content: `User: ${message.content}\nAgent: ${response.content}`,
                            type: 'interaction',
                            metadata: {
                                timestamp: new Date(),
                                context: message.metadata,
                                response_metadata: response.metadata
                            }
                        });
                    }
                } catch (error) {
                    this.emit('error', error instanceof Error ? error : new Error(String(error)));
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100)); // Prevent CPU spinning
        }
    }

    async queueMessage(message: Message): Promise<void> {
        this.messageQueue.push(message);
    }

    async processMessage(message: Message): Promise<AIResponse> {
        if (!this.aiProvider) {
            throw new Error('AI provider not set');
        }

        // Update context window
        this.contextWindow.push(message);
        if (this.contextWindow.length > this.maxContextSize) {
            // Before removing old messages, store them in long-term memory
            if (this.memoryProvider) {
                const oldMessages = this.contextWindow.slice(0, this.contextWindow.length - this.maxContextSize);
                await this.memoryProvider.storeMemory({
                    content: oldMessages.map(m => `${m.role}: ${m.content}`).join('\n'),
                    type: 'context_history',
                    metadata: {
                        timestamp: new Date(),
                        message_count: oldMessages.length
                    }
                });
            }
            this.contextWindow = this.contextWindow.slice(-this.maxContextSize);
        }

        // Build context with relevant memories
        let relevantMemories: string[] = [];
        if (this.memoryProvider) {
            const memories = await this.memoryProvider.searchMemories(message.content, 5);
            relevantMemories = memories.map(memory => memory.content);
        }

        const context: ModelContextProtocol = {
            messages: this.contextWindow,
            metadata: {
                domain: this.config.domain,
                conversation_id: message.metadata?.conversation_id,
                user_id: this.config.userId,
                platform: this.config.platform,
                capabilities: this.config.capabilities,
                permissions: this.config.permissions,
                tools: [],
                memories: relevantMemories
            }
        };

        return this.aiProvider.processMessage(message, context);
    }

    private isSignificantInteraction(message: Message, response: AIResponse): boolean {
        // Define criteria for what makes an interaction significant enough to store
        return (
            response.confidence > 0.8 ||
            message.metadata?.important ||
            (response.metadata?.emotional_state?.confidence ?? 0) > 0.8 ||
            this.containsKeywords(message.content) ||
            this.containsKeywords(response.content)
        );
    }

    private containsKeywords(text: string): boolean {
        const significantKeywords = ['important', 'critical', 'urgent', 'remember', 'key', 'crucial'];
        return significantKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    async setAIProvider(provider: AIProvider): Promise<void> {
        this.aiProvider = provider;
    }

    async setPersonalityProvider(provider: PersonalityProvider): Promise<void> {
        this.personalityProvider = provider;
    }
} 