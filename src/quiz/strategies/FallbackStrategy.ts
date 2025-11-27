import type { Strategy, StrategyContext, QuizAnswer } from '../types';

export class FallbackStrategy implements Strategy {
  public canSolve(): boolean {
    return true;
  }

  public async solve(ctx: StrategyContext): Promise<QuizAnswer> {
    const domHint = await ctx.page.evaluate(function locateDomHint() {
      const attr = document.querySelector('[data-expected-answer]')?.getAttribute('data-expected-answer');
      if (attr) return attr;
      const content = document.querySelector('[data-answer]')?.textContent;
      return content?.trim() ?? null;
    });

    if (domHint) {
      return {
        answer: domHint,
        metadata: { strategy: 'dom-fallback' }
      };
    }

    const regex = /answer\s*[:=]\s*([^\n]+)/i;
    const match = ctx.snapshot.rawText.match(regex);
    if (match) {
      return { answer: match[1].trim(), metadata: { strategy: 'regex-fallback' } };
    }

    throw new Error('FallbackStrategy could not derive an answer. Manual intervention required.');
  }
}
