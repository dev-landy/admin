import type { SourceResult } from '../types';

/** Bounded, per-server-instance cache. Errors are never stored. */
export class ResultCache {
  private entries = new Map<string, { expires: number; value: SourceResult<unknown> }>();
  private pending = new Map<string, Promise<SourceResult<unknown>>>();
  constructor(private ttlMs: number, private capacity: number) {}
  clear() { this.entries.clear(); }
  async get<T>(key: string, run: () => Promise<SourceResult<T>>): Promise<SourceResult<T>> {
    const cached = this.entries.get(key);
    if (cached && cached.expires > Date.now()) return cached.value as SourceResult<T>;
    this.entries.delete(key);
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<SourceResult<T>>;
    // Bound pending bookkeeping as well as completed results.
    if (this.pending.size >= this.capacity) return run();
    const task = Promise.resolve().then(run).then(value => {
      if (value.status === 'success') {
        if (this.entries.size >= this.capacity) this.entries.delete(this.entries.keys().next().value!);
        this.entries.set(key, { expires: Date.now() + this.ttlMs, value });
      }
      return value;
    }).finally(() => { this.pending.delete(key); });
    this.pending.set(key, task);
    return task;
  }
}
export const posthogResults = new ResultCache(5 * 60_000, 64);
