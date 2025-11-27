import type { Strategy, StrategyContext, QuizAnswer } from '../types';
import { containsWord } from '../utils/text';

const parseNumericTable = (tables: string[][][]): number[] => {
  const extracted: number[] = [];
  for (const table of tables) {
    for (const row of table) {
      for (const cell of row) {
        const value = Number(cell.replace(/[^0-9+-.]/g, ''));
        if (!Number.isNaN(value)) {
          extracted.push(value);
        }
      }
    }
  }
  return extracted;
};

export class TableAggregationStrategy implements Strategy {
  public canSolve(snapshot: StrategyContext['snapshot']): boolean {
    return snapshot.tables.length > 0 && /table|row|column/i.test(snapshot.instructions);
  }

  public async solve(ctx: StrategyContext): Promise<QuizAnswer> {
    const values = parseNumericTable(ctx.snapshot.tables);
    if (!values.length) {
      throw new Error('TableAggregationStrategy did not find numeric cells');
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
      metadata: { strategy: 'table-aggregation', sampleCount: values.length }
    };
  }
}
