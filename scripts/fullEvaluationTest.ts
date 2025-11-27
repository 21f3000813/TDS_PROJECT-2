import { config } from '../src/config';
import { logger } from '../src/logger';
import { QuizOrchestrator } from '../src/quiz/QuizOrchestrator';
import type { QuizRequestPayload } from '../src/quiz/types';

const DEFAULT_TEST_URL = 'https://tds-llm-analysis.s-anand.net/demo';

const buildPayload = (): QuizRequestPayload => ({
  email: config.studentEmail,
  secret: config.quizSecret,
  url: process.env.TEST_QUIZ_URL ?? DEFAULT_TEST_URL,
  receivedAt: new Date().toISOString()
});

const run = async () => {
  const payload = buildPayload();
  const orchestrator = new QuizOrchestrator();
  const deadline = Date.now() + 3 * 60 * 1000;

  logger.info('Running E2E quiz test for %s', payload.url);
  await orchestrator.execute({ payload, deadline });
  logger.info('E2E test finished successfully');
};

run().catch((error) => {
  logger.error('E2E test failed: %s', error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
