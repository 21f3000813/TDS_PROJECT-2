import { browserService } from '../../services/BrowserService';
import type { Strategy, StrategyContext, QuizAnswer, QuizPageSnapshot } from '../types';

const LINK_KEYWORDS = /scrape|download|fetch|crawl|lookup|collect/i;
const URL_REGEX = /https?:\/\/[^\s"']+/gi;
const RELATIVE_REGEX = /\/[A-Za-z0-9][A-Za-z0-9\-._~/?=&%#]*/gi;

const pickSecretFromText = (text: string): string | null => {
  const secretMatch = text.match(/secret\s+(?:code|key|token)?\s*(?:is|:)?\s*([A-Za-z0-9._-]+)/i);
  if (secretMatch?.[1]) {
    return secretMatch[1].trim();
  }
  const numberMatch = text.match(/\b\d{3,}\b/);
  if (numberMatch?.[0]) {
    return numberMatch[0];
  }
  const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return firstLine ?? null;
};

const collectCandidateLinks = (snapshot: QuizPageSnapshot): string[] => {
  const candidates = new Set<string>();
  for (const link of snapshot.links ?? []) {
    candidates.add(link);
  }

  const sources = [snapshot.instructions, snapshot.question, snapshot.rawText, ...snapshot.textBlocks];
  for (const source of sources) {
    if (!source) continue;
    const urlMatches = source.match(URL_REGEX) ?? [];
    for (const match of urlMatches) {
      candidates.add(match);
    }
    const relMatches = source.match(RELATIVE_REGEX) ?? [];
    for (const match of relMatches) {
      if (match.length > 1 && !match.startsWith('//')) {
        candidates.add(new URL(match, snapshot.url).toString());
      }
    }
  }

  const prioritized = [...candidates].filter((link) => LINK_KEYWORDS.test(link));
  return prioritized.length ? prioritized : [...candidates];
};

export class LinkedPageScrapeStrategy implements Strategy {
  public canSolve(snapshot: QuizPageSnapshot): boolean {
    const hasKeyword = LINK_KEYWORDS.test(snapshot.instructions) || LINK_KEYWORDS.test(snapshot.question) || LINK_KEYWORDS.test(snapshot.rawText);
    return hasKeyword && collectCandidateLinks(snapshot).length > 0;
  }

  public async solve(ctx: StrategyContext): Promise<QuizAnswer> {
    const candidates = collectCandidateLinks(ctx.snapshot);
    if (!candidates.length) {
      throw new Error('LinkedPageScrapeStrategy could not locate a link to follow');
    }

    const targetUrl = candidates[0];
    const page = await browserService.newPage();
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
      const text = await page.evaluate(function readSecretText() {
        return document.body?.innerText ?? '';
      });
      const secret = pickSecretFromText(text);
      if (!secret) {
        throw new Error('LinkedPageScrapeStrategy could not extract secret from linked page');
      }
      return {
        answer: secret,
        metadata: {
          strategy: 'linked-page-scrape',
          link: targetUrl
        }
      };
    } finally {
      await page.close();
    }
  }
}
