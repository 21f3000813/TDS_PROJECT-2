import { config } from '../config';
import { logger } from '../logger';
import type { QuizRequestPayload } from './types';
import { QuizJob } from './QuizJob';

type PQueueCtor = typeof import('p-queue');
type PQueueInstance = InstanceType<PQueueCtor['default']>;

const loadQueue = async (): Promise<PQueueInstance> => {
  const mod = await import('p-queue');
  const QueueCtor = mod.default ?? (mod as unknown as { default: PQueueCtor['default'] }).default;
  return new QueueCtor({ concurrency: config.maxConcurrentJobs });
};

class JobQueue {
  private queuePromise?: Promise<PQueueInstance>;

  private async getQueue(): Promise<PQueueInstance> {
    if (!this.queuePromise) {
      this.queuePromise = loadQueue();
    }
    return this.queuePromise;
  }

  public enqueue(payload: QuizRequestPayload): void {
    this.getQueue()
      .then((queue) => queue.add(async () => {
        const job = new QuizJob(payload);
        try {
          await job.run();
        } catch (error) {
          logger.error('Quiz job failed: %s', (error as Error).message, { stack: (error as Error).stack });
        }
      }))
      .catch((error) => logger.error('Failed scheduling quiz job: %s', error));
  }
}

export const jobQueue = new JobQueue();
