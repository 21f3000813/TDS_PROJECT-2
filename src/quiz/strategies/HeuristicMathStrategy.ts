import type { Strategy, StrategyContext, QuizAnswer } from '../types';
import { containsWord } from '../utils/text';

const numberRegex = /-?\d+(?:\.\d+)?/g;

const extractNumbers = (text: string): number[] => {
  const matches = text.match(numberRegex) ?? [];
  return matches.map((value) => Number(value)).filter(Number.isFinite);
};

export class HeuristicMathStrategy implements Strategy {
  public canSolve(snapshot: StrategyContext['snapshot']): boolean {
    const hasNumbers = extractNumbers(snapshot.instructions + ' ' + snapshot.rawText).length >= 2;
    const mathKeywords = ['sum', 'total', 'add', 'average', 'mean', 'product', 'multiply', 'difference', 'subtract', 'maximum', 'minimum'];
    return hasNumbers && containsWord(snapshot.instructions, mathKeywords);
  }

  public async solve(ctx: StrategyContext): Promise<QuizAnswer> {
    const mergedText = `${ctx.snapshot.question}\n${ctx.snapshot.instructions}\n${ctx.snapshot.rawText}`;
    const numbers = extractNumbers(mergedText);
    if (numbers.length === 0) {
      throw new Error('HeuristicMathStrategy could not find numeric data');
    }

    const lowerInstructions = ctx.snapshot.instructions.toLowerCase();
    let value: number;

    if (containsWord(lowerInstructions, ['average', 'mean'])) {
      value = numbers.reduce((sum, current) => sum + current, 0) / numbers.length;
    } else if (containsWord(lowerInstructions, ['product', 'multiply'])) {
      value = numbers.reduce((product, current) => product * current, 1);
    } else if (containsWord(lowerInstructions, ['difference', 'subtract'])) {
      value = numbers.slice(1).reduce((diff, current) => diff - current, numbers[0]);
    } else if (containsWord(lowerInstructions, ['maximum', 'max', 'largest'])) {
      value = Math.max(...numbers);
    } else if (containsWord(lowerInstructions, ['minimum', 'min', 'smallest', 'least'])) {
      value = Math.min(...numbers);
    } else {
      value = numbers.reduce((sum, current) => sum + current, 0);
    }

    return {
      answer: Number.isInteger(value) ? Math.round(value) : Number(value.toFixed(6)),
      metadata: {
        strategy: 'heuristic-math',
        samples: numbers
      }
    };
  }
}
