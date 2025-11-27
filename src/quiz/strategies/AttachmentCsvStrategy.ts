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

const extractCutoff = (text: string): number | null => {
  const match = text.match(/cutoff[^\d]*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isNaN(value) ? null : value;
};

const applyCutoff = (values: number[], instructions: string, context: string): { values: number[]; cutoff?: number; mode?: 'gt' | 'lt' } => {
  const cutoff = extractCutoff(`${instructions}\n${context}`);
  if (cutoff == null) {
    return { values };
  }

  const normalized = instructions.toLowerCase();
  const prefersBelow = /(less|below|under|smaller)/.test(normalized);
  const filtered = values.filter((value) => (prefersBelow ? value < cutoff : value > cutoff));
  if (!filtered.length) {
    return { values };
  }
  return { values: filtered, cutoff, mode: prefersBelow ? 'lt' : 'gt' };
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
    const baseValues = toNumbers(matrix);
    if (!baseValues.length) {
      throw new Error('No numeric values were extracted from CSV');
    }
    const { values, cutoff, mode } = applyCutoff(baseValues, ctx.snapshot.instructions, ctx.snapshot.rawText);
    if (!values.length) {
      throw new Error('Cutoff filtering removed all numeric values');
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
        rows: matrix.length,
        cutoff,
        cutoffMode: mode
      }
    };
  }
}
