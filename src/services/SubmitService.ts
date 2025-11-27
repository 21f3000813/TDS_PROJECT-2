import { config } from '../config';
import { logger } from '../logger';
import type { QuizAnswer, SubmitResponse } from '../quiz/types';

export interface SubmitOptions {
  submitUrl: string;
  payload: {
    email: string;
    secret: string;
    url: string;
    answer: QuizAnswer['answer'];
    metadata?: Record<string, unknown>;
  };
}

class SubmitService {
  public async submit({ submitUrl, payload }: SubmitOptions): Promise<SubmitResponse> {
    const body = JSON.stringify(payload);
    if (Buffer.byteLength(body, 'utf8') > config.maxPayloadBytes) {
      throw new Error('Submission payload exceeds 1MB limit');
    }

    logger.info('Submitting answer to %s with value %o', submitUrl, payload.answer);
    const response = await fetch(submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    if (!response.ok) {
      throw new Error(`Submit endpoint returned ${response.status}`);
    }

    const data = (await response.json()) as SubmitResponse;
    logger.info('Submit response: %o', data);
    return data;
  }
}

export const submitService = new SubmitService();
