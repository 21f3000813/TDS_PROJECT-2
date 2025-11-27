import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { jobQueue } from '../quiz/JobQueue';
import { logger } from '../logger';
import type { QuizRequestPayload } from '../quiz/types';

const requestSchema = z.object({
  email: z.string().email(),
  secret: z.string(),
  url: z.string().url()
}).passthrough();

export const quizRouter = Router();

quizRouter.post('/', (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: parsed.error.flatten()
    });
  }

  if (parsed.data.secret !== config.quizSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const payload: QuizRequestPayload = {
    email: parsed.data.email,
    secret: parsed.data.secret,
    url: parsed.data.url,
    receivedAt: new Date().toISOString()
  };

  logger.info('Accepted quiz request for %s', payload.url);
  res.status(200).json({ status: 'accepted', receivedAt: payload.receivedAt });
  jobQueue.enqueue(payload);
});
