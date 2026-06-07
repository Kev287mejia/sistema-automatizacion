import { model } from '../../integrations/ai/gemini';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface DetectedIntent {
  intent: 'morning_summary' | 'register_participant' | 'attendance' | 'event_creation' | 'reports' | 'project_tracking' | 'schedule_mentoring' | 'broadcast_call' | 'casual_conversation';
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
  response_text?: string; // Respuesta conversacional directa de Gemini para 'casual_conversation'
}

export class IntentClassifier {
  private async callWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
  }

  /**
   * Procesa el mensaje de entrada y el historial para clasificar la intención de la Directora.
   */
  async classify(text: string, history: ChatMessage[] = []): Promise<DetectedIntent> {
    const formattedHistory = history
      .map(msg => `${msg.role === 'user' ? 'Directora' : 'Hermes'}: ${msg.content}`)
      .join('\n');

    const prompt = `
      Eres Hermes, el Asistente Ejecutivo Avanzado de la Directora de Innovación y Emprendimiento.
      Tu única tarea es leer el historial conversacional y el último mensaje de la Directora, e interpretar su INTENCIÓN EXACTA en formato JSON.
      
      Lista de intenciones permitidas:
      1. "morning_summary": Saludos del día como "Buenos días", "¿Qué tengo pendiente?", "Dame mi resumen ejecutivo", "agenda del día".
      2. "register_participant": Quiere agregar a alguien al sistema o registrar un nuevo participante.
      3. "event_creation": Quiere crear o programar un taller, conferencia o reunión. Extrae del texto: event_type, event_title, date, time.
      4. "attendance": Quiere registrar asistencia de alumnos/participantes. Extrae del texto: event_name.
      5. "reports": Pide generar un informe o reporte. Extrae del texto: timeframe, topic.
      6. "project_tracking": Pregunta por proyectos atrasados, estado de los emprendimientos o alertas de innovación.
      7. "schedule_mentoring": Pide programar una mentoría. Extrae del texto: project_name, mentor, date.
      8. "broadcast_call": Pide hacer una convocatoria o anuncio general masivo.
      9. "casual_conversation": Cualquier saludo informal (que no sea "buenos días" al inicio del día), charla casual, agradecimientos, despedidas, o instrucciones extremadamente ambiguas.
      
      Reglas de respuesta:
      - Responde ÚNICAMENTE con un JSON válido. No utilices bloques de código de markdown (\`\`\`json ni \`\`\`).
      - Para "casual_conversation", debes proveer obligatoriamente en "response_text" una respuesta conversacional formal, ejecutiva y cortés (máximo 2 líneas) acorde a la conversación.
      - Para todas las demás intenciones, NO intentes responder la solicitud tú mismo en "response_text", deja ese campo vacío o no lo incluyes. La lógica la ejecutará el sistema.
      
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

    try {
      const result = await this.callWithTimeout(model.generateContent(prompt), 5000);
      const rawText = result.response.text();
      const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText) as DetectedIntent;
    } catch (error: any) {
      console.error('Error en IntentClassifier de Gemini:', error);
      // Fallback seguro en caso de error o timeout
      return {
        intent: 'casual_conversation',
        response_text: 'Disculpe MSc. Kenia Salomon, estoy experimentando una breve interrupción en mi sistema cognitivo. ¿Podría repetir la instrucción?'
      };
    }
  }
}
