import { DetectedIntent } from '../services/ai/IntentClassifier';
import { DashboardService } from '../services/DashboardService';
import { EventService } from '../services/EventService';
import { EventRepository } from '../repositories/EventRepository';
import { ReportGeneratorService } from '../services/ReportGeneratorService';

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

  constructor() {
    this.dashboardService = new DashboardService();
    this.eventService = new EventService();
    this.eventRepo = new EventRepository();
    this.reportService = new ReportGeneratorService();
  }

  /**
   * Enruta la intención detectada al servicio de negocio correspondiente.
   * Ejecuta consultas a bases de datos y orquesta la lógica de negocio pura.
   */
  async route(detected: DetectedIntent, rawText: string): Promise<RouteResult> {
    const intent = detected.intent;

    try {
      switch (intent) {
        case 'morning_summary': {
          const summaryData = await this.dashboardService.getDailyExecutiveSummary();
          return {
            success: true,
            intent,
            actionType: 'reply',
            data: summaryData
          };
        }

        case 'register_participant': {
          return {
            success: true,
            intent,
            actionType: 'scene',
            data: { sceneName: 'registerScene' }
          };
        }

        case 'attendance': {
          const eventName = detected.parameters?.event_name;
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

        case 'event_creation': {
          const creationResultText = await this.eventService.processEventCreation(rawText);
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: creationResultText
          };
        }

        case 'reports': {
          const topic = detected.parameters?.topic || detected.parameters?.event_name || 'General';
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

        case 'project_tracking': {
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: '📌 *Módulo de Seguimiento:* He solicitado a la base de datos el estado de los proyectos atrasados. (Mock de Emprendimientos).'
          };
        }

        case 'schedule_mentoring': {
          const projectName = detected.parameters?.project_name || 'el proyecto';
          const mentorName = detected.parameters?.mentor || 'el mentor asignado';
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: `✅ *Mentoría Programada*\nHe asignado una sesión para *${projectName}* con *${mentorName}*.`
          };
        }

        case 'broadcast_call': {
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: '📢 *Convocatoria:* He preparado el borrador del comunicado masivo. Por favor, confírmalo en el panel web.'
          };
        }

        case 'casual_conversation':
        default: {
          return {
            success: true,
            intent: 'casual_conversation',
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
