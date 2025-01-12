import { StateProvider, ConversationStateData, StateTransition } from './interfaces';

export class InMemoryStateProvider implements StateProvider {
    private states: Map<string, ConversationStateData> = new Map();
    private transitions: StateTransition[] = [];
    
    name = 'in-memory-state';
    version = '1.0.0';
    type = 'storage' as const;

    async initialize(): Promise<void> {}

    async shutdown(): Promise<void> {
        this.states.clear();
        this.transitions = [];
    }

    async loadState(userId: string): Promise<ConversationStateData | null> {
        return this.states.get(userId) || null;
    }

    async saveState(state: ConversationStateData): Promise<void> {
        const oldState = this.states.get(state.id);
        if (oldState) {
            this.transitions.push({
                from: oldState,
                to: state,
                trigger: 'state_update',
                timestamp: new Date()
            });
        }
        this.states.set(state.id, state);
    }
} 