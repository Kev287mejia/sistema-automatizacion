import { model } from '../integrations/ai/gemini';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ParsedIntent {
  intent: 'REGISTER_PARTICIPANT' | 'SUMMARY_AND_AGENDA' | 'EVENT_CREATION' | 'ATTENDANCE' | 'REPORTS' | 'PROJECT_TRACKING' | 'SCHEDULE_MENTORING' | 'BROADCAST_CALL' | 'UNKNOWN_OR_CASUAL';
  parameters?: {
    event_name?: string;
    event_type?: string;
    event_title?: string;
    date?: string;
    time?: string;
    timeframe?: string;
    topic?: string;
    project_name?: string;
    mentor?: string;
    [key: string]: any;
  };
  response_text?: string;
}

export class IntentService {
  /**
   * Cerebro NLP: Analiza el historial y el mensaje actual para clasificar la intención.
   */
  async processMessage(text: string, history: ChatMessage[] = []): Promise<ParsedIntent> {
    const formattedHistory = history.map(msg => `${msg.role === 'user' ? 'Directora' : 'Hermes'}: ${msg.content}`).join('\n');
    
    const prompt = `
      Eres Hermes, el Asistente Ejecutivo Avanzado de la Directora de Innovación y Emprendimiento.
      Tu trabajo es leer el historial conversacional y el último mensaje, y extraer la INTENCIÓN EXACTA en formato JSON.
      
      Lista de intenciones permitidas:
      1. "REGISTER_PARTICIPANT": Quiere agregar a alguien al sistema.
      2. "SUMMARY_AND_AGENDA": Dice "Buenos días", "¿Qué tengo pendiente?" o pide su agenda.
      3. "EVENT_CREATION": Quiere crear o programar un taller/conferencia. Extrae: event_type, event_title, date, time.
      4. "ATTENDANCE": Quiere registrar asistencia. Extrae: event_name.
      5. "REPORTS": Pide generar un informe o reporte. Extrae: timeframe, topic.
      6. "PROJECT_TRACKING": Pregunta por proyectos atrasados o estado de emprendimientos.
      7. "SCHEDULE_MENTORING": Pide programar una mentoría. Extrae: project_name, mentor, date.
      8. "BROADCAST_CALL": Pide hacer una convocatoria o anuncio general.
      9. "UNKNOWN_OR_CASUAL": Cualquier otro saludo, charla casual, seguimiento, o instrucción ambigua.
      
      Reglas Vitales:
      - Responde ÚNICAMENTE con un JSON válido. No uses marcadores \`\`\`json.
      - Para "UNKNOWN_OR_CASUAL", debes incluir un "response_text" con una respuesta conversacional formal y cortés (max 2 líneas), respondiendo inteligentemente al contexto. Si es muy ambiguo, pide aclaración.
      
      Historial Conversacional:
      ${formattedHistory}
      
      Último Mensaje de la Directora: "${text}"
      
      Formato JSON requerido:
      {
        "intent": "...",
        "parameters": { ... },
        "response_text": "..."
      }
    `;

    const callWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      let timeoutHandle: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
    };

    try {
      const result = await callWithTimeout(model.generateContent(prompt), 5000);
      const cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText) as ParsedIntent;
    } catch (error: any) {
      console.error('Error invocando a Gemini NLP:', error);
      if (error.cause) {
        console.error('Gemini NLP fetch failure cause:', error.cause);
      }
      return {
        intent: 'UNKNOWN_OR_CASUAL',
        response_text: 'Disculpe directora, estoy teniendo interferencia en mi procesamiento neuronal. ¿Podría repetir la instrucción?'
      };
    }
  }
}
