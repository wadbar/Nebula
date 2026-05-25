import { logger } from '../telemetry/Logger';
import { shutdownManager } from '../infrastructure/GracefulShutdown';

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;
}

export class ConnectionManager {
  private activeAdapters: Map<string, DatabaseAdapter> = new Map();
  private maxRetries = 5;
  private baseBackoffMs = 1000;

  constructor() {
    shutdownManager.registerCleanupTask(async () => {
      logger.info('Database', 'Closing all active database connections...');
      await this.disconnectAll();
    });
  }

  public registerAdapter(name: string, adapter: DatabaseAdapter) {
    this.activeAdapters.set(name, adapter);
  }

  public async connectWithBackoff(name: string): Promise<boolean> {
    const adapter = this.activeAdapters.get(name);
    if (!adapter) {
      logger.error('Database', `No adapter registered under name: ${name}`);
      return false;
    }

    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        attempts++;
        logger.info('Database', `Attempting connection to ${name} (Attempt ${attempts}/${this.maxRetries})...`);
        await adapter.connect();
        logger.info('Database', `Successfully established connection to ${name}`);
        return true;
      } catch (error) {
        logger.warn('Database', `Connection to ${name} failed.`, { error });
        if (attempts >= this.maxRetries) {
          logger.fatal('Database', `Max connection retries exceeded for ${name}.`);
          return false;
        }
        
        const delay = this.baseBackoffMs * Math.pow(2, attempts - 1);
        logger.info('Database', `Waiting ${delay}ms before next retry...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    return false;
  }

  private async disconnectAll(): Promise<void> {
    const disconnectionPromises = Array.from(this.activeAdapters.entries()).map(
      async ([name, adapter]) => {
        try {
          await adapter.disconnect();
          logger.info('Database', `Disconnected adapter: ${name}`);
        } catch (error) {
          logger.error('Database', `Failed to cleanly disconnect adapter: ${name}`, error);
        }
      }
    );
    await Promise.allSettled(disconnectionPromises);
  }
}

export const dbConnectionManager = new ConnectionManager();
