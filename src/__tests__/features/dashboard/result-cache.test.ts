/** @jest-environment node */
import { ResultCache } from '@/features/dashboard/server/result-cache';
test('concurrent calls share one computation and preserve the original timestamp', async () => {
 const cache = new ResultCache(1000, 2);
 const value = { status: 'success' as const, data: 1, fetchedAt: 'original' };
 const run = jest.fn(async () => value);
 const results = await Promise.all([cache.get('a', run), cache.get('a', run)]);
 expect(run).toHaveBeenCalledTimes(1);
 expect(await cache.get('a', run)).toBe(value);
 expect(results).toEqual([value,value]);
});
test('errors are retried, expired results recompute, and keys are isolated', async () => {
 jest.useFakeTimers();
 try {
  const cache = new ResultCache(1000, 2);
  const run = jest.fn().mockResolvedValueOnce({status:'error',code:'timeout',message:'retry'}).mockResolvedValue({status:'success',data:1,fetchedAt:'now'});
  await cache.get('a',run); await cache.get('a',run);
  expect(run).toHaveBeenCalledTimes(2);
  await cache.get('b',run); expect(run).toHaveBeenCalledTimes(3);
  jest.advanceTimersByTime(1001);
  await cache.get('a',run); expect(run).toHaveBeenCalledTimes(4);
 } finally { jest.useRealTimers(); }
});
test('old entries are evicted when capacity is reached', async () => {
 const cache = new ResultCache(1000, 1);
 const run = jest.fn(async () => ({status:'success' as const,data:1,fetchedAt:'now'}));
 await cache.get('a',run); await cache.get('b',run); await cache.get('a',run);
 expect(run).toHaveBeenCalledTimes(3);
});
