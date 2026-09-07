import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { CompressionJobData, CompressionJobResult } from './types';

export const COMPRESSION_QUEUE_NAME = 'zipstream-file-compression';

export function getRedisConnection(): Redis {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = Number(process.env.REDIS_PORT) || 6379;
  const password = process.env.REDIS_PASSWORD || undefined;

  const client = new Redis({
    host,
    port,
    password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      // Exponential backoff capped at 15s to reduce network noise when Redis is not running
      return Math.min(times * 1000, 15000);
    },
  });

  let hasLogged = false;
  client.on('error', () => {
    if (!hasLogged) {
      console.info(`[Queue] Redis is not active at ${host}:${port}. Local embedded runner is enabled.`);
      hasLogged = true;
    }
  });

  return client;
}

let compressionQueueInstance: Queue<CompressionJobData, CompressionJobResult> | null = null;
let queueEventsInstance: QueueEvents | null = null;

export function getCompressionQueue(): Queue<CompressionJobData, CompressionJobResult> {
  if (!compressionQueueInstance) {
    const connection = getRedisConnection();
    compressionQueueInstance = new Queue<CompressionJobData, CompressionJobResult>(
      COMPRESSION_QUEUE_NAME,
      {
        connection,
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
          removeOnComplete: {
            age: 3600 * 2, // Retain job status for 2 hours
            count: 1000,
          },
          removeOnFail: {
            age: 3600 * 4, // Retain failed job status for 4 hours
            count: 500,
          },
        },
      }
    );
    compressionQueueInstance.on('error', () => undefined);
  }
  return compressionQueueInstance;
}

export function getQueueEvents(): QueueEvents {
  if (!queueEventsInstance) {
    const connection = getRedisConnection();
    queueEventsInstance = new QueueEvents(COMPRESSION_QUEUE_NAME, { connection });
    queueEventsInstance.on('error', () => undefined);
  }
  return queueEventsInstance;
}
