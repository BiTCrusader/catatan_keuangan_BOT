import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let groqClient = null;

function getClient() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: env.AI_API_KEY });
  }
  return groqClient;
}

export async function callGroq(prompt, systemInstruction = '', jsonMode = true) {
  try {
    const groq = getClient();
    const messages = [];

    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await groq.chat.completions.create({
      model: env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.1,
      response_format: jsonMode ? { type: 'json_object' } : undefined,
    });

    return completion.choices[0]?.message?.content || '{}';
  } catch (error) {
    logger.error('Groq API call error:', error.message);
    throw error;
  }
}
