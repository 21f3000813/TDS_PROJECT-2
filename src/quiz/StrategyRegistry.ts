import type { Strategy, QuizPageSnapshot } from './types';
import { AttachmentCsvStrategy } from './strategies/AttachmentCsvStrategy';
import { AttachmentJsonStrategy } from './strategies/AttachmentJsonStrategy';
import { TableAggregationStrategy } from './strategies/TableAggregationStrategy';
import { HeuristicMathStrategy } from './strategies/HeuristicMathStrategy';
import { LinkedPageScrapeStrategy } from './strategies/LinkedPageScrapeStrategy';
import { LlmStrategy } from './strategies/LlmStrategy';
import { FallbackStrategy } from './strategies/FallbackStrategy';

export class StrategyRegistry {
  private readonly strategies: Strategy[] = [
    new AttachmentCsvStrategy(),
    new AttachmentJsonStrategy(),
    new TableAggregationStrategy(),
    new HeuristicMathStrategy(),
    new LinkedPageScrapeStrategy(),
    new LlmStrategy(),
    new FallbackStrategy()
  ];

  public pick(snapshot: QuizPageSnapshot): Strategy {
    const match = this.strategies.find((strategy) => strategy.canSolve(snapshot));
    if (!match) {
      return this.strategies[this.strategies.length - 1];
    }
    return match;
  }
}

export const strategyRegistry = new StrategyRegistry();
