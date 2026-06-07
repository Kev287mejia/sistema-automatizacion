import { EventRepository } from '../repositories/EventRepository';

export class EventQueryService {
  private eventRepo: EventRepository;
  private readonly userOffsetHours = -6;

  constructor() {
    this.eventRepo = new EventRepository();
  }

  /**
   * Obtiene la hora actual del servidor desplazada a la hora local del usuario (-06:00).
   */
  private getLocalNow(): Date {
    const now = new Date();
    const serverOffsetMs = now.getTimezoneOffset() * 60000;
    const userOffsetMs = this.userOffsetHours * 3600000;
    return new Date(now.getTime() + serverOffsetMs + userOffsetMs);
  }

  /**
   * Retorna los límites de fecha en UTC para el filtro de consulta.
   */
  private getUtcDateRange(filter: 'today' | 'tomorrow' | 'week' | 'pending' | 'all'): { startUtc: Date; endUtc: Date } {
    const now = new Date();
    const serverOffsetMs = now.getTimezoneOffset() * 60000;
    const userOffsetMs = this.userOffsetHours * 3600000;
    
    const localNow = new Date(now.getTime() + serverOffsetMs + userOffsetMs);
    let localStart = new Date(localNow);
    let localEnd = new Date(localNow);

    if (filter === 'today') {
      localStart.setHours(0, 0, 0, 0);
      localEnd.setHours(23, 59, 59, 999);
    } else if (filter === 'tomorrow') {
      localStart.setDate(localStart.getDate() + 1);
      localStart.setHours(0, 0, 0, 0);
      
      localEnd.setDate(localEnd.getDate() + 1);
      localEnd.setHours(23, 59, 59, 999);
    } else if (filter === 'week') {
      localStart.setHours(0, 0, 0, 0);
      // Próximos 7 días a partir de hoy
      localEnd.setDate(localEnd.getDate() + 7);
      localEnd.setHours(23, 59, 59, 999);
    } else {
      // 'pending' o 'all': Desde hoy en adelante
      localStart.setHours(0, 0, 0, 0);
      localEnd.setFullYear(localEnd.getFullYear() + 2); // 2 años adelante
    }

    const startUtc = new Date(localStart.getTime() - userOffsetMs - serverOffsetMs);
    const endUtc = new Date(localEnd.getTime() - userOffsetMs - serverOffsetMs);

    return { startUtc, endUtc };
  }

  private getClockEmoji(hour: number): string {
    const clockEmojis = ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'];
    return clockEmojis[hour % 12];
  }

  private formatEventDate(dateStr: string, localNow: Date): string {
    const eventDateUtc = new Date(dateStr);
    const serverOffsetMs = eventDateUtc.getTimezoneOffset() * 60000;
    const userOffsetMs = this.userOffsetHours * 3600000;
    const eventDateLocal = new Date(eventDateUtc.getTime() + serverOffsetMs + userOffsetMs);

    let hours = eventDateLocal.getHours();
    const minutes = eventDateLocal.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    const timeStr = `${hours}:${minutesStr} ${ampm}`;

    const todayDate = new Date(localNow);
    todayDate.setHours(0, 0, 0, 0);
    const eventCompareDate = new Date(eventDateLocal);
    eventCompareDate.setHours(0, 0, 0, 0);

    const dayDifference = Math.round((eventCompareDate.getTime() - todayDate.getTime()) / (24 * 3600000));
    const clockEmoji = this.getClockEmoji(eventDateLocal.getHours());

    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    if (dayDifference === 0) {
      return `${clockEmoji} Hoy – ${timeStr}`;
    } else if (dayDifference === 1) {
      return `${clockEmoji} Mañana – ${timeStr}`;
    } else if (dayDifference > 1 && dayDifference < 7) {
      return `${clockEmoji} ${daysOfWeek[eventDateLocal.getDay()]} – ${timeStr}`;
    } else {
      const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      return `${clockEmoji} ${eventDateLocal.getDate()} de ${monthNames[eventDateLocal.getMonth()]} – ${timeStr}`;
    }
  }

  /**
   * Obtiene la lista de eventos filtrados y los retorna con el formato institucional requerido.
   */
  async getFormattedEvents(filter: 'today' | 'tomorrow' | 'week' | 'pending' | 'all'): Promise<string> {
    const { startUtc, endUtc } = this.getUtcDateRange(filter);
    
    // Si el filtro es "pending", buscamos únicamente los planificados
    const statusFilter = filter === 'pending' ? 'Planificado' : undefined;
    
    const events = await this.eventRepo.getEventsInDateRange(
      startUtc.toISOString(),
      endUtc.toISOString(),
      statusFilter
    );

    if (events.length === 0) {
      return 'No hay actividades programadas para ese período.';
    }

    const localNow = this.getLocalNow();
    let responseText = '📅 *Talleres y Actividades Programadas*\n\n';

    events.forEach(event => {
      const dateText = this.formatEventDate(event.start_date, localNow);
      const locationText = event.location || 'Sin ubicación definida';
      responseText += `* ${event.title}\n`;
      responseText += `📍 ${locationText}\n`;
      responseText += `${dateText}\n\n`;
    });

    return responseText.trim();
  }
}
