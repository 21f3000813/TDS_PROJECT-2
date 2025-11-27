import type { Page } from 'playwright';
import { load } from 'cheerio';
import type { Element as DomElement } from 'domhandler';
import type { QuizPageSnapshot } from './types';

export const extractSnapshot = async (page: Page, url: string): Promise<QuizPageSnapshot> => {
  await page.waitForLoadState('networkidle');
  const html = await page.content();
  const bodyText = await page.evaluate(function readBodyText() {
    return document.body.innerText ?? '';
  });
  const $ = load(html);

  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

  const firstNonEmpty = bodyText
    .split('\n')
    .find((line: string) => line.trim().length > 0) ?? '';

  const question = normalize(
    $('[data-quiz-question]').text()
      || $('h1, h2').first().text()
      || firstNonEmpty
  ) || 'Question not detected';

  const instructions = normalize(
    $('[data-quiz-instructions]').text()
      || $('main').text()
      || bodyText.slice(0, 2000)
  );

  const submitUrlCandidate = await page.evaluate(function resolveSubmitUrl() {
    function pickAttr(selector: string, attr: string): string | null {
      return document.querySelector(selector)?.getAttribute(attr) ?? null;
    }

    const globalWindow = window as typeof window & {
      submitUrl?: string;
      quizConfig?: { submitUrl?: string };
    };

    const anchorHref = (() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      for (const anchor of anchors) {
        const href = anchor.getAttribute('href');
        if (href && /submit/i.test(href)) {
          return href;
        }
      }
      return null;
    })();

    const textMatch = (() => {
      const text = document.body?.innerText ?? '';
      const match = text.match(/https?:\/\/[^\s"']+submit[^\s"']*/i);
      if (match) return match[0];
      const relativeMatch = text.match(/\/[\w\-./?=&]*submit[\w\-./?=&]*/i);
      return relativeMatch ? relativeMatch[0] : null;
    })();

    return (
      pickAttr('[data-submit-url]', 'data-submit-url')
      ?? pickAttr('[data-submit-endpoint]', 'data-submit-endpoint')
      ?? pickAttr('form[action]', 'action')
      ?? globalWindow.submitUrl
      ?? globalWindow.quizConfig?.submitUrl
      ?? anchorHref
      ?? textMatch
      ?? null
    );
  });

  const submitUrl = (() => {
    if (submitUrlCandidate) {
      return new URL(submitUrlCandidate, url).toString();
    }

    const textMatches = bodyText.match(/https?:\/\/[^\s"']+/gi) ?? [];
    const submitMatch = textMatches.find((candidate) => /submit/i.test(candidate));
    if (submitMatch) {
      return submitMatch;
    }
    const relativeMatch = bodyText.match(/\/[\w\-./?=&]*submit[\w\-./?=&]*/i);
    if (relativeMatch) {
      return new URL(relativeMatch[0], url).toString();
    }

    const firstMatch = textMatches[0];
    if (firstMatch) {
      return firstMatch;
    }

    throw new Error('Cannot locate submit URL on quiz page');
  })();

  const attachments = new Set<string>();
  const links = new Set<string>();
  $('a[href]').each((index: number, el: DomElement) => {
    const href = $(el).attr('href');
    if (!href) return;
    const absolute = new URL(href, url).toString();
    links.add(absolute);
    if (/\.(csv|json|xlsx?|pdf|txt)$/i.test(href)) {
      attachments.add(absolute);
    }
  });

  const tables: string[][][] = [];
  $('table').each((tableIndex: number, table: DomElement) => {
    const matrix: string[][] = [];
    $(table)
      .find('tr')
      .each((rowIndex: number, row: DomElement) => {
        const cells: string[] = [];
        $(row)
          .find('th,td')
          .each((cellIndex: number, cell: DomElement) => {
            cells.push(normalize($(cell).text()));
          });
        if (cells.length) matrix.push(cells);
      });
    if (matrix.length) tables.push(matrix);
  });

  const textBlocks: string[] = [];
  $('p,li,pre,code').each((textIndex: number, el: DomElement) => {
    const text = normalize($(el).text());
    if (text) textBlocks.push(text);
  });

  return {
    url,
    question,
    instructions,
    rawText: normalize(bodyText).slice(0, 5000),
    submitUrl,
    attachments: [...attachments],
    links: [...links],
    tables,
    textBlocks
  };
};
