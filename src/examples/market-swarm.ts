import { Agent } from '../core/Agent';
import { BaseSwarmProvider } from '../core/BaseSwarmProvider';
import { AnthropicProvider } from '../integrations/ai/AnthropicProvider';
import { BasePersonalityProvider } from '../core/BasePersonalityProvider';
import { InMemoryStateProvider } from '../core/InMemoryStateProvider';
import { VectorMemoryProvider } from '../integrations/memory/VectorMemoryProvider';
import { Message, SwarmMetrics } from '../core/interfaces';
import dotenv from 'dotenv';
import { PerplexityProvider } from '../integrations/search/PerplexityProvider';

dotenv.config();

interface MarketState {
    price: number;
    volume: number;
    volatility: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    timestamp: Date;
}

async function main() {
    // Initialize providers
    const swarmProvider = new BaseSwarmProvider();
    const aiProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229'
    });
    const searchProvider = new PerplexityProvider({
        apiKey: process.env.PERPLEXITY_API_KEY!
    });

    await searchProvider.initialize();

    // Initialize swarm with different agent specializations
    await swarmProvider.initialize({
        maxAgents: 10,
        minAgents: 5,
        spawnThreshold: 0.8,
        mergeThreshold: 0.3,
        specializations: [
            'trend-follower',
            'mean-reverter',
            'volatility-trader',
            'sentiment-analyzer',
            'risk-manager'
        ],
        consensusThreshold: 0.7
    });

    // Market state that agents will monitor and react to
    let marketState: MarketState = {
        price: 100,
        volume: 1000,
        volatility: 0.15,
        sentiment: 'neutral',
        timestamp: new Date()
    };

    // Update market state with real data
    const updateMarket = async () => {
        try {
            // Search for recent market data
            const results = await searchProvider.search('current market conditions SPY volatility sentiment', {
                maxResults: 3,
                recency: 'hour'
            });

            // Get summary of market conditions
            const summary = await searchProvider.summarizeResults(results);

            // Update market state based on analysis
            const priceMatch = summary.match(/SPY.*?(\d+\.?\d*)/);
            const volatilityMatch = summary.match(/VIX.*?(\d+\.?\d*)/);
            const volumeMatch = summary.match(/volume.*?(\d+\.?\d*[MBK])/i);
            
            marketState = {
                price: priceMatch ? parseFloat(priceMatch[1]) : marketState.price,
                volume: volumeMatch ? parseVolumeString(volumeMatch[1]) : marketState.volume,
                volatility: volatilityMatch ? parseFloat(volatilityMatch[1]) / 100 : marketState.volatility,
                sentiment: determineSentiment(summary),
                timestamp: new Date()
            };
        } catch (error) {
            // Fallback to simulated updates if API fails
            const random = () => (Math.random() - 0.5) * 2;
            marketState = {
                price: marketState.price * (1 + random() * 0.01),
                volume: Math.max(100, marketState.volume * (1 + random() * 0.05)),
                volatility: Math.max(0.05, Math.min(0.5, marketState.volatility * (1 + random() * 0.1))),
                sentiment: random() > 0.7 ? 'bullish' : random() < -0.7 ? 'bearish' : 'neutral',
                timestamp: new Date()
            };
        }
    };

    // Helper functions for parsing market data
    function parseVolumeString(volume: string): number {
        const multiplier = volume.endsWith('B') ? 1e9 : volume.endsWith('M') ? 1e6 : volume.endsWith('K') ? 1e3 : 1;
        return parseFloat(volume) * multiplier;
    }

    function determineSentiment(summary: string): 'bullish' | 'bearish' | 'neutral' {
        const bullishWords = ['bullish', 'optimistic', 'positive', 'upward', 'gains', 'higher'];
        const bearishWords = ['bearish', 'pessimistic', 'negative', 'downward', 'losses', 'lower'];
        
        const bullishCount = bullishWords.reduce((count, word) => 
            count + (summary.toLowerCase().match(new RegExp(word, 'g')) || []).length, 0);
        const bearishCount = bearishWords.reduce((count, word) => 
            count + (summary.toLowerCase().match(new RegExp(word, 'g')) || []).length, 0);
        
        if (bullishCount > bearishCount + 2) return 'bullish';
        if (bearishCount > bullishCount + 2) return 'bearish';
        return 'neutral';
    }

    // Periodic market updates
    const marketInterval = setInterval(updateMarket, 1000);

    // Set up agents with their own memory and state
    const agents = await swarmProvider.getActiveAgents();
    for (const agentId of agents) {
        const agent = new Agent({
            domain: 'market-making',
            userId: agentId,
            platform: 'swarm',
            capabilities: ['market-analysis', 'trading'],
            permissions: ['read-market-data', 'propose-trades']
        });

        // Give each agent its own providers
        const stateProvider = new InMemoryStateProvider();
        const personalityProvider = new BasePersonalityProvider();
        const memoryProvider = new VectorMemoryProvider({
            url: process.env.QDRANT_URL!,
            collection: `market-memory-${agentId}`
        });

        await agent.setAIProvider(aiProvider);
        await agent.setStateProvider(stateProvider);
        await agent.setPersonalityProvider(personalityProvider);
        await agent.setMemoryProvider(memoryProvider);

        // Initialize agent with specialized behavior
        await agent.initialize();

        // Set up continuous market monitoring
        agent.on('message', async (message: Message) => {
            if (message.metadata?.type === 'market-analysis') {
                // Store analysis in agent's memory
                await memoryProvider.storeMemory({
                    content: message.content,
                    type: 'learned_fact',
                    metadata: {
                        timestamp: new Date(),
                        context: {
                            marketState,
                            analysis: message.metadata.analysis
                        }
                    }
                });

                // Propose trading decision based on analysis
                const topic = await swarmProvider.proposeDecision(`trade-${Date.now()}`, [
                    'buy',
                    'sell',
                    'hold'
                ]);

                // Submit vote with confidence based on analysis
                const confidence = message.metadata.confidence || 0.5;
                await swarmProvider.submitVote(
                    agentId,
                    topic,
                    message.metadata.recommendation || 'hold',
                    confidence
                );
            }
        });

        // Start continuous market analysis
        setInterval(async () => {
            const specialization = agentId.split('-')[0];
            let analysis = '';
            let recommendation = 'hold';
            let confidence = 0.5;

            // Different analysis strategies based on specialization
            switch (specialization) {
                case 'trend-follower':
                    const priceChange = (marketState.price - 100) / 100;
                    analysis = `Price trend is ${priceChange > 0 ? 'up' : 'down'} by ${Math.abs(priceChange * 100).toFixed(2)}%`;
                    recommendation = priceChange > 0.01 ? 'buy' : priceChange < -0.01 ? 'sell' : 'hold';
                    confidence = Math.min(0.9, Math.abs(priceChange * 10));
                    break;

                case 'mean-reverter':
                    const deviation = Math.abs(marketState.price - 100) / 100;
                    analysis = `Price deviation from mean: ${(deviation * 100).toFixed(2)}%`;
                    recommendation = marketState.price > 105 ? 'sell' : marketState.price < 95 ? 'buy' : 'hold';
                    confidence = Math.min(0.9, deviation);
                    break;

                case 'volatility-trader':
                    analysis = `Current volatility: ${(marketState.volatility * 100).toFixed(2)}%`;
                    recommendation = marketState.volatility > 0.2 ? 'sell' : marketState.volatility < 0.1 ? 'buy' : 'hold';
                    confidence = Math.min(0.9, marketState.volatility * 2);
                    break;

                case 'sentiment-analyzer':
                    analysis = `Market sentiment is ${marketState.sentiment}`;
                    recommendation = marketState.sentiment === 'bullish' ? 'buy' : marketState.sentiment === 'bearish' ? 'sell' : 'hold';
                    confidence = 0.7;
                    break;

                case 'risk-manager':
                    const risk = (marketState.volatility * marketState.volume) / 10000;
                    analysis = `Current risk level: ${risk.toFixed(2)}`;
                    recommendation = risk > 2 ? 'sell' : risk < 0.5 ? 'buy' : 'hold';
                    confidence = Math.min(0.9, risk / 3);
                    break;
            }

            // Process market analysis
            await agent.processMessage({
                role: 'system',
                content: analysis,
                metadata: {
                    type: 'market-analysis',
                    marketState,
                    analysis,
                    recommendation,
                    confidence
                }
            });
        }, 2000);
    }

    // Monitor and log swarm activity
    let lastMetrics: SwarmMetrics | null = null;
    const monitorInterval = setInterval(async () => {
        const metrics = await swarmProvider.getSwarmMetrics();
        
        // Only log if metrics have changed
        if (!lastMetrics || JSON.stringify(metrics) !== JSON.stringify(lastMetrics)) {
            console.log('\nSwarm Metrics:', JSON.stringify(metrics, null, 2));
            console.log('Market State:', JSON.stringify(marketState, null, 2));
            
            // Get latest consensus
            const decisions = await Promise.all(
                Array.from({ length: 5 }, (_, i) => 
                    swarmProvider.getConsensus(`trade-${Date.now() - i * 2000}`)
                )
            );
            
            const latestDecision = decisions.find(d => d !== null);
            if (latestDecision) {
                console.log('Latest Trading Decision:', JSON.stringify(latestDecision, null, 2));
            }
        }
        
        lastMetrics = metrics;
    }, 5000);

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        clearInterval(marketInterval);
        clearInterval(monitorInterval);
        await swarmProvider.shutdown();
        process.exit(0);
    });

    console.log('Market swarm is running. Press Ctrl+C to exit.');
}

main().catch(console.error); 