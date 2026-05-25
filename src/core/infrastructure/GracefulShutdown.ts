import { logger } from '../telemetry/Logger';
import { Server } from 'http';

type CleanupTask = () => Promise<void> | void;

export class GracefulShutdownManager {
  private tasks: CleanupTask[] = [];
  private isShuttingDown = false;
  private httpServer: Server | null = null;
  private readonly timeoutMs: number;

  constructor(timeoutMs = 15000) {
    this.timeoutMs = timeoutMs;
    this.setupListeners();
  }

  public registerHttpServer(server: Server) {
    this.httpServer = server;
  }

  public registerCleanupTask(task: CleanupTask) {
    this.tasks.push(task);
  }

  private setupListeners() {
    process.on('SIGTERM', () => this.initiateShutdown('SIGTERM'));
    process.on('SIGINT', () => this.initiateShutdown('SIGINT'));
    
    process.on('uncaughtException', (err) => {
      logger.fatal('System', 'Uncaught Exception', err);
      this.initiateShutdown('uncaughtException', 1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal('System', 'Unhandled Rejection at Promise', { reason, promise });
      this.initiateShutdown('unhandledRejection', 1);
    });
  }

  private async initiateShutdown(signal: string, exitCode = 0) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    logger.info('System', `Shutdown initiated via signal: ${signal}`);

    // Fallback timeout enforcement
    setTimeout(() => {
      logger.error('System', `Forced shutdown due to timeout (${this.timeoutMs}ms)`);
      process.exit(1);
    }, this.timeoutMs).unref();

    try {
      if (this.httpServer) {
        logger.info('System', 'Closing HTTP traffic...');
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      logger.info('System', `Executing ${this.tasks.length} standard cleanup tasks...`);
      for (const task of this.tasks) {
        await Promise.resolve(task());
      }
      
      logger.info('System', 'Graceful teardown complete. Halting process.');
      process.exit(exitCode);
    } catch (error) {
      logger.fatal('System', 'Error during shutdown execution', error);
      process.exit(1);
    }
  }
}

export const shutdownManager = new GracefulShutdownManager();
