import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { config } from '../config';
import { logger } from '../logger';

class BrowserService {
  private browserPromise?: Promise<Browser>;

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = chromium.launch({ headless: config.headless });
    }
    return this.browserPromise;
  }

  public async newPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const context: BrowserContext = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(`
      if (!window.__name) {
        window.__name = function __name(fn, name) {
          try {
            Object.defineProperty(fn, 'name', { value: name, configurable: true });
          } catch (error) {
            // ignore descriptor failures
          }
          return fn;
        };
        var __name = window.__name;
      }
    `);
    page.on('close', () => context.close().catch((error) => logger.warn('Failed closing context: %s', error)));
    return page;
  }
}

export const browserService = new BrowserService();
