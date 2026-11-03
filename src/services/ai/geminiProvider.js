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

export async function callGemini(prompt, systemInstruction = '', jsonMode = true) {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: env.AI_MODEL || 'gemini-1.5-flash',
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
    const text = response.text();
    return text;
  } catch (error) {
    logger.error('Gemini API call error:', error.message);
    throw error;
  }
}

export async function callGeminiVision(prompt, imageBuffer, mimeType = 'image/jpeg') {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: env.AI_MODEL || 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    logger.error('Gemini Vision OCR call error:', error.message);
    throw error;
  }
}
