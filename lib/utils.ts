export async function batchProcess(
  promises: (() => Promise<any>)[],
  batchSize: number
): Promise<any[]> {
  const promiseBatches: (() => Promise<any>)[][] = [];

  for (let i: number = 0; i < promises.length; i += batchSize) {
    promiseBatches.push(promises.slice(i, batchSize));
  }

  const results: any[] = [];

  for (const batch of promiseBatches) {
    const activatedBatch: Promise<any>[] = batch.map((func) => func());

    const currentResults: any[] = await Promise.all(activatedBatch);

    results.push(...currentResults);
  }

  return results;
}
