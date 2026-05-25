import { logger } from '../telemetry/Logger';
import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';

export interface InferencePayload {
  prompt: string;
  contextWindow: string[];
  maxTokens?: number;
}

export class LLMStreamingDaemon extends EventEmitter {
  private activeStreams: Set<string> = new Set();
  
  constructor() {
    super();
  }

  // Abstraction for LLM completion streaming that runs asynchronously without blocking main thread
  public async executeStream(
    inferenceId: string, 
    payload: InferencePayload, 
    outputStream: Writable
  ): Promise<void> {
    
    if (this.activeStreams.has(inferenceId)) {
      throw new Error(`Inference ID ${inferenceId} is already processing.`);
    }

    const timer = logger.startTimer();
    this.activeStreams.add(inferenceId);
    
    try {
      logger.info('AI', `Starting background Inference stream [${inferenceId}]`);
      
      // Abstract Logic: Replace this mapped readable flow with actual Gemini or Provider APIs
      const virtualProviderStream = this.createMockProviderStream(payload);

      virtualProviderStream.on('data', (chunk) => {
        // Here we can inject token sanitization or moderation layers
        const sanitizedData = chunk.toString().replace(/<|>/g, '');
        
        if (!outputStream.destroyed) {
          outputStream.write(sanitizedData);
        } else {
          virtualProviderStream.destroy(new Error('Client aborted connection'));
        }
      });

      await new Promise<void>((resolve, reject) => {
        virtualProviderStream.on('end', resolve);
        virtualProviderStream.on('error', reject);
        outputStream.on('error', reject);
      });

      if (!outputStream.destroyed) {
        outputStream.end();
      }

      logger.info('AI', `Inference stream [${inferenceId}] completed normally.`, {}, timer());

    } catch (error: any) {
      if (error.message === 'Client aborted connection') {
        logger.warn('AI', `Stream [${inferenceId}] aborted by remote client.`);
      } else {
        logger.error('AI', `Stream failure [${inferenceId}]`, error);
        if (!outputStream.destroyed) {
          outputStream.end(`\\n[INFRASTRUCTURE ERROR: Inference aborted]`);
        }
      }
    } finally {
      this.activeStreams.delete(inferenceId);
    }
  }

  public abortStream(inferenceId: string): boolean {
    if (!this.activeStreams.has(inferenceId)) return false;
    
    // Abstract hook for sending abort signals to the actual active provider request context
    logger.info('AI', `External cancellation signal sent to stream [${inferenceId}]`);
    return true;
  }

  // Abstract stand-in that generates synthetic tokens via a pseudo-timer
  private createMockProviderStream(payload: InferencePayload): Readable {
    const readable = new Readable({ read() {} });
    const responseTokens = `[ECHO]: Standardized response to "${payload.prompt}"`.split(' ');
    
    let index = 0;
    const interval = setInterval(() => {
      if (index >= responseTokens.length) {
        clearInterval(interval);
        readable.push(null); // End
      } else {
        readable.push(responseTokens[index] + ' ');
        index++;
      }
    }, 100);

    readable.on('destroy', () => clearInterval(interval));
    
    return readable;
  }
}

export const activeLLMDaemon = new LLMStreamingDaemon();
