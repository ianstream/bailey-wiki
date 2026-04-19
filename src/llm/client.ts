import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { ConversationRole } from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-providers';
import type { LLMConfig } from '../types.js';

async function callLLMBedrock(
  messages: Array<{ role: string; content: string }>,
  llm: LLMConfig
): Promise<string> {
  const { model, bedrock: { profile, region } } = llm;
  const client = new BedrockRuntimeClient({
    region,
    credentials: fromIni({ profile }),
  });
  const bedrockMessages = messages.map((m) => ({
    role: m.role as ConversationRole,
    content: [{ text: m.content }],
  }));

  const MAX_RETRIES = 8;
  let delay = 2000;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await client.send(new ConverseCommand({ modelId: model, messages: bedrockMessages }));
      return resp.output?.message?.content?.[0]?.text ?? '';
    } catch (e: unknown) {
      const error = e as { name?: string; message?: string };
      const isThrottle =
        error.name === 'ThrottlingException' ||
        (error.message ?? '').toLowerCase().includes('too many tokens');
      if (isThrottle && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, delay + Math.random() * 1000));
        delay = Math.min(delay * 2, 60000);
        continue;
      }
      throw e;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  llm: LLMConfig
): Promise<string> {
  return callLLMBedrock(messages, llm);
}
