import { StateProvider, ConversationStateData } from '../../core/interfaces';

export class InMemoryStateProvider implements StateProvider {
    name = 'in-memory-state';
    version = '1.0.0';
    type = 'storage' as const;

    private states: Map<string, ConversationStateData>;

    constructor() {
        this.states = new Map();
    }

    async initialize(): Promise<void> {
        this.states.clear();
    }

    async shutdown(): Promise<void> {
        this.states.clear();
    }

    async loadState(userId: string): Promise<ConversationStateData | null> {
        try {
            return this.states.get(userId) || null;
        } catch (error) {
            throw new Error('State load failed');
        }
    }

    async saveState(state: ConversationStateData): Promise<void> {
        try {
            this.states.set(state.id, state);
        } catch (error) {
            throw new Error('State save failed');
        }
    }
} 