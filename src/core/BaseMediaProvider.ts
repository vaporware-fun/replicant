import { MediaProvider, MediaContent, MediaAnalysis, Message } from './interfaces';
import axios from 'axios';
import { default as pdfParse } from 'pdf-parse';
import { load } from 'cheerio';
import { Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import * as vision from '@google-cloud/vision';
import * as speech from '@google-cloud/speech';
import { summarize } from '../utils/text';

export class BaseMediaProvider implements MediaProvider {
    name = 'base-media-provider';
    version = '1.0.0';
    type = 'media' as const;

    private visionClient?: vision.ImageAnnotatorClient;
    private speechClient?: speech.SpeechClient;

    async initialize(): Promise<void> {
        // Initialize cloud clients if credentials are available
        try {
            this.visionClient = new vision.ImageAnnotatorClient();
            this.speechClient = new speech.SpeechClient();
        } catch (error) {
            console.warn('Cloud services not configured:', error instanceof Error ? error.message : String(error));
        }
    }

    async shutdown(): Promise<void> {
        // Cleanup any resources
    }

    async extractPDFContent(content: MediaContent): Promise<MediaAnalysis> {
        try {
            let dataBuffer: Buffer;
            if (content.url) {
                const { data } = await axios.get(content.url, { 
                    responseType: 'arraybuffer' 
                });
                dataBuffer = Buffer.from(data as ArrayBuffer);
            } else if (content.data) {
                dataBuffer = content.data;
            } else {
                throw new Error('No PDF content provided');
            }

            const result = await pdfParse(dataBuffer);
            const analysis: MediaAnalysis = {
                content: result.text,
                summary: await summarize(result.text),
                metadata: {
                    pages: result.numpages,
                    info: result.info
                }
            };
            return analysis;
        } catch (error) {
            throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async extractLinkContent(url: string): Promise<MediaAnalysis> {
        try {
            const { data } = await axios.get(url);
            const $ = load(data as string);
            
            // Remove script and style elements
            $('script, style').remove();
            
            // Extract main content
            const title = $('title').text();
            const description = $('meta[name="description"]').attr('content') || '';
            const mainContent = $('main, article, #content, .content').text() || $('body').text();
            
            const analysis: MediaAnalysis = {
                content: mainContent,
                summary: await summarize(mainContent),
                metadata: {
                    title,
                    description,
                    url
                }
            };
            return analysis;
        } catch (error) {
            throw new Error(`Link extraction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async transcribeAudio(content: MediaContent): Promise<MediaAnalysis> {
        if (!this.speechClient) {
            throw new Error('Speech client not initialized');
        }

        try {
            let audioBytes: Buffer;
            if (content.url) {
                const { data } = await axios.get(content.url, { 
                    responseType: 'arraybuffer' 
                });
                audioBytes = Buffer.from(data as ArrayBuffer);
            } else if (content.data) {
                audioBytes = content.data;
            } else {
                throw new Error('No audio content provided');
            }

            const audio = {
                content: audioBytes.toString('base64'),
            };
            const config = {
                encoding: 'LINEAR16' as const,
                sampleRateHertz: 16000,
                languageCode: 'en-US',
            };
            const request = {
                audio: audio,
                config: config,
            };

            const [response] = await this.speechClient.recognize(request);
            const transcription = response.results
                ?.map(result => result.alternatives?.[0]?.transcript)
                .filter(Boolean)
                .join('\n') || '';

            return {
                content: transcription,
                summary: await summarize(transcription)
            };
        } catch (error) {
            throw new Error(`Audio transcription failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async processVideo(content: MediaContent): Promise<MediaAnalysis> {
        try {
            // Extract frames and audio
            const frames: Buffer[] = await this.extractKeyFrames(content);
            const audioContent: MediaContent = await this.extractAudio(content);
            
            // Process each component
            const [frameAnalyses, audioAnalysis] = await Promise.all([
                Promise.all(frames.map(frame => this.analyzeImage({ type: 'image', data: frame }))),
                this.transcribeAudio(audioContent)
            ]);
            
            // Combine analyses
            const combinedContent = [
                audioAnalysis.content,
                ...frameAnalyses.map(analysis => analysis.content)
            ].join('\n\n');
            
            return {
                content: combinedContent,
                summary: await summarize(combinedContent),
                metadata: {
                    frameCount: frames.length,
                    duration: content.metadata?.duration
                }
            };
        } catch (error) {
            throw new Error(`Video processing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async analyzeImage(content: MediaContent): Promise<MediaAnalysis> {
        if (!this.visionClient) {
            throw new Error('Vision client not initialized');
        }

        try {
            let imageBytes: Buffer;
            if (content.url) {
                const { data } = await axios.get(content.url, { 
                    responseType: 'arraybuffer' 
                });
                imageBytes = Buffer.from(data as ArrayBuffer);
            } else if (content.data) {
                imageBytes = content.data;
            } else {
                throw new Error('No image content provided');
            }

            const [result] = await this.visionClient.annotateImage({
                image: { content: imageBytes.toString('base64') },
                features: [
                    { type: 'LABEL_DETECTION' as const },
                    { type: 'TEXT_DETECTION' as const },
                    { type: 'OBJECT_LOCALIZATION' as const },
                    { type: 'FACE_DETECTION' as const },
                ]
            });

            const labels = result.labelAnnotations?.map(label => ({
                type: 'label',
                name: label.description || '',
                confidence: label.score || 0
            })) || [];

            const objects = result.localizedObjectAnnotations?.map(obj => ({
                type: 'object',
                name: obj.name || '',
                confidence: obj.score || 0
            })) || [];

            const faces = result.faceAnnotations?.length || 0;
            const text = result.fullTextAnnotation?.text || '';

            return {
                content: [
                    text,
                    `Found ${labels.length} labels, ${objects.length} objects, and ${faces} faces.`
                ].filter(Boolean).join('\n\n'),
                entities: [...labels, ...objects],
                metadata: {
                    hasText: !!text,
                    faceCount: faces
                }
            };
        } catch (error) {
            throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async summarizeConversation(messages: Message[]): Promise<MediaAnalysis> {
        try {
            const conversation = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            const summary = await summarize(conversation);
            
            // Extract key topics and entities
            const topics = await this.extractTopics(conversation);
            const entities = await this.extractEntities(conversation);
            
            return {
                content: conversation,
                summary,
                topics,
                entities,
                metadata: {
                    messageCount: messages.length,
                    participants: [...new Set(messages.map(msg => msg.role))]
                }
            };
        } catch (error) {
            throw new Error(`Conversation summarization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async processBatch(contents: MediaContent[]): Promise<MediaAnalysis[]> {
        return Promise.all(contents.map(content => {
            switch (content.type) {
                case 'pdf':
                    return this.extractPDFContent(content);
                case 'link':
                    return this.extractLinkContent(content.url || '');
                case 'audio':
                    return this.transcribeAudio(content);
                case 'video':
                    return this.processVideo(content);
                case 'image':
                    return this.analyzeImage(content);
                default:
                    throw new Error(`Unsupported content type: ${content.type}`);
            }
        }));
    }

    async validateContent(content: MediaContent): Promise<boolean> {
        try {
            if (content.url) {
                const response = await axios.head(content.url);
                const contentType = response.headers['content-type'];
                return this.isValidContentType(content.type, contentType);
            } else if (content.data) {
                // Validate buffer based on content type
                return true; // Implement more specific validation if needed
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async getContentType(url: string): Promise<string> {
        try {
            const response = await axios.head(url);
            return response.headers['content-type'] || '';
        } catch (error) {
            throw new Error(`Failed to get content type: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async extractKeyFrames(content: MediaContent): Promise<Buffer[]> {
        return new Promise((resolve, reject) => {
            const frames: Buffer[] = [];
            const command = content.url ? 
                ffmpeg(content.url) : 
                ffmpeg(Readable.from(content.data || Buffer.from([])));

            command
                .screenshots({
                    count: 10,
                    folder: '/tmp',
                    filename: 'frame-%i.png'
                })
                .on('filenames', (filenames: string[]) => {
                    // Read the generated files
                    Promise.all(filenames.map(filename => 
                        import('fs/promises').then(fs => 
                            fs.readFile(`/tmp/${filename}`)
                        )
                    )).then(buffers => {
                        frames.push(...buffers);
                        // Clean up files
                        Promise.all(filenames.map(filename =>
                            import('fs/promises').then(fs =>
                                fs.unlink(`/tmp/${filename}`)
                            )
                        )).catch(console.error);
                    }).catch(reject);
                })
                .on('end', () => resolve(frames))
                .on('error', reject);
        });
    }

    private async extractAudio(content: MediaContent): Promise<MediaContent> {
        return new Promise((resolve, reject) => {
            const outputPath = `/tmp/audio-${Date.now()}.wav`;
            const command = content.url ? 
                ffmpeg(content.url) : 
                ffmpeg(Readable.from(content.data || Buffer.from([])));

            command
                .toFormat('wav')
                .save(outputPath)
                .on('end', async () => {
                    try {
                        const data = await import('fs/promises').then(fs =>
                            fs.readFile(outputPath)
                        );
                        await import('fs/promises').then(fs =>
                            fs.unlink(outputPath)
                        );
                        resolve({
                            type: 'audio',
                            data
                        });
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject);
        });
    }

    private async extractTopics(text: string): Promise<string[]> {
        // Implement topic extraction logic
        // This could use NLP libraries or AI services
        return [];
    }

    private async extractEntities(text: string): Promise<Array<{ type: string; name: string; confidence: number }>> {
        // Implement entity extraction logic
        // This could use NLP libraries or AI services
        return [];
    }

    private isValidContentType(type: string, contentType: string): boolean {
        const validTypes: Record<string, string[]> = {
            pdf: ['application/pdf'],
            audio: ['audio/'],
            video: ['video/'],
            image: ['image/']
        };
        return validTypes[type]?.some(valid => contentType.startsWith(valid)) || false;
    }
} 