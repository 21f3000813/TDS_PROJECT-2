import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

type PromptKind = 'system' | 'user';

const REQUIRED_ENV = ['STUDENT_EMAIL', 'QUIZ_SECRET'] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const resolvePrompt = (kind: PromptKind): string => {
  const fallback = path.join(process.cwd(), 'prompts', `${kind}.txt`);
  const rawPath = kind === 'system'
    ? process.env.SYSTEM_PROMPT_PATH ?? fallback
    : process.env.USER_PROMPT_PATH ?? fallback;
  const resolved = path.isAbsolute(rawPath)
    ? rawPath
    : path.join(process.cwd(), rawPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Prompt file not found: ${resolved}`);
  }
  return fs.readFileSync(resolved, 'utf8').trim();
};

export const config = {
  port: Number(process.env.PORT ?? 3000),
  studentEmail: process.env.STUDENT_EMAIL!,
  quizSecret: process.env.QUIZ_SECRET!,
  openAiApiKey: process.env.OPENAI_API_KEY,
  headless: process.env.HEADLESS !== 'false',
  maxPayloadBytes: Number(process.env.MAX_PAYLOAD_BYTES ?? 950_000),
  maxConcurrentJobs: Number(process.env.MAX_CONCURRENT_JOBS ?? 2),
  systemPrompt: resolvePrompt('system'),
  userPrompt: resolvePrompt('user')
};
