/**
 * Adaptive Polling & Network Guard Utility
 * Manages background interval jobs with automatic network failure detection,
 * exponential backoff, and pause capabilities to prevent console log flooding
 * and browser performance throttling.
 */

export interface PollingControllerOptions {
  name: string;
  baseIntervalMs?: number;
  maxIntervalMs?: number;
  maxConsecutiveFailures?: number;
  onStatusChange?: (isOnline: boolean, consecutiveFailures: number) => void;
}

export class PollingController {
  private name: string;
  private baseIntervalMs: number;
  private maxIntervalMs: number;
  private maxConsecutiveFailures: number;
  private currentIntervalMs: number;
  private consecutiveFailures = 0;
  private isRunning = false;
  private timerId: any = null;
  private pollFn: () => Promise<boolean>;
  private onStatusChange?: (isOnline: boolean, consecutiveFailures: number) => void;

  constructor(pollFn: () => Promise<boolean>, options: PollingControllerOptions) {
    this.pollFn = pollFn;
    this.name = options.name;
    this.baseIntervalMs = options.baseIntervalMs || 3000;
    this.maxIntervalMs = options.maxIntervalMs || 30000;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || 5;
    this.currentIntervalMs = this.baseIntervalMs;
    this.onStatusChange = options.onStatusChange;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNext(100); // Initial fast boot
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public async triggerNow(): Promise<void> {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    await this.executePoll();
  }

  private scheduleNext(delayMs?: number): void {
    if (!this.isRunning) return;
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    const nextDelay = delayMs ?? this.currentIntervalMs;
    this.timerId = setTimeout(() => this.executePoll(), nextDelay);
  }

  private async executePoll(): Promise<void> {
    if (!this.isRunning) return;

    // Check navigator.onLine if browser supports it
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.handleFailure('Offline network state detected');
      this.scheduleNext(Math.min(this.currentIntervalMs * 2, this.maxIntervalMs));
      return;
    }

    try {
      const success = await this.pollFn();
      if (success) {
        if (this.consecutiveFailures > 0) {
          this.consecutiveFailures = 0;
          this.currentIntervalMs = this.baseIntervalMs;
          if (this.onStatusChange) this.onStatusChange(true, 0);
        }
        this.scheduleNext(this.baseIntervalMs);
      } else {
        this.handleFailure('Poll returned unsuccessful status');
        this.scheduleNext();
      }
    } catch (err) {
      this.handleFailure(String(err));
      this.scheduleNext();
    }
  }

  private handleFailure(reason: string): void {
    this.consecutiveFailures++;
    this.currentIntervalMs = Math.min(this.baseIntervalMs * Math.pow(1.5, this.consecutiveFailures), this.maxIntervalMs);
    
    if (this.consecutiveFailures === 1 || this.consecutiveFailures % 5 === 0) {
      console.warn(`[PollingController:${this.name}] Warning (Failures: ${this.consecutiveFailures}, Next interval: ${Math.round(this.currentIntervalMs)}ms): ${reason}`);
    }

    if (this.onStatusChange) {
      this.onStatusChange(this.consecutiveFailures < this.maxConsecutiveFailures, this.consecutiveFailures);
    }
  }

  public getStatus() {
    return {
      name: this.name,
      isRunning: this.isRunning,
      consecutiveFailures: this.consecutiveFailures,
      currentIntervalMs: this.currentIntervalMs,
    };
  }
}
