import { Integration, Plugin } from './interfaces';

export class PluginManager {
    private plugins: Map<string, Plugin>;
    private activeIntegrations: Map<string, Integration>;

    constructor() {
        this.plugins = new Map();
        this.activeIntegrations = new Map();
    }

    registerPlugin(plugin: Plugin): void {
        if (this.plugins.has(plugin.name)) {
            throw new Error(`Plugin ${plugin.name} is already registered`);
        }
        this.plugins.set(plugin.name, plugin);
    }

    async initializePlugin(pluginName: string): Promise<void> {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        try {
            await plugin.initialize();
            this.activeIntegrations.set(pluginName, plugin);
        } catch (error) {
            throw new Error(`Failed to initialize plugin ${pluginName}: ${error}`);
        }
    }

    getPlugin(name: string): Plugin | undefined {
        return this.plugins.get(name);
    }

    getIntegration(name: string): Integration | undefined {
        return this.activeIntegrations.get(name);
    }

    getPluginsByType(type: Plugin['type']): Plugin[] {
        return Array.from(this.plugins.values())
            .filter(plugin => plugin.type === type);
    }

    async shutdownPlugin(name: string): Promise<void> {
        const integration = this.activeIntegrations.get(name);
        if (integration) {
            await integration.shutdown();
            this.activeIntegrations.delete(name);
        }
    }

    async shutdownAll(): Promise<void> {
        const shutdowns = Array.from(this.activeIntegrations.entries()).map(
            async ([name, integration]) => {
                await integration.shutdown();
                this.activeIntegrations.delete(name);
            }
        );
        await Promise.all(shutdowns);
    }
} 