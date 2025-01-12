import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function summarize(text: string): Promise<string> {
    try {
        const response = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 500,
            temperature: 0.3,
            system: "You are a helpful assistant that creates concise summaries.",
            messages: [{
                role: "user",
                content: `Please summarize the following text:\n\n${text}`
            }]
        });

        if (response.content[0].type === 'text') {
            return response.content[0].text || 'No summary generated';
        }
        return 'No summary generated';
    } catch (error) {
        console.error('Summarization failed:', error instanceof Error ? error.message : String(error));
        return 'Summary generation failed';
    }
} 