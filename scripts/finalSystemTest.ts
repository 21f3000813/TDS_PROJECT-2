import { config } from '../src/config';
import { QuizOrchestrator } from '../src/quiz/QuizOrchestrator';
import type { QuizRequestPayload, AnswerValue } from '../src/quiz/types';
import { submitService, type SubmitOptions } from '../src/services/SubmitService';

interface StageResult {
  hop: number;
  submitUrl: string;
  answerPreview: string;
  correct: boolean;
  reason: string;
  durationMs: number;
}

const DEFAULT_TEST_URL = 'https://tds-llm-analysis.s-anand.net/demo';

const formatAnswer = (answer: AnswerValue): string => {
  if (typeof answer === 'string') return answer.slice(0, 120);
  if (typeof answer === 'number' || typeof answer === 'boolean') return String(answer);
  return JSON.stringify(answer).slice(0, 120);
};

const decorateSubmit = (results: StageResult[]) => {
  const original = submitService.submit.bind(submitService);
  submitService.submit = (async function patched(options: SubmitOptions) {
    const hop = results.length + 1;
    const started = Date.now();
    try {
      const response = await original(options);
      results.push({
        hop,
        submitUrl: options.submitUrl,
        answerPreview: formatAnswer(options.payload.answer),
        correct: response.correct,
        reason: response.reason ?? '—',
        durationMs: Date.now() - started
      });
      return response;
    } catch (error) {
      results.push({
        hop,
        submitUrl: options.submitUrl,
        answerPreview: formatAnswer(options.payload.answer),
        correct: false,
        reason: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started
      });
      throw error;
    }
  }) as typeof submitService.submit;

  return () => {
    submitService.submit = original;
  };
};

const buildPayload = (): QuizRequestPayload => ({
  email: config.studentEmail,
  secret: config.quizSecret,
  url: process.env.FINAL_TEST_URL ?? DEFAULT_TEST_URL,
  receivedAt: new Date().toISOString()
});

const run = async () => {
  if (!config.openAiApiKey) {
    throw new Error('OPENAI_API_KEY is required for the final system test.');
  }

  const payload = buildPayload();
  const orchestrator = new QuizOrchestrator();
  const deadline = Date.now() + 3 * 60 * 1000;
  const stageResults: StageResult[] = [];
  const restoreSubmit = decorateSubmit(stageResults);
  const started = Date.now();

  try {
    await orchestrator.execute({ payload, deadline });
    const totalMs = Date.now() - started;
    console.log('\nFinal System Test Summary');
    console.table(stageResults);
    console.log(`Total duration: ${(totalMs / 1000).toFixed(1)}s`);
    console.log('Status: SUCCESS');
  } finally {
    restoreSubmit();
  }
};

run().catch((error) => {
  console.error('\nFinal system test failed:', error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
