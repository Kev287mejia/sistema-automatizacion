import { EventRepository } from '../repositories/EventRepository';
import { normalizeEvent, getCanonicalTitle, normalizeAudience } from '../utils/eventNormalizer';

export class EventService {
  private eventRepo: EventRepository;

  constructor() {
    this.eventRepo = new EventRepository();
  }

  /**
   * Crea un evento a partir de parámetros estructurados extraídos por Gemini.
   */
  async processEventCreation(params: any): Promise<string> {
    const rawTitle = params.event_title || params.title || params.topic;
    const type = params.event_type || params.type || 'Taller';
    const rawDay = params.date || 'hoy';
    const rawTime = params.time || '12 PM';

    // Normalizar Tipo a los autorizados en la base de datos (event_type_enum)
    let eventType: 'Taller' | 'Conferencia' | 'Asesoría' | 'Reunión' | 'Competencia' = 'Taller';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('reuni')) eventType = 'Reunión';
    else if (typeLower.includes('conferencia')) eventType = 'Conferencia';
    else if (typeLower.includes('asesor')) eventType = 'Asesoría';
    else if (typeLower.includes('competencia')) eventType = 'Competencia';

    // Normalizar y sanitizar título y ubicación usando el normalizador centralizado
    const normalized = normalizeEvent(rawTitle, eventType, params.location);

    // Normalizar audiencia y extraer metadata institucional
    const rawAudience = params.target_audience || params.audience || params.participants;
    const targetAudience = normalizeAudience(rawAudience);
    const faculty = params.faculty ? (params.faculty.trim().charAt(0).toUpperCase() + params.faculty.trim().slice(1)) : undefined;
    const facilitator = params.facilitator ? params.facilitator.trim() : undefined;

    // Resolver fecha
    let startDate: Date;
    try {
      startDate = this.calculateDate(rawDay.toLowerCase(), rawTime.toLowerCase());
    } catch (e) {
      startDate = new Date();
    }

    try {
      // Validar duplicaciones semánticas en el mismo día antes de insertar
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingEvents = await this.eventRepo.getEventsInDateRange(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      const newCanonical = getCanonicalTitle(normalized.title);
      const duplicate = existingEvents.find(e => getCanonicalTitle(e.title) === newCanonical);

      if (duplicate) {
        return `⚠️ Ya existe un evento similar registrado para esa fecha: "${duplicate.title}".`;
      }

      // Duración por defecto: 2 horas
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const newEvent = await this.eventRepo.createEvent({
        title: normalized.title,
        event_type: eventType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location: normalized.location,
        status: 'Planificado',
        target_audience: targetAudience,
        faculty: faculty,
        facilitator: facilitator
      });

      let confirmMsg = `✅ *Evento Registrado*\n\n` +
        `📍 *${eventType}:* ${newEvent.title}\n` +
        `📅 *Fecha:* ${startDate.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}\n`;
      if (normalized.location && normalized.location !== 'Ubicación pendiente de definir') {
        confirmMsg += `📍 *Lugar:* ${normalized.location}\n`;
      }
      if (targetAudience) {
        confirmMsg += `👥 *Audiencia:* ${targetAudience}\n`;
      }
      if (faculty) {
        confirmMsg += `🏗️ *Facultad:* ${faculty}\n`;
      }
      if (facilitator) {
        confirmMsg += `🎓 *Facilitador:* ${facilitator}\n`;
      }
      confirmMsg += `\n_Registrado en la base de datos institucional._`;

      return confirmMsg;
    } catch (error: any) {
      console.error('Error al guardar evento:', error);
      return `⚠️ Ocurrió un error al guardar el evento en Supabase.`;
    }
  }

  private calculateDate(dayName: string, timeString: string): Date {
    const daysMap: { [key: string]: number } = {
      'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 'miercoles': 3,
      'jueves': 4, 'viernes': 5, 'sábado': 6, 'sabado': 6
    };

    const now = new Date();
    let targetDate = new Date(now);

    // Si es una fecha ISO o formato de fecha estándar
    if (!isNaN(Date.parse(dayName))) {
      targetDate = new Date(dayName);
    } else if (dayName === 'mañana' || dayName === 'manana') {
      targetDate.setDate(now.getDate() + 1);
    } else if (dayName !== 'hoy') {
      const currentDay = now.getDay();
      const targetDay = daysMap[dayName];
      if (targetDay !== undefined) {
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7; // Próxima semana si el día ya pasó o es hoy
        targetDate.setDate(now.getDate() + diff);
      }
    }

    // Parsear hora (ej. "2 PM", "14:00", "10 AM")
    const timeRegex = /(\d{1,2})(?:\:(\d{2}))?\s*(AM|PM|am|pm)?/i;
    const timeMatch = timeString.match(timeRegex);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);
    }

    return targetDate;
  }
}
