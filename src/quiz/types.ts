export interface QuizRequestPayload {
  email: string;
  secret: string;
  url: string;
  receivedAt: string;
}

export interface QuizPageSnapshot {
  url: string;
  question: string;
  instructions: string;
  rawText: string;
  submitUrl: string;
  attachments: string[];
  links: string[];
  tables: string[][][];
  textBlocks: string[];
}

export type AnswerValue = string | number | boolean | Record<string, unknown>;

export interface QuizAnswer {
  answer: AnswerValue;
  metadata?: Record<string, unknown>;
}

export interface SubmitResponse {
  correct: boolean;
  url?: string;
  reason?: string | null;
}

export interface StrategyContext {
  snapshot: QuizPageSnapshot;
  page: import('playwright').Page;
  deadline: number;
}

export interface Strategy {
  canSolve(snapshot: QuizPageSnapshot): boolean;
  solve(ctx: StrategyContext): Promise<QuizAnswer>;
}
