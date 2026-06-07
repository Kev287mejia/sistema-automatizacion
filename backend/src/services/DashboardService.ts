import { EventRepository, EventRecord } from '../repositories/EventRepository';
import { AgendaRepository, AgendaItem } from '../repositories/AgendaRepository';
import { EntrepreneurshipRepository } from '../repositories/EntrepreneurshipRepository';

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
  async getDailyExecutiveSummary(): Promise<ExecutiveSummaryData> {
    try {
      // 1. Obtener datos simultáneamente
      const [todayEvents, pendingAgenda, activeProjects] = await Promise.all([
        this.eventRepo.getTodayEvents(),
        this.agendaRepo.getPendingAgenda(),
        this.entrepreneurshipRepo.getActiveEntrepreneurships()
      ]);

      const now = new Date();

      // 2. Clasificar reuniones vs actividades del día
      // Eventos oficiales de tipo 'Reunión'
      const officialMeetings = todayEvents.filter(e => e.event_type === 'Reunión');
      // Eventos oficiales que no son reuniones (ej. Talleres, Conferencias)
      const officialWorkshops = todayEvents.filter(e => e.event_type !== 'Reunión');

      // Tareas de la agenda que ocurren hoy
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const todayAgendaItems = pendingAgenda.filter(item => {
        const itemDate = new Date(item.start_time);
        return itemDate >= startOfToday && itemDate <= endOfToday;
      });

      // Tareas de hoy clasificadas como reunión por su título
      const agendaMeetings = todayAgendaItems.filter(item =>
        item.title.toLowerCase().includes('reunión')
      );
      // Otras tareas de la agenda de hoy
      const agendaTasksToday = todayAgendaItems.filter(item =>
        !item.title.toLowerCase().includes('reunión')
      );

      // Compilar reuniones del día
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

      // Compilar talleres y actividades del día
      const workshopsAndEvents = officialWorkshops.map(w => ({
        title: w.title,
        type: w.event_type,
        location: w.location
      }));

      // Compilar todos los pendientes generales (sin contar reuniones)
      const generalPendingTasks = pendingAgenda.filter(item =>
        !item.title.toLowerCase().includes('reunión')
      );

      const pendingTasks = generalPendingTasks.map(t => ({
        title: t.title,
        due_date: t.start_time
      }));

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
    res += `Buenos días, Directora. Aquí tiene la situación actual de su área:\n\n`;
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
