// Base interface for all integrations
export interface Integration {
    initialize(config?: any): Promise<void>;
    shutdown(): Promise<void>;
}

// Function Calling System
export interface FunctionParameter {
    type: string;
    description?: string;
    required?: boolean;
}

export interface FunctionDefinition {
    name: string;
    description: string;
    parameters?: Record<string, FunctionParameter>;
    returnType?: string;
}

export interface FunctionCallResult {
    success: boolean;
    result?: any;
    error?: string;
}

export interface FunctionProvider extends Integration {
    registerFunction(
        definition: FunctionDefinition,
        handler: (args: Record<string, any>) => Promise<any>
    ): void;
    executeFunction(name: string, args: Record<string, any>): Promise<FunctionCallResult>;
    listFunctions(): FunctionDefinition[];
    validateParameters(params: Record<string, any>, definition: FunctionDefinition): boolean;
}

export interface ReplicantConfig {
    domain: string;
    userId: string;
    platform: string;
    capabilities: string[];
    permissions: string[];
    tools?: string[];
    userPreferences?: Record<string, any>;
}

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    metadata?: Record<string, any>;
}

export interface MCPMetadata {
    domain?: string;
    conversation_id?: string;
    user_id?: string;
    platform?: string;
    capabilities?: string[];
    permissions?: string[];
    tools?: string[];
    memories?: string[];
}

export interface ModelContextProtocol {
    messages: Message[];
    metadata: MCPMetadata;
}

export interface UserProfile {
    id: string;
    preferences: Record<string, any>;
    history: {
        topics: string[];
        interactions: number;
        lastSeen: Date;
    };
}

export interface EmotionalState {
    user: string;
    agent: string;
    confidence: number;
}

export interface PersonalityTrait {
    name: string;
    value: number; // 0-1 scale
    description: string;
}

export interface ConversationExample {
    input: string;
    response: string;
    context?: string;
    emotion?: string;
    explanation?: string;
}

export interface ResponsePattern {
    trigger: {
        type: 'emotion' | 'topic' | 'intent' | 'keyword';
        value: string;
    };
    templates: string[];
    style: {
        tone?: string;
        formality?: 'casual' | 'neutral' | 'formal';
        empathy?: number; // 0-1 scale
    };
}

export interface PersonalityProfile {
    traits: PersonalityTrait[];
    voice: {
        tone: string;
        style: string;
        vocabulary: 'simple' | 'moderate' | 'advanced';
        commonPhrases?: string[];
        avoidPhrases?: string[];
    };
    background: {
        experiences: string[];
        knowledge: string[];
        values: string[];
        beliefs?: string[];
        preferences?: Record<string, any>;
    };
    adaptability: {
        learningRate: number; // 0-1 scale
        contextSensitivity: number; // 0-1 scale
        emotionalIntelligence: number; // 0-1 scale
    };
    examples: ConversationExample[];
    responsePatterns: ResponsePattern[];
    behaviorRules?: string[];
}

export interface AIResponse {
    content: string;
    confidence: number;
    reasoning?: string;
    metadata?: {
        emotional_state?: EmotionalState;
        [key: string]: any;
    };
}

export interface PersonalityProvider extends Integration {
    getPersonality(): Promise<PersonalityProfile>;
    updatePersonality(updates: Partial<PersonalityProfile>): Promise<void>;
    recordExperience(experience: {
        type: string;
        content: string;
        outcome: 'positive' | 'negative' | 'neutral';
        learnings: string[];
    }): Promise<void>;
    generateResponse(input: {
        message: string;
        context: ModelContextProtocol;
        emotionalState: EmotionalState;
    }): Promise<AIResponse>;
    evolvePersonality(feedback: {
        interactions: Array<{
            input: string;
            response: string;
            feedback: number;
        }>;
        timeframe: {
            start: Date;
            end: Date;
        };
    }): Promise<{
        changes: Partial<PersonalityProfile>;
        reasoning: string;
    }>;
}

export interface MessagingPlatform extends Integration {
    sendMessage(message: string, channelId: string): Promise<void>;
    handleMessage(message: string, metadata: Record<string, any>): Promise<void>;
}

