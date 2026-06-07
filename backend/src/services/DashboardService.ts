import { EventRepository, EventRecord } from '../repositories/EventRepository';
import { AgendaRepository, AgendaItem } from '../repositories/AgendaRepository';

export class DashboardService {
  private eventRepo: EventRepository;
  private agendaRepo: AgendaRepository;

  constructor() {
    this.eventRepo = new EventRepository();
    this.agendaRepo = new AgendaRepository();
  }

  /**
   * Orquesta las consultas algorítmicas y compila el "Resumen Ejecutivo".
   */
  async generateDailySummary(): Promise<string> {
    try {
      // Consultas simultáneas para no bloquear el hilo
      const [todayEvents, pendingAgenda] = await Promise.all([
        this.eventRepo.getTodayEvents(),
        this.agendaRepo.getPendingAgenda()
      ]);

      // 1. Clasificación: Reuniones pendientes vs Actividades
      const reunionesPendientes = pendingAgenda.filter(item => item.title.toLowerCase().includes('reunión'));
      const otrasTareasAgenda = pendingAgenda.filter(item => !item.title.toLowerCase().includes('reunión'));

      // 2. Alertas algorítmicas
      const alertas: string[] = [];
      if (pendingAgenda.length > 5) {
        alertas.push('🔴 Tienes más de 5 elementos pendientes en la agenda hoy.');
      }
      if (todayEvents.length === 0 && pendingAgenda.length === 0) {
        alertas.push('🟢 Tienes el día completamente libre de actividades programadas.');
      } else if (todayEvents.some(e => e.status === 'Planificado')) {
         alertas.push('🟡 Hay eventos planificados para hoy que requieren tu atención.');
      }

      // 3. Resumen Ejecutivo (Construcción programática de texto)
      const resumenEjecutivo = `Resumen Ejecutivo: Hoy tenemos ${todayEvents.length} actividad(es) oficial(es) y ${pendingAgenda.length} tarea(s) pendiente(s). ` +
                               `${alertas.length > 0 ? 'Por favor revisa las alertas de la jornada.' : 'Todo parece marchar según lo planificado.'}`;

      // 4. Formateo Final Markdown
      let message = `🏛️ *Resumen Matutino Institucional*\n\n`;
      message += `Buenos días, Directora. Aquí tiene la situación actual de su área:\n\n`;

      // Reuniones Pendientes
      message += `🤝 *Reuniones Pendientes:*\n`;
      if (reunionesPendientes.length > 0) {
        reunionesPendientes.forEach(r => message += `• ${r.title} (Inicia: ${new Date(r.start_time).toLocaleTimeString()})\n`);
      } else {
        message += `_No hay reuniones programadas._\n`;
      }
      message += `\n`;

      // Actividades del día
      message += `📅 *Actividades del Día:*\n`;
      if (todayEvents.length > 0) {
        todayEvents.forEach(e => message += `• [${e.event_type}] ${e.title} - ${e.location || 'Sin ubicación'}\n`);
      } else {
        message += `_No hay eventos registrados para hoy._\n`;
      }
      message += `\n`;

      // Pendientes de agenda general
      message += `📋 *Pendientes de Agenda:*\n`;
      if (otrasTareasAgenda.length > 0) {
        otrasTareasAgenda.forEach(t => message += `• ${t.title}\n`);
      } else {
        message += `_Bandeja limpia._\n`;
      }
      message += `\n`;

      // Alertas
      message += `⚠️ *Alertas:*\n`;
      if (alertas.length > 0) {
        alertas.forEach(a => message += `${a}\n`);
      } else {
        message += `_No hay alertas críticas._\n`;
      }
      message += `\n`;

      // Resumen Ejecutivo
      message += `📊 *Resumen Ejecutivo:*\n_${resumenEjecutivo}_`;

      return message;
    } catch (error: any) {
      console.error('Error generando resumen diario:', error);
      return '⚠️ Ocurrió un error al intentar generar el resumen matutino. Por favor, revisa la conexión con la base de datos.';
    }
  }
}
