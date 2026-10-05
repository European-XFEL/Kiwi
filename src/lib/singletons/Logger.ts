export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly id: number;
  readonly timestamp: number;
  readonly level: LogLevel;
  readonly message: string;
}

export class Logger {
  private entries: readonly LogEntry[] = [];
  private listeners = new Set<() => void>();
  private nextId = 0;

  public getSnapshot = (): readonly LogEntry[] => this.entries;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public clear = (): void => {
    if (this.entries.length === 0) return;
    this.entries = [];
    this.notify();
  };

  public debug(message: string): void {
    this.log('debug', message);
  }

  public info(message: string): void {
    this.log('info', message);
  }

  public warn(message: string): void {
    this.log('warn', message);
  }

  public error(message: string): void {
    this.log('error', message);
  }

  private log(level: LogLevel, message: string): void {
    console[level](message);
    if (this.listeners.size === 0) return;
    this.entries = [
      ...this.entries.slice(-99),
      { id: this.nextId++, timestamp: Date.now(), level, message },
    ];
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
