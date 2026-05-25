export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  meta?: Record<string, any>;
  durationMs?: number;
}

export class TelemetryPipeline {
  private currentLevel: LogLevel = LogLevel.INFO;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      this.currentLevel = LogLevel[envLevel as keyof typeof LogLevel];
    }
  }

  private format(level: string, context: string, message: string, meta?: Record<string, any>, durationMs?: number): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...(meta && { meta }),
      ...(durationMs !== undefined && { durationMs })
    };
    return JSON.stringify(entry);
  }

  private write(levelValue: LogLevel, levelTag: string, context: string, message: string, meta?: Record<string, any>, durationMs?: number) {
    if (levelValue < this.currentLevel) return;
    
    const output = this.format(levelTag, context, message, meta, durationMs);
    
    if (levelValue >= LogLevel.ERROR) {
      console.error(output);
    } else if (levelValue === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  public debug(context: string, message: string, meta?: Record<string, any>) {
    this.write(LogLevel.DEBUG, 'DEBUG', context, message, meta);
  }

  public info(context: string, message: string, meta?: Record<string, any>, durationMs?: number) {
    this.write(LogLevel.INFO, 'INFO', context, message, meta, durationMs);
  }

  public warn(context: string, message: string, meta?: Record<string, any>) {
    this.write(LogLevel.WARN, 'WARN', context, message, meta);
  }

  public error(context: string, message: string, error?: Error | unknown, meta?: Record<string, any>) {
    const errorMeta = error instanceof Error 
      ? { ...meta, errorName: error.name, stack: error.stack }
      : { ...meta, rawError: error };
    
    this.write(LogLevel.ERROR, 'ERROR', context, message, errorMeta);
  }
  
  public fatal(context: string, message: string, error?: Error | unknown, meta?: Record<string, any>) {
    this.write(LogLevel.FATAL, 'FATAL', context, message, error instanceof Error ? { stack: error.stack, ...meta } : { error, ...meta });
  }

  public startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }
}

export const logger = new TelemetryPipeline();
