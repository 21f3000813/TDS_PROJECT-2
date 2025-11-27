import './polyfills';
import { createServer } from './server';
import { config } from './config';
import { logger } from './logger';

const app = createServer();
app.listen(config.port, () => {
  logger.info('Server listening on port %d', config.port);
});
