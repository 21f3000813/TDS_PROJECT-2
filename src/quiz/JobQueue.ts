import PQueue from 'p-queue';
import { config } from '../config';
import { logger } from '../logger';
import type { QuizRequestPayload } from './types';
import { QuizJob } from './QuizJob';

class JobQueue {
  private readonly queue = new PQueue({ concurrency: config.maxConcurrentJobs });

  public enqueue(payload: QuizRequestPayload): void {
    this.queue.add(async () => {
      const job = new QuizJob(payload);
      try {
        await job.run();
      } catch (error) {
        logger.error('Quiz job failed: %s', (error as Error).message, { stack: (error as Error).stack });
      }
    }).catch((error) => logger.error('Failed scheduling quiz job: %s', error));
  }
}

export const jobQueue = new JobQueue();
