import { mkdirSync } from "fs";
import { freemem } from "os";

export function makeDirf(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

export async function batchProcess(
  promises: (() => Promise<any>)[],
  memoryPerProcess: number
): Promise<any[]> {
  const freememInMB: number = Math.floor(freemem() / 1024 / 1024);
  const batchSize: number = Math.floor(freememInMB / memoryPerProcess);

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
