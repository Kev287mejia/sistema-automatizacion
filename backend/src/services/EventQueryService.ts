import { EventRecord, EventRepository } from '../repositories/EventRepository';
import { getCanonicalTitle } from '../utils/eventNormalizer';
import { getUtcDateRangeForFilter } from '../utils/dateRangeCalculator';
import {
  formatAgendaHeader,
  formatEventBlock,
  getPeriodLabel
} from '../utils/institutionalFormatter';

export class EventQueryService {
  private eventRepo: EventRepository;
  private readonly userOffsetHours = -6;

  constructor() {
    this.eventRepo = new EventRepository();
  }

  private getLocalNow(): Date {
    const now = new Date();
    const serverOffsetMs = now.getTimezoneOffset() * 60000;
    const userOffsetMs = this.userOffsetHours * 3600000;
    return new Date(now.getTime() + serverOffsetMs + userOffsetMs);
  }

  /**
   * Data Quality Layer: elimina registros basura antes de renderizar.
   * Opera en memoria — no modifica Supabase.
   */
  private applyDataQuality(events: EventRecord[]): EventRecord[] {
    const seenCanonical = new Set<string>();
    return events.filter(event => {
      // 1. Eliminar eventos sin título válido
      const title = (event.title || '').trim();
      if (!title || ['null','undefined','nulo'].includes(title.toLowerCase())) return false;

      // 2. Ocultar eventos cancelados de la vista conversacional
      if (event.status === 'Cancelado') return false;

      // 3. Eliminar duplicados semánticos en memoria (mismo título canónico)
      const canonical = getCanonicalTitle(title);
      if (seenCanonical.has(canonical)) return false;
      seenCanonical.add(canonical);

      // 4. Sanitizar: filtrar registros con start_date inválido
      if (!event.start_date || isNaN(new Date(event.start_date).getTime())) return false;

      return true;
    });
  }

  /**
   * Obtiene eventos filtrados, aplica Data Quality, y los retorna en formato institucional ejecutivo.
   */
  async getFormattedEvents(filter: string): Promise<string> {
    const { startUtc, endUtc } = getUtcDateRangeForFilter(filter);
    const statusFilter = filter.toLowerCase().trim() === 'pending' ? 'Planificado' : undefined;

    const rawEvents = await this.eventRepo.getEventsInDateRange(
      startUtc.toISOString(),
      endUtc.toISOString(),
      statusFilter
    );

    // Aplicar Data Quality Layer antes de renderizar
    const events = this.applyDataQuality(rawEvents);

    const periodLabel = getPeriodLabel(filter);
    const header = formatAgendaHeader(periodLabel);

    if (events.length === 0) {
      return `${header}\n\n_No hay actividades programadas para ${periodLabel.toLowerCase()}._`;
    }

    const localNow = this.getLocalNow();
    let responseText = `${header}\n\n`;

    events.forEach(event => {
      responseText += formatEventBlock(event, filter, localNow, this.userOffsetHours);
      responseText += '\n';
    });

    // Sección de pendientes al final
    responseText += `⚠️ *Pendientes:*\n_No existen pendientes institucionales._`;

    return responseText.trim();
  }
}
