import { sleep } from "workflow";

export async function batchExec<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  { batchSize = 10, delayMs = 0 } = {},
) {
  let totalSucceeded = 0;
  const failedItems: T[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const outcomes = await Promise.allSettled(batch.map(fn));

    outcomes.forEach((outcome, j) => {
      if (outcome.status === "fulfilled") totalSucceeded++;
      else failedItems.push(batch[j]);
    });

    if (delayMs > 0 && i + batchSize < items.length) {
      await sleep(delayMs);
    }
  }

  return {
    total: items.length,
    succeeded: totalSucceeded,
    failed: failedItems.length,
    failedItems,
  };
}
