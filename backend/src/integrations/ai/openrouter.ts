import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;
const defaultModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

if (!apiKey) {
  console.warn('⚠️ Advertencia: OPENROUTER_API_KEY no está definido en el archivo .env');
}

export class OpenRouterModelInstance {
  private modelName: string;
  private generationConfig?: any;

  constructor(modelName: string, generationConfig?: any) {
    this.modelName = modelName;
    this.generationConfig = generationConfig;
  }

  async generateContent(prompt: string): Promise<any> {
    const isJson = this.generationConfig?.responseMimeType === 'application/json' ||
                   this.generationConfig?.responseSchema !== undefined;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey || 'dummy_key'}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/Kev287mejia/sistema-automatizacion',
      'X-Title': 'Hermes Executive Assistant'
    };

    const body = {
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
      response_format: isJson ? { type: 'json_object' } : undefined,
      temperature: 0.1,
      max_tokens: 1000
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';

    return {
      response: {
        text: () => content
      }
    };
  }
}

export const genAI = {
  getGenerativeModel: (config: { model: string; generationConfig?: any }) => {
    const modelName = config.model || defaultModel;
    return new OpenRouterModelInstance(modelName, config.generationConfig);
  }
};

// Instancias pre-configuradas para compatibilidad con servicios anteriores
export const model = genAI.getGenerativeModel({ model: defaultModel });
export const jsonModel = genAI.getGenerativeModel({
  model: defaultModel,
  generationConfig: {
    responseMimeType: 'application/json'
  }
});