export interface SocialMediaPlatform extends Integration {
    post(content: string): Promise<void>;
    reply(content: string, postId: string): Promise<void>;
    delete(postId: string): Promise<void>;
}

export interface WalletProvider extends Integration {
    getBalance(): Promise<string>;
    sendTransaction(to: string, amount: string): Promise<string>;
    sendToken(tokenAddress: string, to: string, amount: string): Promise<string>;
    getAddress(): string;
    signMessage(message: string): Promise<string>;
}

export interface AIProvider extends Integration {
    processMessage(message: Message, context: ModelContextProtocol): Promise<AIResponse>;
    setContext(context: ModelContextProtocol): Promise<void>;
    clearContext(): Promise<void>;
}

export interface StorageProvider extends Integration {
    save(key: string, value: any): Promise<void>;
    load(key: string): Promise<any>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

export interface Plugin extends Integration {
    name: string;
    version: string;
    type: 'messaging' | 'social' | 'wallet' | 'ai' | 'storage' | 'goals' | 'coordination' | 'patterns' | 'swarm' | 'search' | 'dataset' | 'monitoring' | 'evaluation' | 'feedback' | 'media' | 'custom';
}

export interface ConversationStateData {
    id: string;
    turnCount: number;
    lastInteraction: Date;
    variables: Record<string, any>;
    userProfile: UserProfile;
    emotionalState: EmotionalState;
    flags: Record<string, boolean>;
}

export interface StateProvider extends Plugin {
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    loadState(userId: string): Promise<ConversationStateData | null>;
    saveState(state: ConversationStateData): Promise<void>;
}

export interface StateTransition {
    from: ConversationStateData;
    to: ConversationStateData;
    trigger: string;
    timestamp: Date;
}

export interface Memory {
    content: string;
    type: 'interaction' | 'context_history' | 'learned_fact';
    metadata: {
        timestamp: Date;
        context?: Record<string, any>;
        response_metadata?: Record<string, any>;
        message_count?: number;
    };
}

export interface MemoryProvider extends Plugin {
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    storeMemory(memory: Memory): Promise<void>;
    searchMemories(query: string, limit?: number): Promise<Memory[]>;
    summarizeMemories(timeframe?: { start: Date; end: Date }): Promise<string>;
}

export interface Goal {
    id: string;
    description: string;
    priority: number;
    status: 'active' | 'completed' | 'failed' | 'pending';
    dependencies?: string[];
    deadline?: Date;
    progress: number;
    metrics: {
        successCriteria: string[];
        currentMetrics: Record<string, number>;
    };
}

export interface TaskSchedule {
    id: string;
    taskId: string;
    timeRanges: Array<{
        start: number; // Hour in 24h format
        end: number;
        multiplier: number;
    }>;
    daysOfWeek?: number[]; // 0-6, where 0 is Sunday
    timezone?: string;
}

export interface Task {
    id: string;
    goalId: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    priority: number;
    assignedTo?: string;
    deadline?: Date;
    dependencies?: string[];
    weight?: number;
    type?: string;
    schedule?: TaskSchedule;
    executionCount?: number;
    lastExecuted?: Date;
    averageExecutionTime?: number;
}

export interface GoalProvider extends Integration {
    addGoal(goal: Goal): Promise<void>;
    updateGoal(id: string, updates: Partial<Goal>): Promise<void>;
    removeGoal(id: string): Promise<void>;
    getActiveGoals(): Promise<Goal[]>;
    addTask(task: Task): Promise<void>;
    updateTask(id: string, updates: Partial<Task>): Promise<void>;
    getTasksForGoal(goalId: string): Promise<Task[]>;
    evaluateProgress(): Promise<{
        goals: Record<string, number>;
        overallProgress: number;
    }>;
    scheduleTask(taskId: string, schedule: TaskSchedule): Promise<void>;
    getNextTasks(count: number): Promise<Task[]>;
    updateTaskMetrics(taskId: string, executionTime: number): Promise<void>;
    getTaskSchedule(taskId: string): Promise<TaskSchedule | null>;
}

export interface AgentRole {
    id: string;
    name: string;
    capabilities: string[];
    permissions: string[];
    responsibilities: string[];
}

export interface AgentTeam {
    id: string;
    name: string;
    members: {
        agentId: string;
        role: AgentRole;
        status: 'active' | 'inactive';
    }[];
    hierarchy?: {
        leaderId: string;
        reportingChain: Record<string, string[]>;
    };
}

export interface Collaboration {
    id: string;
    teamId: string;
    type: 'task' | 'discussion' | 'decision';
    status: 'active' | 'completed';
    participants: string[];
    context: {
        topic: string;
        goal?: string;
        sharedKnowledge: Record<string, any>;
    };
    messages: Message[];
}

export interface CoordinationProvider extends Integration {
    createTeam(team: AgentTeam): Promise<void>;
    addMember(teamId: string, agentId: string, role: AgentRole): Promise<void>;
    removeMember(teamId: string, agentId: string): Promise<void>;
    startCollaboration(collaboration: Collaboration): Promise<void>;
    endCollaboration(id: string, summary: string): Promise<void>;
    broadcastMessage(teamId: string, message: Message): Promise<void>;
    getTeamStatus(teamId: string): Promise<{
        activeMembers: number;
        currentCollaborations: number;
        teamMetrics: Record<string, number>;
    }>;
}

export interface PatternRule {
    pattern: string | RegExp;
    priority: number;
    transformations: Array<{
        from: string | RegExp;
        to: string | ((matches: string[]) => string);
        conditions?: Record<string, any>;
    }>;
    context?: {
        required?: string[];
        forbidden?: string[];
    };
}

export interface KeywordPriority {
    keyword: string;
    weight: number;
    contexts: string[];
    decompositionRules: Array<{
        pattern: string;
        reassemblyRules: string[];
    }>;
}

export interface PatternMatchingProvider extends Integration {
    addPattern(pattern: PatternRule): Promise<void>;
    removePattern(pattern: string | RegExp): Promise<void>;
    setKeywordPriorities(priorities: KeywordPriority[]): Promise<void>;
    findMatches(input: string, context: Record<string, any>): Promise<Array<{
        pattern: PatternRule;
        matches: string[];
        score: number;
    }>>;
    transform(input: string, patterns: PatternRule[]): Promise<{
        output: string;
        transformations: string[];
        reasoning: string;
    }>;
}

export interface SwarmConfig {
    maxAgents: number;
    minAgents: number;
    spawnThreshold: number;
    mergeThreshold: number;
    specializations: string[];
    consensusThreshold: number;
}

export interface SwarmMetrics {
    agentCount: number;
    taskDistribution: Record<string, number>;
    consensusRate: number;
    averageResponseTime: number;
    resourceUtilization: number;
}

export interface SwarmDecision {
    topic: string;
    options: string[];
    votes: Record<string, string>;
    confidence: number;
    reasoning: string[];
    timestamp: Date;
}

export interface SwarmProvider extends Plugin {
    type: 'swarm';
    initialize(config: SwarmConfig): Promise<void>;
    shutdown(): Promise<void>;
    
