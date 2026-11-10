import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let genAI = null;

function getClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(env.AI_API_KEY);
  }
  return genAI;
}

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'];

function getPrimaryModelName() {
  const configured = (env.AI_MODEL || '').trim();
  // Automatically alias deprecated models to active recommended models
  if (!configured || configured === 'gemini-2.0-flash' || configured === 'models/gemini-2.0-flash') {
    return 'gemini-2.5-flash';
  }
  return configured;
}

export async function callGemini(prompt, systemInstruction = '', jsonMode = true) {
  const client = getClient();
  const primaryModel = getPrimaryModelName();
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError;
  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction || undefined,
        generationConfig: jsonMode
          ? {
              responseMimeType: 'application/json',
              temperature: 0.1,
            }
          : {
              temperature: 0.3,
            },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      const isUnavailable =
        error.message?.includes('404') ||
        error.message?.includes('no longer available') ||
        error.message?.includes('not found');

      if (isUnavailable) {
        logger.warn(`Gemini model ${modelName} unavailable, attempting fallback: ${error.message}`);
        continue;
      }
      logger.error('Gemini API call error:', error.message);
      throw error;
    }
  }

  logger.error('All Gemini model candidates failed:', lastError?.message);
  throw lastError;
}

export async function callGeminiVision(prompt, imageBuffer, mimeType = 'image/jpeg') {
  const client = getClient();
  const primaryModel = getPrimaryModelName();
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimeType,
    },
  };

  let lastError;
  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      const isUnavailable =
        error.message?.includes('404') ||
        error.message?.includes('no longer available') ||
        error.message?.includes('not found');

      if (isUnavailable) {
        logger.warn(`Gemini vision model ${modelName} unavailable, attempting fallback: ${error.message}`);
        continue;
      }
      logger.error('Gemini Vision OCR call error:', error.message);
      throw error;
    }
  }

  logger.error('All Gemini vision model candidates failed:', lastError?.message);
  throw lastError;
}
