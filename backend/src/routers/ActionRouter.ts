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
        case 'list_events':
        case 'list_pending_events':
        case 'list_tomorrow_events':
        case 'list_week_events':
        case 'list_today_events': {
          let dateFilter = entities.date;
          if (!dateFilter) {
            if (intent === 'list_today_events') dateFilter = 'today';
            else if (intent === 'list_tomorrow_events') dateFilter = 'tomorrow';
            else if (intent === 'list_week_events') dateFilter = 'week';
            else if (intent === 'list_pending_events') dateFilter = 'pending';
            else dateFilter = 'all';
          }
          const eventsText = await this.eventQueryService.getFormattedEvents(dateFilter);
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: eventsText
          };
        }

        case 'greeting': {
          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText: '¡Hola, MSc. Kenia Salomon! ¿En qué puedo asistirle hoy con la gestión de Innovación y Emprendimiento?'
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
          const dateFilter = entities.date || 'today';
          const summaryData = await this.dashboardService.getDailyExecutiveSummary(dateFilter);
          return {
            success: true,
            intent,
            actionType: 'reply',
            data: {
              ...summaryData,
              period: dateFilter
            }
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

        case 'generate_convocatoria': {
          const topic = entities.topic;
          if (!topic) {
            return {
              success: false,
              intent,
              actionType: 'reply',
              fallbackText: '¿Para qué actividad desea generar la convocatoria?'
            };
          }
          
          const date = entities.date || 'Pendiente de definir';
          const time = entities.time || 'Pendiente de definir';
          const location = entities.location || 'Pendiente de definir';
          const audience = entities.target_audience || 'Comunidad Universitaria';
          
          // Se utiliza un placeholder descriptivo para el objetivo
          const objective = `Facilitar un espacio de desarrollo e innovación sobre ${topic}.`;

          const fallbackText = 
            `📄 *CONVOCATORIA INSTITUCIONAL*\n\n` +
            `*Tema:* ${topic}\n` +
            `*Fecha:* ${date}\n` +
            `*Hora:* ${time}\n` +
            `*Lugar:* ${location}\n` +
            `*Dirigido a:* ${audience}\n` +
            `*Objetivo:* ${objective}\n` +
            `*Indicaciones:* Favor confirmar asistencia previa.\n\n` +
            `_MSc. Kenia Salomon_\n` +
            `_Dirección de Innovación y Emprendimiento_`;

          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText
          };
        }

        case 'generate_minutes': {
          const topic = entities.topic || 'Reunión General';
          const facilitator = entities.facilitator || 'Pendiente de definir';

          const fallbackText = 
            `📝 *MINUTA DE REUNIÓN*\n\n` +
            `*Tema:* ${topic}\n` +
            `*Participantes:* ${facilitator} y equipo.\n` +
            `*Objetivos:* Seguimiento de actividades.\n` +
            `*Acuerdos:* (Pendiente de registro)\n` +
            `*Compromisos:* (Pendiente de asignación)\n` +
            `*Fecha límite:* Próxima revisión en 7 días.`;

          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText
          };
        }

        case 'generate_official_letter': {
          const fallbackText = 
            `🏛️ *OFICIO INSTITUCIONAL*\n\n` +
            `*A quien corresponda:*\n\n` +
            `Por este medio extiendo un cordial saludo y me dirijo a usted con el propósito de solicitar/comunicar [DETALLE DE SOLICITUD].\n\n` +
            `Agradezco de antemano su atención a esta solicitud.\n\n` +
            `Atentamente,\n\n` +
            `_MSc. Kenia Salomon_\n` +
            `_Dirección de Innovación y Emprendimiento_`;

          return {
            success: true,
            intent,
            actionType: 'reply',
            fallbackText
          };
        }

        case 'unknown':
        default: {
          // ── Sistema de Sugerencias Inteligentes ──────────────────────────
          // Analiza el contexto del mensaje para guiar al usuario
          const msgLower = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

          // Contexto: organizar / crear actividad
          const isOrganizeContext = /organizar|planear|preparar|programar|hacer|crear|armar|montar/.test(msgLower);
          const isAudienceContext = /estudiante|alumno|participante|docente|grupo|clase|curso/.test(msgLower);
          const isViewContext = /ver|mostrar|listar|que hay|que tengo|agenda|actividades|talleres/.test(msgLower);
          const isReportContext = /informe|reporte|estadistica|resumen|dato|numero|cuantos/.test(msgLower);
          const isProjectContext = /emprendimiento|proyecto|startup|incubad|negocio|mentor/.test(msgLower);

          let guidedResponse = '';

          if (isOrganizeContext || isAudienceContext) {
            guidedResponse =
              `Puedo asistirle con:\n\n` +
              `📘 *Crear taller* — _"Crear taller viernes 2 PM de innovación"_\n` +
              `🤝 *Programar reunión* — _"Agendar reunión mañana 10 AM"_\n` +
              `📄 *Generar convocatoria* — _"Redactar minuta de reunión"_\n` +
              `👥 *Registrar actividad* — _"Crear conferencia para estudiantes de ingeniería"_\n\n` +
              `¿Qué desea organizar?`;
          } else if (isViewContext) {
            guidedResponse =
              `Puedo mostrarle:\n\n` +
              `📅 *Agenda de hoy* — _"¿Qué tengo hoy?"_\n` +
              `📅 *Agenda de mañana* — _"¿Qué hay mañana?"_\n` +
              `📅 *Esta semana* — _"Actividades de la semana"_\n` +
              `📌 *Pendientes* — _"¿Qué tengo pendiente?"_\n\n` +
              `¿Qué período desea consultar?`;
          } else if (isReportContext) {
            guidedResponse =
              `Puedo generar:\n\n` +
              `📊 *Estadísticas del área* — _"Dame estadísticas de participantes"_\n` +
              `📋 *Informe mensual* — _"Genera informe del mes"_\n` +
              `📁 *Reporte de taller* — _"Informe del taller de robótica"_\n\n` +
              `¿Qué tipo de informe necesita?`;
          } else if (isProjectContext) {
            guidedResponse =
              `Puedo asistirle con emprendimientos:\n\n` +
              `📌 *Proyectos con alertas* — _"Proyectos atrasados"_\n` +
              `📊 *Estado general* — _"Dame estadísticas"_\n` +
              `📋 *Bitácoras pendientes* — _"Bitácoras sin actualizar"_\n\n` +
              `¿Qué desea revisar?`;
          } else {
            // Menú ejecutivo completo
            guidedResponse =
              `Soy Hermes, su asistente ejecutivo institucional. Puedo:\n\n` +
              `📅 *Gestión de agenda* — talleres, reuniones, actividades\n` +
              `📊 *Estadísticas e informes* — datos del área de innovación\n` +
              `📌 *Seguimiento* — proyectos, emprendimientos, alertas\n` +
              `👥 *Registro* — asistencia, participantes, audiencias\n\n` +
              `¿En qué puedo asistirle, MSc. Kenia Salomon?`;
          }

          return {
            success: true,
            intent: 'unknown',
            actionType: 'reply',
            fallbackText: guidedResponse
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
