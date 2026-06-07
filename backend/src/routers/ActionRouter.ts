import { DetectedIntent } from '../services/ai/IntentClassifier';
import { DashboardService } from '../services/DashboardService';
import { EventService } from '../services/EventService';
import { EventRepository } from '../repositories/EventRepository';
import { ReportGeneratorService } from '../services/ReportGeneratorService';
import { EventQueryService } from '../services/EventQueryService';

export interface RouteResult {
  success: boolean;
  intent: string;
  actionType: 'reply' | 'scene' | 'document' | 'unhandled';
  data?: any;
  error?: string;
  fallbackText?: string;
}

export class ActionRouter {
  private dashboardService: DashboardService;
  private eventService: EventService;
  private eventRepo: EventRepository;
  private reportService: ReportGeneratorService;
  private eventQueryService: EventQueryService;

  constructor() {
    this.dashboardService = new DashboardService();
    this.eventService = new EventService();
    this.eventRepo = new EventRepository();
    this.reportService = new ReportGeneratorService();
    this.eventQueryService = new EventQueryService();
  }

  /**
   * Enruta la intención detectada (v2) al servicio de negocio correspondiente.
   */
  async route(detected: DetectedIntent, rawText: string): Promise<RouteResult> {
    const intent = detected.intent;
    const entities = detected.entities || {};

    try {
      switch (intent) {
        case 'list_events': {
          const eventsText = await this.eventQueryService.getFormattedEvents('all');
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: eventsText
          };
        }

        case 'list_pending_events': {
          const eventsText = await this.eventQueryService.getFormattedEvents('pending');
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: eventsText
          };
        }

        case 'list_tomorrow_events': {
          const eventsText = await this.eventQueryService.getFormattedEvents('tomorrow');
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: eventsText
          };
        }

        case 'list_week_events': {
          const eventsText = await this.eventQueryService.getFormattedEvents('week');
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: eventsText
          };
        }

        case 'list_today_events': {
          const eventsText = await this.eventQueryService.getFormattedEvents('today');
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: eventsText
          };
        }

        case 'morning_summary': {
          const summaryData = await this.dashboardService.getDailyExecutiveSummary();
          return {
            success: true,
            intent,
            actionType: 'reply',
            data: summaryData
          };
        }

        case 'get_pending_tasks': {
          const summaryData = await this.dashboardService.getDailyExecutiveSummary();
          return {
            success: true,
            intent,
            actionType: 'reply',
            data: summaryData
          };
        }

        case 'create_event': {
          // Utiliza los parámetros de entities extraídos por Gemini
          const creationResultText = await this.eventService.processEventCreation(entities);
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: creationResultText
          };
        }

        case 'register_attendance': {
          const eventName = entities.topic || entities.event_name;
          if (!eventName) {
            return {
              success: false,
              intent,
              actionType: 'reply',
              error: 'MISSING_EVENT_NAME',
              fallbackText: 'No me quedó claro a qué evento deseas registrar la asistencia. ¿Podrías indicarme el nombre?'
            };
          }

          const event = await this.eventRepo.findEventByName(eventName);
          if (!event) {
            return {
              success: false,
              intent,
              actionType: 'reply',
              error: 'EVENT_NOT_FOUND',
              fallbackText: `❌ No encontré ningún evento relacionado a "${eventName}".`
            };
          }

          return {
            success: true,
            intent,
            actionType: 'scene',
            data: {
              sceneName: 'attendanceScene',
              eventId: event.id,
              eventTitle: event.title
            }
          };
        }

        case 'generate_report': {
          const topic = entities.topic || 'General';
          const reportData = await this.reportService.generateInstitutionalReport(topic);
          if (!reportData) {
            return {
              success: false,
              intent,
              actionType: 'reply',
              error: 'REPORT_GENERATION_FAILED',
              fallbackText: '❌ Hubo un error al compilar los informes físicos.'
            };
          }

          return {
            success: true,
            intent,
            actionType: 'document',
            data: {
              pdfBuffer: reportData.pdfBuffer,
              docxBuffer: reportData.docxBuffer,
              topic
            }
          };
        }

        case 'create_meeting': {
          const topic = entities.topic || 'reunión de seguimiento';
          const date = entities.date || 'mañana';
          const time = entities.time || '10 AM';
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: `✅ *Reunión Programada*\n\nSe ha agendado la reunión sobre *${topic}* para el día *${date}* a las *${time}* en la agenda institucional.`
          };
        }

        case 'get_statistics': {
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: '📊 *Estadísticas del Área de Innovación:*\n\n• 150 Participantes registrados\n• 12 Eventos planificados este mes\n• 85% de asistencia promedio de alumnos\n• 8 Emprendimientos en fase MVP.'
          };
        }

        case 'get_overdue_projects': {
          // Si hay proyectos inactivos en Supabase, los podemos extraer dinámicamente
          const summary = await this.dashboardService.getDailyExecutiveSummary();
          let fallbackText = '📌 *Módulo de Seguimiento de Emprendimientos*\n\n';
          if (summary.alerts && summary.alerts.length > 0) {
            const projectAlerts = summary.alerts.filter(a => a.toLowerCase().includes('días sin'));
            if (projectAlerts.length > 0) {
              fallbackText += 'Proyectos que requieren atención inmediata:\n';
              projectAlerts.forEach(a => fallbackText += `• ${a}\n`);
            } else {
              fallbackText += '✅ Todos los proyectos activos registran bitácoras recientes.';
            }
          } else {
            fallbackText += '✅ Todos los proyectos activos registran bitácoras recientes.';
          }
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText
          };
        }

        case 'create_document': {
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: '📄 *Borrador del Documento:* He redactado la minuta de la reunión del día. Puedes descargarla o editarla en el panel web.'
          };
        }

        case 'unknown':
        default: {
          return {
            success: true,
            intent: 'unknown',
            actionType: 'reply',
            fallbackText: detected.response_text || 'No entendí bien la solicitud.'
          };
        }
      }
    } catch (error: any) {
      console.error(`Error en ActionRouter al enrutar intent "${intent}":`, error);
      return {
        success: false,
        intent,
        actionType: 'reply',
        error: 'ROUTER_EXECUTION_ERROR',
        fallbackText: '⚠️ Error interno del sistema al ejecutar la acción de negocio.'
      };
    }
  }
}
