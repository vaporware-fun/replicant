import { FunctionProvider, FunctionDefinition, FunctionCallResult } from './interfaces';

export class BaseFunctionProvider implements FunctionProvider {
    private functions: Map<string, {
        definition: FunctionDefinition;
        handler: (args: Record<string, any>) => Promise<any>;
    }> = new Map();

    async initialize(): Promise<void> {
        // Initialization logic if needed
    }

    async shutdown(): Promise<void> {
        this.functions.clear();
    }

    registerFunction(
        definition: FunctionDefinition,
        handler: (args: Record<string, any>) => Promise<any>
    ): void {
        this.functions.set(definition.name, { definition, handler });
    }

    async executeFunction(name: string, args: Record<string, any>): Promise<FunctionCallResult> {
        const func = this.functions.get(name);
        if (!func) {
            return {
                success: false,
                error: `Function ${name} not found`
            };
        }

        try {
            if (!this.validateParameters(args, func.definition)) {
                return {
                    success: false,
                    error: 'Invalid parameters'
                };
            }

            const result = await func.handler(args);
            return {
                success: true,
                result
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    listFunctions(): FunctionDefinition[] {
        return Array.from(this.functions.values()).map(f => f.definition);
    }

    validateParameters(params: Record<string, any>, definition: FunctionDefinition): boolean {
        if (!definition.parameters) return true;
        
        for (const [name, param] of Object.entries(definition.parameters)) {
            if (param.required && !(name in params)) {
                return false;
            }
            
            if (name in params) {
                const value = params[name];
                if (!this.validateParameterType(value, param.type)) {
                    return false;
                }
            }
        }
        
        return true;
    }

    private validateParameterType(value: any, type: string): boolean {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'object':
                return typeof value === 'object' && value !== null;
            case 'array':
                return Array.isArray(value);
            default:
                return true;
        }
    }
} 