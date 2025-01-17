export interface State {
    turnCount: number;
    lastInteraction: string;
    contextWindow: any[];
    userProfile: {
        name: string;
        preferences: Record<string, any>;
        traits: Record<string, any>;
    };
    emotionalState: {
        user: string;
        agent: string;
        confidence: number;
    };
}

export interface StateProvider {
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    loadState(id: string): Promise<State | undefined>;
    saveState(id: string, state: State): Promise<void>;
} 