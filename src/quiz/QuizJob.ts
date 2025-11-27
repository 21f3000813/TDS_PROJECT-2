import { logger } from '../logger';
import type { QuizRequestPayload } from './types';
import { QuizOrchestrator } from './QuizOrchestrator';

const THREE_MINUTES = 3 * 60 * 1000;

const computeDeadline = (receivedAtIso: string): number => {
  const parsed = Date.parse(receivedAtIso);
  const base = Number.isNaN(parsed) ? Date.now() : parsed;
  return base + THREE_MINUTES;
};

export class QuizJob {
  constructor(
    private readonly payload: QuizRequestPayload,
    private readonly orchestrator: QuizOrchestrator = new QuizOrchestrator()
  ) {}

  public async run(): Promise<void> {
    const deadline = computeDeadline(this.payload.receivedAt);
    if (Date.now() > deadline) {
      throw new Error('3-minute deadline already exceeded before job start');
    }

    logger.info('Starting quiz job for %s', this.payload.url);
    await this.orchestrator.execute({
      payload: this.payload,
      deadline
    });
  }
}

export { computeDeadline };
