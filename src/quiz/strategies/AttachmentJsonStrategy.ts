import type { Strategy, StrategyContext, QuizAnswer } from '../types';
import { containsWord } from '../utils/text';

const collectNumbers = (data: unknown): number[] => {
  if (typeof data === 'number' && Number.isFinite(data)) {
    return [data];
  }
  if (Array.isArray(data)) {
    return data.flatMap((value) => collectNumbers(value));
  }
  if (data && typeof data === 'object') {
    return Object.values(data).flatMap((value) => collectNumbers(value));
  }
  return [];
};

export class AttachmentJsonStrategy implements Strategy {
  public canSolve(snapshot: StrategyContext['snapshot']): boolean {
    return snapshot.attachments.some((attachment) => attachment.toLowerCase().endsWith('.json'));
  }

  public async solve(ctx: StrategyContext): Promise<QuizAnswer> {
    const jsonUrl = ctx.snapshot.attachments.find((attachment) => attachment.toLowerCase().endsWith('.json'))!;
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`Failed to download JSON attachment: ${response.status}`);
    }
    const payload = await response.json();
    const values = collectNumbers(payload);
    if (!values.length) {
      throw new Error('JSON attachment did not contain numeric fields');
    }
    const lower = ctx.snapshot.instructions.toLowerCase();
    let result: number;
    if (containsWord(lower, ['average', 'mean'])) {
      result = values.reduce((sum, value) => sum + value, 0) / values.length;
    } else if (containsWord(lower, ['max', 'maximum', 'largest'])) {
      result = Math.max(...values);
    } else if (containsWord(lower, ['min', 'minimum', 'smallest', 'least'])) {
      result = Math.min(...values);
    } else {
      result = values.reduce((sum, value) => sum + value, 0);
    }
    return {
      answer: Number.isInteger(result) ? Math.round(result) : Number(result.toFixed(6)),
      metadata: {
        strategy: 'attachment-json',
        attachment: jsonUrl,
        samples: values.length
      }
    };
  }
}
