import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ Advertencia: GEMINI_API_KEY no está definido en el archivo .env');
}

// Inicializamos el cliente de Gemini
export const genAI = new GoogleGenerativeAI(apiKey || 'dummy_key');
export const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-flash-latest' });
export const jsonModel = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  generationConfig: {
    responseMimeType: 'application/json'
  }
});

