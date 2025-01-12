import { MonitoringProvider } from './interfaces';

export class BaseMonitoringProvider implements MonitoringProvider {
    name = 'monitoring';
    version = '1.0.0';
    type = 'monitoring' as const;

    private events: Array<{
        type: string;
        data: any;
        severity: 'info' | 'warning' | 'error';
        timestamp: Date;
    }> = [];

    private alerts: Array<{
        condition: string;
        threshold: number;
        lastTriggered?: Date;
    }> = [];

    async initialize(): Promise<void> {
        // Initialize monitoring system
    }

    async shutdown(): Promise<void> {
        // Clean up resources
        this.events = [];
        this.alerts = [];
    }

    async logEvent(event: {
        type: string;
        data: any;
        severity: 'info' | 'warning' | 'error';
        timestamp: Date;
    }): Promise<void> {
        this.events.push(event);
        
        // Check alerts
        await this.checkAlerts(event);
        
        // Prune old events if needed
        if (this.events.length > 10000) {
            this.events = this.events.slice(-10000);
        }
    }

    async getMetrics(timeframe: { start: Date; end: Date }): Promise<Record<string, number>> {
        const relevantEvents = this.events.filter(
            event => event.timestamp >= timeframe.start && event.timestamp <= timeframe.end
        );

        return {
            totalEvents: relevantEvents.length,
            errorCount: relevantEvents.filter(e => e.severity === 'error').length,
            warningCount: relevantEvents.filter(e => e.severity === 'warning').length,
            infoCount: relevantEvents.filter(e => e.severity === 'info').length,
            averageEventsPerHour: relevantEvents.length / 
                (Math.max(1, (timeframe.end.getTime() - timeframe.start.getTime()) / (1000 * 60 * 60)))
        };
    }

    async setAlert(condition: string, threshold: number): Promise<void> {
        this.alerts.push({ condition, threshold });
    }

    async getTraces(filter: Record<string, any>): Promise<any[]> {
        return this.events.filter(event => 
            Object.entries(filter).every(([key, value]) => 
                event.data[key] === value
            )
        );
    }

    private async checkAlerts(event: {
        type: string;
        data: any;
        severity: 'info' | 'warning' | 'error';
        timestamp: Date;
    }): Promise<void> {
        for (const alert of this.alerts) {
            try {
                // Simple evaluation of condition using eval (in production, use a proper expression evaluator)
                const context = { event, metrics: await this.getMetrics({ 
                    start: new Date(Date.now() - 3600000), // Last hour
                    end: new Date() 
                })};
                
                const result = eval(`with (context) { ${alert.condition} }`);
                
                if (result >= alert.threshold) {
                    alert.lastTriggered = new Date();
                    await this.logEvent({
                        type: 'alert_triggered',
                        data: {
                            condition: alert.condition,
                            threshold: alert.threshold,
                            value: result
                        },
                        severity: 'warning',
                        timestamp: new Date()
                    });
                }
            } catch (error) {
                console.error(`Failed to evaluate alert condition: ${alert.condition}`, error);
            }
        }
    }
} 