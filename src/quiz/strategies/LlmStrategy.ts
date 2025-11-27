import { config } from '../../config';
import { llmService } from '../../services/LlmService';
import type { Strategy, StrategyContext, QuizAnswer } from '../types';

const KEYWORDS = ['llm', 'language model', 'gpt', 'chatgpt', 'openai', 'ai model'];

const needsLlm = (instructions: string): boolean => {
  const normalized = instructions.toLowerCase();
  return KEYWORDS.some((keyword) => normalized.includes(keyword));
};

export class LlmStrategy implements Strategy {
  public canSolve(snapshot: StrategyContext['snapshot']): boolean {
    return needsLlm(snapshot.instructions);
  }

  public async solve(ctx: StrategyContext): Promise<QuizAnswer> {
    const now = Date.now();
    if (now > ctx.deadline) {
      throw new Error('Deadline exceeded before LLM strategy could start');
    }
    const timeLeftSec = Math.round((ctx.deadline - now) / 1000);
    const system = `${config.systemPrompt} You must finish within ${timeLeftSec} seconds.`.slice(0, 900);
    const user = `Question: ${ctx.snapshot.question}\nInstructions: ${ctx.snapshot.instructions}\nContext: ${ctx.snapshot.rawText.slice(0, 3500)}`;
    const answerText = await llmService.analyze({ system, user });
    return {
      answer: answerText,
      metadata: {
        strategy: 'llm',
        tokens: answerText.length
      }
    };
  }
}
