import { browserService } from '../services/BrowserService';
import { submitService } from '../services/SubmitService';
import { logger } from '../logger';
import type { QuizRequestPayload } from './types';
import { extractSnapshot } from './QuizExtractor';
import { strategyRegistry } from './StrategyRegistry';

interface ExecuteOptions {
  payload: QuizRequestPayload;
  deadline: number;
}

export class QuizOrchestrator {
  public async execute({ payload, deadline }: ExecuteOptions): Promise<void> {
    let currentUrl: string | undefined = payload.url;

    while (currentUrl) {
      this.ensureDeadline(deadline, 'starting next quiz hop');

      const page = await browserService.newPage();
      try {
        logger.info('Visiting quiz page %s', currentUrl);
        this.ensureDeadline(deadline, 'navigating to quiz page');
        await page.goto(currentUrl, { waitUntil: 'networkidle' });
        this.ensureDeadline(deadline, 'extracting quiz snapshot');
        const snapshot = await extractSnapshot(page, currentUrl);
        const strategy = strategyRegistry.pick(snapshot);
        logger.info('Selected strategy %s', strategy.constructor.name);
        this.ensureDeadline(deadline, `solving with ${strategy.constructor.name}`);
        const answer = await strategy.solve({ snapshot, page, deadline });
        this.ensureDeadline(deadline, 'submitting quiz answer');
        const submitResponse = await submitService.submit({
          submitUrl: snapshot.submitUrl,
          payload: {
            email: payload.email,
            secret: payload.secret,
            url: snapshot.url,
            answer: answer.answer,
            metadata: answer.metadata
          }
        });

        if (!submitResponse.correct) {
          logger.warn('Submission marked incorrect: %s', submitResponse.reason ?? 'no reason');
        }

        this.ensureDeadline(deadline, 'processing submit response');

        if (submitResponse.url && Date.now() <= deadline) {
          currentUrl = submitResponse.url;
          continue;
        }

        break;
      } finally {
        await page.close();
      }
    }
  }

  private ensureDeadline(deadline: number, phase: string): void {
    if (Date.now() > deadline) {
      throw new Error(`3-minute deadline exceeded before ${phase}`);
    }
  }
}
