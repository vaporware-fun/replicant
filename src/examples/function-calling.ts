import { BaseFunctionProvider } from '../core/BaseFunctionProvider';
import { FunctionDefinition, FunctionParameter } from '../core/interfaces';

async function main() {
    // Create a function provider
    const functionProvider = new BaseFunctionProvider();
    await functionProvider.initialize();

    // Define a weather function
    const weatherFunction: FunctionDefinition = {
        name: 'get_weather',
        description: 'Get the weather for a specific location',
        parameters: {
            location: {
                type: 'string',
                description: 'City name or coordinates',
                required: true
            },
            unit: {
                type: 'string',
                description: 'Temperature unit (celsius or fahrenheit)',
                required: false
            }
        },
        returnType: 'object'
    };

    // Register the function with its handler
    functionProvider.registerFunction(weatherFunction, async (args) => {
        // This would typically call a weather API
        return {
            temperature: 22,
            unit: args.unit || 'celsius',
            condition: 'sunny',
            location: args.location
        };
    });

    // Define a reminder function
    const reminderFunction: FunctionDefinition = {
        name: 'set_reminder',
        description: 'Set a reminder for a specific time',
        parameters: {
            message: {
                type: 'string',
                description: 'Reminder message',
                required: true
            },
            time: {
                type: 'string',
                description: 'Time for the reminder (ISO string)',
                required: true
            },
            priority: {
                type: 'string',
                description: 'Reminder priority (low, medium, high)',
                required: false
            }
        },
        returnType: 'object'
    };

    // Register the reminder function
    functionProvider.registerFunction(reminderFunction, async (args) => {
        return {
            id: `reminder-${Date.now()}`,
            message: args.message,
            time: args.time,
            priority: args.priority || 'medium',
            created: new Date().toISOString()
        };
    });

    // Example usage
    try {
        // List available functions
        console.log('Available functions:', functionProvider.listFunctions());

        // Call the weather function
        const weatherResult = await functionProvider.executeFunction('get_weather', {
            location: 'San Francisco',
            unit: 'celsius'
        });
        console.log('Weather result:', weatherResult);

        // Call the reminder function
        const reminderResult = await functionProvider.executeFunction('set_reminder', {
            message: 'Team meeting',
            time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            priority: 'high'
        });
        console.log('Reminder result:', reminderResult);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await functionProvider.shutdown();
    }
}

main().catch(console.error); 