import type { Strategy, StrategyContext, QuizAnswer } from '../types';
import { containsWord } from '../utils/text';

const csvToMatrix = (csv: string): string[][] => {
  return csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => cell.trim()));
};

const toNumbers = (matrix: string[][]): number[] => {
  const values: number[] = [];
  for (const row of matrix) {
    for (const cell of row) {
      const numeric = Number(cell);
      if (!Number.isNaN(numeric)) {
        values.push(numeric);
      }
    }
  }
  return values;
};

export class AttachmentCsvStrategy implements Strategy {
  public canSolve(snapshot: StrategyContext['snapshot']): boolean {
    return snapshot.attachments.some((attachment) => attachment.endsWith('.csv'));
  }

  public async solve(ctx: StrategyContext): Promise<QuizAnswer> {
    const csvUrl = ctx.snapshot.attachments.find((attachment) => attachment.endsWith('.csv'))!;
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.status}`);
    }
    const csvText = await response.text();
    const matrix = csvToMatrix(csvText);
    const values = toNumbers(matrix);
    if (!values.length) {
      throw new Error('No numeric values were extracted from CSV');
    }
    const lower = ctx.snapshot.instructions.toLowerCase();
    let result: number;
    if (containsWord(lower, ['average', 'mean'])) {
      result = values.reduce((sum, v) => sum + v, 0) / values.length;
    } else if (containsWord(lower, ['max', 'maximum', 'largest'])) {
      result = Math.max(...values);
    } else if (containsWord(lower, ['min', 'minimum', 'smallest', 'least'])) {
      result = Math.min(...values);
    } else {
      result = values.reduce((sum, v) => sum + v, 0);
    }
    return {
      answer: Number.isInteger(result) ? Math.round(result) : Number(result.toFixed(6)),
      metadata: {
        strategy: 'attachment-csv',
        attachment: csvUrl,
        rows: matrix.length
      }
    };
  }
}
