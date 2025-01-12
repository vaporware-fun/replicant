import { BaseMediaProvider } from '../core/BaseMediaProvider';
import { MediaContent } from '../core/interfaces';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    // Initialize the media provider
    const mediaProvider = new BaseMediaProvider();
    await mediaProvider.initialize();

    try {
        // Example 1: Process a PDF document
        const pdfContent: MediaContent = {
            type: 'pdf',
            url: 'https://example.com/sample.pdf'
        };
        console.log('\nProcessing PDF...');
        const pdfAnalysis = await mediaProvider.extractPDFContent(pdfContent);
        console.log('PDF Summary:', pdfAnalysis.summary);
        console.log('Page Count:', pdfAnalysis.metadata?.pages);

        // Example 2: Extract content from a webpage
        console.log('\nProcessing webpage...');
        const webAnalysis = await mediaProvider.extractLinkContent('https://example.com');
        console.log('Webpage Summary:', webAnalysis.summary);
        console.log('Title:', webAnalysis.metadata?.title);

        // Example 3: Process an image
        const imageContent: MediaContent = {
            type: 'image',
            url: 'https://example.com/sample.jpg'
        };
        console.log('\nProcessing image...');
        const imageAnalysis = await mediaProvider.analyzeImage(imageContent);
        console.log('Image Content:', imageAnalysis.content);
        console.log('Entities Found:', imageAnalysis.entities?.length);

        // Example 4: Transcribe audio
        const audioContent: MediaContent = {
            type: 'audio',
            url: 'https://example.com/sample.mp3'
        };
        console.log('\nTranscribing audio...');
        const audioAnalysis = await mediaProvider.transcribeAudio(audioContent);
        console.log('Transcription:', audioAnalysis.content);
        console.log('Summary:', audioAnalysis.summary);

        // Example 5: Process video
        const videoContent: MediaContent = {
            type: 'video',
            url: 'https://example.com/sample.mp4'
        };
        console.log('\nProcessing video...');
        const videoAnalysis = await mediaProvider.processVideo(videoContent);
        console.log('Video Content:', videoAnalysis.content);
        console.log('Frame Count:', videoAnalysis.metadata?.frameCount);

        // Example 6: Batch processing
        console.log('\nProcessing batch of media...');
        const batchResults = await mediaProvider.processBatch([
            pdfContent,
            imageContent,
            audioContent
        ]);
        console.log('Batch Results:', batchResults.map(result => ({
            type: result.content.substring(0, 50) + '...',
            summary: result.summary
        })));

        // Example 7: Summarize a conversation
        console.log('\nSummarizing conversation...');
        const conversationAnalysis = await mediaProvider.summarizeConversation([
            { role: 'user', content: 'Can you help me understand machine learning?' },
            { role: 'assistant', content: 'Machine learning is a type of artificial intelligence...' },
            { role: 'user', content: 'What are some common applications?' },
            { role: 'assistant', content: 'Common applications include image recognition, natural language processing...' }
        ]);
        console.log('Conversation Summary:', conversationAnalysis.summary);
        console.log('Topics:', conversationAnalysis.topics);
        console.log('Message Count:', conversationAnalysis.metadata?.messageCount);

    } catch (error) {
        console.error('Error processing media:', error instanceof Error ? error.message : String(error));
    } finally {
        await mediaProvider.shutdown();
    }
}

// Run the example
main().catch(console.error); 