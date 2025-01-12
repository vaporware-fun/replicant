import { Dataset, DatasetProvider } from './interfaces';

export class BaseDatasetProvider implements DatasetProvider {
    name = 'dataset';
    version = '1.0.0';
    type = 'dataset' as const;

    private datasets: Map<string, Dataset> = new Map();

    async initialize(): Promise<void> {
        // Initialize storage for datasets
    }

    async shutdown(): Promise<void> {
        // Clean up any resources
        this.datasets.clear();
    }

    async loadDataset(id: string): Promise<Dataset> {
        const dataset = this.datasets.get(id);
        if (!dataset) {
            throw new Error(`Dataset ${id} not found`);
        }
        return dataset;
    }

    async saveEntry(datasetId: string, entry: any): Promise<void> {
        const dataset = await this.loadDataset(datasetId);
        dataset.entries.push(entry);
        
        // Validate entry if rules exist
        if (dataset.validation?.rules) {
            const isValid = await this.validateEntry(entry, dataset.validation.rules);
            if (!isValid) {
                dataset.entries.pop(); // Remove invalid entry
                throw new Error('Entry validation failed');
            }
        }

        // Update metrics
        if (dataset.validation?.metrics) {
            await this.updateMetrics(datasetId);
        }
    }

    async validateEntry(entry: any, rules: Record<string, (entry: any) => boolean>): Promise<boolean> {
        return Object.entries(rules).every(([name, validator]) => {
            try {
                return validator(entry);
            } catch (error) {
                console.error(`Validation rule ${name} failed:`, error);
                return false;
            }
        });
    }

    async getMetrics(datasetId: string): Promise<Record<string, number>> {
        const dataset = await this.loadDataset(datasetId);
        return dataset.validation?.metrics || {};
    }

    async createDataset(id: string, type: Dataset['type'], validation?: Dataset['validation']): Promise<void> {
        if (this.datasets.has(id)) {
            throw new Error(`Dataset ${id} already exists`);
        }

        const dataset: Dataset = {
            id,
            type,
            entries: [],
            validation
        };

        this.datasets.set(id, dataset);
    }

    private async updateMetrics(datasetId: string): Promise<void> {
        const dataset = await this.loadDataset(datasetId);
        if (!dataset.validation?.metrics) return;

        // Example metrics calculations
        const metrics: Record<string, number> = {
            entryCount: dataset.entries.length,
            averageInputLength: dataset.entries.reduce((sum, entry) => 
                sum + JSON.stringify(entry.input).length, 0) / dataset.entries.length,
            averageOutputLength: dataset.entries.reduce((sum, entry) => 
                sum + JSON.stringify(entry.output).length, 0) / dataset.entries.length,
        };

        dataset.validation.metrics = metrics;
    }
} 