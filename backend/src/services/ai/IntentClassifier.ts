import { genAI } from '../../integrations/ai/gemini';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface DetectedIntent {
  intent: 'morning_summary' | 'get_pending_tasks' | 'create_event' | 'register_attendance' | 'generate_report' | 'create_meeting' | 'get_statistics' | 'get_overdue_projects' | 'create_document' | 'unknown';
  confidence: number;
  entities: {
    event_type?: string;
    topic?: string;
    date?: string;
    time?: string;
    [key: string]: any;
  };
  response_text?: string; // Solo usado para fallback local
}

// Esquema de validación estricto para forzar a Gemini a devolver solo JSON estructurado
const classificationSchema = {
  type: 'OBJECT' as any,
  properties: {
    intent: {
      type: 'STRING' as any,
      description: 'El nombre de la intención detectada de manera estricta.',
      enum: [
        'morning_summary',
        'get_pending_tasks',
        'create_event',
        'register_attendance',
        'generate_report',
        'create_meeting',
        'get_statistics',
        'get_overdue_projects',
        'create_document',
        'unknown'
      ]
    },
    confidence: {
      type: 'NUMBER' as any,
      description: 'Nivel de confianza en la detección, entre 0.0 y 1.0.'
    },
    entities: {
      type: 'OBJECT' as any,
      description: 'Entidades y parámetros específicos extraídos del mensaje.',
      properties: {
        event_type: { 
          type: 'STRING' as any, 
          description: 'Tipo de evento extraído (taller, conferencia, asesoria, reunion, competencia).' 
        },
        topic: { 
          type: 'STRING' as any, 
          description: 'Tema, título o nombre del proyecto/evento extraído del texto.' 
        },
        date: { 
          type: 'STRING' as any, 
          description: 'Día o fecha de vencimiento extraído (ej: viernes, mañana, hoy, 12 de junio).' 
        },
        time: { 
          type: 'STRING' as any, 
          description: 'Hora del evento (ej: 2 PM, 14:00, 10 AM).' 
        }
      }
    }
  },
  required: ['intent', 'confidence', 'entities']
};

export class IntentClassifier {
  private modelInstance: any;

  constructor() {
    this.modelInstance = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: classificationSchema
      }
    });
  }

  private async callWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
  }

  /**
   * Clasifica el mensaje del usuario e identifica la intención.
   */
  async classify(text: string, history: ChatMessage[] = []): Promise<DetectedIntent> {
    const formattedHistory = history
      .map(msg => `${msg.role === 'user' ? 'Kenia Salomon' : 'Hermes'}: ${msg.content}`)
      .join('\n');

    const prompt = `
      Eres Hermes, el Asistente Ejecutivo Avanzado de la MSc. Kenia Salomon (Directora de Innovación y Emprendimiento).
      Tu única tarea es clasificar el último mensaje de la Directora y extraer entidades si aplica.
      
      Lista de intenciones permitidas y sus disparadores típicos:
      1. "morning_summary": Saludo matutino general o petición de resumen global de la jornada. Ej: "Buenos días", "Hola", "Resumen del día".
      2. "get_pending_tasks": Pregunta explícita por tareas pendientes o por hacer. Ej: "¿Qué tengo pendiente hoy?", "dame mis tareas pendientes", "ver pendientes".
      3. "create_event": Orden para programar un taller, conferencia, asesoría, reunión oficial o competencia. Ej: "Crear taller de innovación viernes 2 PM", "Crear conferencia mañana 10 AM".
         - Debes extraer en entities:
           * "event_type": El tipo de evento (taller, conferencia, asesoria, reunion, competencia).
           * "topic": El tema o título del evento (ej: "innovación", "inteligencia artificial").
           * "date": El día (ej: "viernes", "mañana", "lunes").
           * "time": La hora (ej: "2 PM", "10 AM").
      4. "register_attendance": Orden para registrar la asistencia de alumnos/participantes. Ej: "Registrar asistencia para taller de robótica", "asistencia taller".
         - Debes extraer en entities:
           * "topic": El nombre del evento al cual registrar la asistencia.
      5. "generate_report": Pedido de generar informes físicos (PDF/Word). Ej: "Genera informe del mes", "informe mensual", "reporte de taller".
         - Debes extraer en entities:
           * "topic": El tema del reporte (ej: "taller", "general", "mensual").
      6. "create_meeting": Agendar una reunión con alguien. Ej: "Agendar reunión con Mentor X mañana a las 3 PM".
      7. "get_statistics": Solicitar datos numéricos o demográficos. Ej: "Dame estadísticas de participantes", "número de alumnos inscritos".
      8. "get_overdue_projects": Preguntar por proyectos atrasados o estado de emprendimientos. Ej: "proyectos atrasados", "bitácoras sin actualizar".
      9. "create_document": Redactar un borrador de texto formal, acta o minuta. Ej: "Redactar minuta de reunión", "borrador de texto ejecutivo".
      10. "unknown": Saludos informales de paso, charlas casuales, agradecimientos, o instrucciones vagas que no encajen en lo anterior.
      
      Reglas de confianza (confidence):
      - Asigna un confidence score (0.0 a 1.0) que represente la seguridad de tu clasificación.
      - Si la instrucción no está clara o es ambigua para mapearla a un comando ejecutivo, mantén la confianza baja o clasifícalo como "unknown".
      
      REGLAS DE SALIDA EXTREMADAMENTE ESTRICTAS:
      - NO agregues explicaciones, comentarios, justificaciones, ni texto inferido largo dentro de ningún valor del JSON.
      - El campo 'topic' debe ser estrictamente una o dos palabras que definan el tema del evento/taller/reporte, o nulo si no se especifica. NO inventes explicaciones ni metas comentarios en el campo.
      - Si una entidad no está presente en el mensaje del usuario, no la extraigas o déjala vacía.
      
      Historial Conversacional:
      ${formattedHistory}
      
      Último Mensaje de la Directora: "${text}"
    `;

    try {
      const result = (await this.callWithTimeout(this.modelInstance.generateContent(prompt), 15000)) as any;
      const rawText = result.response.text();
      const detected = JSON.parse(rawText.trim()) as DetectedIntent;

      // Loguear detalles de la clasificación según requisitos
      console.log("Intent:", detected.intent);
      console.log("Confidence:", detected.confidence);
      console.log("Entities:", JSON.stringify(detected.entities));

      // Filtro de confianza estricto (confidence score < 0.7)
      if (detected.confidence < 0.7) {
        return {
          intent: 'unknown',
          confidence: detected.confidence,
          entities: {},
          response_text: 'MSc. Kenia Salomon, no estoy completamente seguro de la instrucción. ¿Podría detallar un poco más la acción que desea ejecutar?'
        };
      }

      return detected;
    } catch (error: any) {
      console.error('Error en IntentClassifier de Gemini:', error);
      // Fallback robusto en caso de error de red o timeout
      return {
        intent: 'unknown',
        confidence: 0.0,
        entities: {},
        response_text: 'Disculpe MSc. Kenia Salomon, estoy experimentando una breve interrupción en mi sistema cognitivo. ¿Podría repetir la instrucción?'
      };
    }
  }
}
