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

    return (
      pickAttr('[data-submit-url]', 'data-submit-url')
      ?? pickAttr('[data-submit-endpoint]', 'data-submit-endpoint')
      ?? pickAttr('form[action]', 'action')
      ?? globalWindow.submitUrl
      ?? globalWindow.quizConfig?.submitUrl
      ?? null
    );
  });

  if (!submitUrlCandidate) {
    throw new Error('Cannot locate submit URL on quiz page');
  }

  const submitUrl = new URL(submitUrlCandidate, url).toString();

  const attachments = new Set<string>();
  $('a[href]').each((index: number, el: DomElement) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (/\.(csv|json|xlsx?|pdf|txt)$/i.test(href)) {
      const absolute = new URL(href, url).toString();
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
    tables,
    textBlocks
  };
};