    // Agent lifecycle management
    spawnAgent(specialization: string): Promise<string>;
    mergeAgents(agentIds: string[]): Promise<void>;
    getActiveAgents(): Promise<string[]>;
    
    // Collective decision making
    proposeDecision(topic: string, options: string[]): Promise<string>;
    submitVote(agentId: string, topic: string, vote: string, confidence: number): Promise<void>;
    getConsensus(topic: string): Promise<SwarmDecision | null>;
    
    // Swarm coordination
    distributeTask(task: Task): Promise<string[]>;
    reportTaskProgress(agentId: string, taskId: string, progress: number): Promise<void>;
    getSwarmMetrics(): Promise<SwarmMetrics>;
}

export interface SearchResult {
    content: string;
    source?: string;
    timestamp: Date;
    relevance: number;
    metadata?: {
        title?: string;
        url?: string;
        author?: string;
        publishDate?: Date;
    };
}

export interface SearchProvider extends Plugin {
    type: 'search';
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    search(query: string, options?: {
        maxResults?: number;
        minRelevance?: number;
        recency?: 'hour' | 'day' | 'week' | 'month' | 'any';
    }): Promise<SearchResult[]>;
    validateSource(source: string): Promise<boolean>;
    summarizeResults(results: SearchResult[]): Promise<string>;
}

export interface Dataset {
    id: string;
    type: 'conversation' | 'task' | 'market' | 'custom';
    entries: Array<{
        input: any;
        output: any;
        metadata?: Record<string, any>;
    }>;
    validation?: {
        rules: Record<string, (entry: any) => boolean>;
        metrics: Record<string, number>;
    };
}

export interface DatasetProvider extends Plugin {
    type: 'dataset';
    loadDataset(id: string): Promise<Dataset>;
    saveEntry(datasetId: string, entry: any): Promise<void>;
    validateEntry(entry: any, rules: Record<string, (entry: any) => boolean>): Promise<boolean>;
    getMetrics(datasetId: string): Promise<Record<string, number>>;
}

export interface MonitoringProvider extends Plugin {
    type: 'monitoring';
    logEvent(event: {
        type: string;
        data: any;
        severity: 'info' | 'warning' | 'error';
        timestamp: Date;
    }): Promise<void>;
    getMetrics(timeframe: { start: Date; end: Date }): Promise<Record<string, number>>;
    setAlert(condition: string, threshold: number): Promise<void>;
    getTraces(filter: Record<string, any>): Promise<any[]>;
}

export interface EvaluationProvider extends Plugin {
    type: 'evaluation';
    evaluateResponse(response: AIResponse, criteria: Record<string, (response: AIResponse) => number>): Promise<Record<string, number>>;
    benchmarkAgent(tests: Array<{ input: string; expectedOutput: string }>): Promise<{
        accuracy: number;
        latency: number;
        consistency: number;
    }>;
    compareAgents(agentIds: string[], scenario: string): Promise<Record<string, number>>;
}

export interface FeedbackProvider extends Plugin {
    type: 'feedback';
    recordFeedback(feedback: {
        sessionId: string;
        rating: number;
        comments?: string;
        context: Record<string, any>;
    }): Promise<void>;
    analyzeSentiment(feedback: string): Promise<{
        sentiment: 'positive' | 'negative' | 'neutral';
        confidence: number;
    }>;
    getFeedbackSummary(timeframe: { start: Date; end: Date }): Promise<{
        averageRating: number;
        commonThemes: string[];
        improvements: string[];
    }>;
}

export interface MediaContent {
    type: 'pdf' | 'link' | 'audio' | 'video' | 'image' | 'conversation';
    url?: string;
    data?: Buffer;
    metadata?: {
        mimeType?: string;
        filename?: string;
        size?: number;
        duration?: number;
        dimensions?: { width: number; height: number };
        pages?: number;
        lastModified?: Date;
    };
}

export interface MediaAnalysis {
    content: string;
    summary?: string;
    topics?: string[];
    entities?: Array<{
        type: string;
        name: string;
        confidence: number;
    }>;
    sentiment?: {
        score: number;
        label: 'positive' | 'negative' | 'neutral';
    };
    metadata?: Record<string, any>;
}

export interface MediaProvider extends Plugin {
    type: 'media';
    
    // Document processing
    extractPDFContent(content: MediaContent): Promise<MediaAnalysis>;
    extractLinkContent(url: string): Promise<MediaAnalysis>;
    
    // Audio/Video processing
    transcribeAudio(content: MediaContent): Promise<MediaAnalysis>;
    processVideo(content: MediaContent): Promise<MediaAnalysis>;
    
    // Image processing
    analyzeImage(content: MediaContent): Promise<MediaAnalysis>;
    
    // Conversation processing
    summarizeConversation(messages: Message[]): Promise<MediaAnalysis>;
    
    // Batch processing
    processBatch(contents: MediaContent[]): Promise<MediaAnalysis[]>;
    
    // Utility methods
    validateContent(content: MediaContent): Promise<boolean>;
    getContentType(url: string): Promise<string>;
}

export { Agent } from './Agent'; 