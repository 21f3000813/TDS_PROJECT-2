import express from 'express';
import { config } from './config';
import { jsonErrorHandler } from './middleware/jsonErrorHandler';
import { quizRouter } from './routes/quizRoute';

export const createServer = () => {
  const app = express();
  app.use(express.json({ limit: config.maxPayloadBytes }));
  app.use(jsonErrorHandler);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/quiz', quizRouter);

  return app;
};
