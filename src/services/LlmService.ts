import OpenAI from 'openai';
import { config } from '../config';

class LlmService {
  private client?: OpenAI;

  private getClient(): OpenAI {
    if (!config.openAiApiKey) {
      throw new Error('OPENAI_API_KEY is required when LLM analysis is requested.');
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: config.openAiApiKey });
    }
    return this.client;
  }

  public async analyze(params: { system: string; user: string }): Promise<string> {
    const client = this.getClient();
    const response = await client.responses.create({
      model: 'gpt-5.1',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: params.system }] },
        { role: 'user', content: [{ type: 'input_text', text: params.user }] }
      ]
    });
    return (response.output_text ?? '').trim();
  }
}

export const llmService = new LlmService();
