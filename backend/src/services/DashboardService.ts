import { EventRepository, EventRecord } from '../repositories/EventRepository';
import { AgendaRepository, AgendaItem } from '../repositories/AgendaRepository';
import { EntrepreneurshipRepository } from '../repositories/EntrepreneurshipRepository';
import { normalizeEvent } from '../utils/eventNormalizer';
import { getUtcDateRangeForFilter } from '../utils/dateRangeCalculator';

export interface ExecutiveSummaryData {
  meetingsCount: number;
  workshopsCount: number;
  pendingTasksCount: number;
  meetings: Array<{ title: string; time?: string }>;
  workshopsAndEvents: Array<{ title: string; type: string; location?: string }>;
  pendingTasks: Array<{ title: string; due_date?: string }>;
  alerts: string[];
}

export class DashboardService {
  private eventRepo: EventRepository;
  private agendaRepo: AgendaRepository;
  private entrepreneurshipRepo: EntrepreneurshipRepository;

  constructor() {
    this.eventRepo = new EventRepository();
    this.agendaRepo = new AgendaRepository();
    this.entrepreneurshipRepo = new EntrepreneurshipRepository();
  }

  /**
   * Obtiene la estructura de datos cruda del resumen ejecutivo diario.
   * Sin formatear para Telegram (sin emojis ni Markdown), respetando la separación de lógica y presentación.
   */
  async getDailyExecutiveSummary(dateFilter: 'today' | 'tomorrow' | 'week' | 'all' | string = 'today'): Promise<ExecutiveSummaryData> {
    try {
      const now = new Date();
      const { startUtc, endUtc } = getUtcDateRangeForFilter(dateFilter);

      // 1. Obtener datos simultáneamente
      const [eventsInRange, pendingAgenda, activeProjects] = await Promise.all([
        this.eventRepo.getEventsInDateRange(startUtc.toISOString(), endUtc.toISOString()),
        this.agendaRepo.getPendingAgenda(),
        this.entrepreneurshipRepo.getActiveEntrepreneurships()
      ]);

      // 2. Clasificar reuniones vs actividades del período
      // Eventos oficiales de tipo 'Reunión'
      const officialMeetings = eventsInRange.filter(e => e.event_type === 'Reunión');
      // Eventos oficiales que no son reuniones (ej. Talleres, Conferencias)
      const officialWorkshops = eventsInRange.filter(e => e.event_type !== 'Reunión');

      // Tareas de la agenda del período
      const targetAgendaItems = pendingAgenda.filter(item => {
        const itemDate = new Date(item.start_time);
        return itemDate >= startUtc && itemDate <= endUtc;
      });

      // Tareas del período clasificadas como reunión por su título
      const agendaMeetings = targetAgendaItems.filter(item =>
        item.title.toLowerCase().includes('reunión')
      );
      // Otras tareas de la agenda del período
      const agendaTasks = targetAgendaItems.filter(item =>
        !item.title.toLowerCase().includes('reunión')
      );

      // Compilar reuniones del período
      const meetings = [
        ...officialMeetings.map(m => ({
          title: m.title,
          time: new Date(m.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })),
        ...agendaMeetings.map(m => ({
          title: m.title,
          time: new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }))
      ];

      // Compilar talleres y actividades del período usando el normalizador centralizado
      const workshopsAndEvents = officialWorkshops.map(w => {
        const normalized = normalizeEvent(w.title, w.event_type, w.location);
        
        let timeStr = undefined;
        if (w.start_date) {
          const dt = new Date(w.start_date);
          const serverOffsetMs = dt.getTimezoneOffset() * 60000;
          const userOffsetMs = -6 * 3600000; // Hardcoded user offset
          const localDt = new Date(dt.getTime() + serverOffsetMs + userOffsetMs);
          
          let h = localDt.getHours();
          const m = localDt.getMinutes();
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          timeStr = `${h}:${m < 10 ? '0'+m : m} ${ampm}`;
        }

        return {
          title: normalized.title,
          type: normalized.type,
          location: normalized.location,
          time: timeStr,
          target_audience: (w as any).target_audience
        };
      });

      // Compilar los pendientes generales del período
      const pendingTasks = agendaTasks.map(t => ({
        title: t.title,
        due_date: t.start_time
      }));

      // Para calcular alertas institucionales, seguimos usando todas las tareas pendientes generales
      const generalPendingTasks = pendingAgenda.filter(item =>
        !item.title.toLowerCase().includes('reunión')
      );

      // 3. Calcular Alertas Institucionales
      const alerts: string[] = [];

      // A. Alerta de Emprendimientos inactivos (> 10 días)
      for (const project of activeProjects) {
        let lastActivityDate = new Date(project.updated_at);

        // Si tiene logs en la bitácora, buscar el más reciente
        if (project.entrepreneurship_logs && project.entrepreneurship_logs.length > 0) {
          const logDates = project.entrepreneurship_logs.map(log => new Date(log.created_at).getTime());
          const maxLogTime = Math.max(...logDates);
          if (maxLogTime > lastActivityDate.getTime()) {
            lastActivityDate = new Date(maxLogTime);
          }
        }

        const diffTime = now.getTime() - lastActivityDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 10) {
          alerts.push(`${project.name} lleva ${diffDays} días sin actualización`);
        }
      }

      // B. Alerta de tareas de agenda que vencen pronto (en los próximos 3 días)
      for (const task of generalPendingTasks) {
        const dueDate = new Date(task.start_time);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0 && diffDays <= 3) {
          alerts.push(`${task.title} vence en ${diffDays} día${diffDays > 1 ? 's' : ''}`);
        }
      }

      return {
        meetingsCount: meetings.length,
        workshopsCount: workshopsAndEvents.length,
        pendingTasksCount: pendingTasks.length,
        meetings,
        workshopsAndEvents,
        pendingTasks,
        alerts
      };
    } catch (e: any) {
      console.error('Error al compilar el resumen ejecutivo:', e);
      throw e;
    }
  }

  /**
   * Método legacy para mantener compatibilidad si es requerido por otros controladores.
   */
  async generateDailySummary(): Promise<string> {
    const data = await this.getDailyExecutiveSummary();
    let res = `🏛️ *Resumen Matutino Institucional*\n\n`;
    res += `Buenos días, MSc. Kenia Salomon. Aquí tiene la situación actual de su área:\n\n`;
    res += `🤝 *Reuniones Pendientes: (${data.meetingsCount})*\n`;
    if (data.meetings.length > 0) {
      data.meetings.forEach(m => res += `• ${m.title} (${m.time})\n`);
    } else {
      res += `_No hay reuniones programadas hoy._\n`;
    }
    res += `\n📅 *Actividades del Día: (${data.workshopsCount})*\n`;
    if (data.workshopsAndEvents.length > 0) {
      data.workshopsAndEvents.forEach(e => res += `• [${e.type}] ${e.title} - ${e.location || 'Sin ubicación'}\n`);
    } else {
      res += `_No hay eventos hoy._\n`;
    }
    res += `\n📋 *Pendientes de Agenda: (${data.pendingTasksCount})*\n`;
    if (data.pendingTasks.length > 0) {
      data.pendingTasks.slice(0, 5).forEach(t => res += `• ${t.title}\n`);
      if (data.pendingTasks.length > 5) res += `• ...y ${data.pendingTasks.length - 5} pendientes más.\n`;
    } else {
      res += `_Bandeja limpia._\n`;
    }
    res += `\n⚠️ *Alertas:*\n`;
    if (data.alerts.length > 0) {
      data.alerts.forEach(a => res += `• ${a}\n`);
    } else {
      res += `_No hay alertas críticas._\n`;
    }
    return res;
  }
}
