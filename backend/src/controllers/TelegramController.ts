import { Telegraf } from 'telegraf';
import { DashboardService } from '../services/DashboardService';
import { EventService } from '../services/EventService';
import { EventRepository } from '../repositories/EventRepository';
// Importar ChatMessage desde IntentService
import { IntentService, ChatMessage } from '../services/IntentService';
import { AIAnalysisService } from '../services/AIAnalysisService';

// Extender la sesión de Telegraf para incluir el historial
interface CustomSession {
  history?: ChatMessage[];
}

export class TelegramController {
  private bot: Telegraf<any>;
  private dashboardService: DashboardService;
  private eventService: EventService;
  private eventRepo: EventRepository;
  private intentService: IntentService;
  private aiAnalysisService: AIAnalysisService;

  constructor(botInstance: Telegraf<any>) {
    this.bot = botInstance;
    this.dashboardService = new DashboardService();
    this.eventService = new EventService();
    this.eventRepo = new EventRepository();
    this.intentService = new IntentService();
    this.aiAnalysisService = new AIAnalysisService();
    this.initializeRoutes();
  }

  public initializeRoutes() {
    this.bot.start((ctx) => {
      // Inicializar historial
      ctx.session = ctx.session || {};
      ctx.session.history = [];
      const welcomeMessage = `🏛️ *Hermes Nivel Ejecutivo Activado*\n\n` +
                             `Soy su asistente cognitivo. Puede hablarme de forma natural.\n\n` +
                             `_Ejemplos:_\n` +
                             `👉 "¿Qué tengo pendiente?"\n` +
                             `👉 "Registra asistencia del taller IA"\n` +
                             `👉 "Genera un informe del mes"`;
                             
      ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Orquestador Cognitivo
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) return;

      await ctx.sendChatAction('typing');

      // 1. Recuperar o inicializar Historial (Ventana deslizante de 6 mensajes)
      ctx.session = ctx.session || {};
      if (!ctx.session.history) ctx.session.history = [];
      const history: ChatMessage[] = ctx.session.history;

      // 2. Clasificación Cognitiva (pasando el historial)
      const analysis = await this.intentService.processMessage(text, history);

      // Guardar el mensaje del usuario en el historial
      history.push({ role: 'user', content: text });

      let botResponseText = '';

      // 3. Router Ejecutivo
      switch (analysis.intent) {
        case 'REGISTER_PARTICIPANT':
          ctx.scene.enter('registerScene');
          botResponseText = 'Iniciando flujo de registro de participante...';
          break;

        case 'ATTENDANCE':
          const eventName = analysis.parameters?.event_name;
          if (!eventName) {
            botResponseText = 'No me quedó claro a qué evento deseas registrar la asistencia. ¿Podrías indicarme el nombre?';
            await ctx.reply(botResponseText);
          } else {
            try {
              const event = await this.eventRepo.findEventByName(eventName);
              if (!event) {
                botResponseText = `❌ No encontré ningún evento relacionado a "${eventName}".`;
                await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
              } else {
                ctx.scene.session.state.eventId = event.id;
                ctx.scene.session.state.eventTitle = event.title;
                ctx.scene.enter('attendanceScene');
                botResponseText = `Entrando a registro de asistencia para ${event.title}...`;
              }
            } catch (error) {
              botResponseText = '⚠️ Error buscando el evento.';
              await ctx.reply(botResponseText);
            }
          }
          break;

        case 'EVENT_CREATION':
          // Pasamos el texto directo para que el regex / lógica de creación lo atrape
          // (Si quisiéramos, podríamos pasar los parámetros directos, pero reusamos el parser).
          botResponseText = await this.eventService.processEventCreation(text);
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
          break;

        case 'SUMMARY_AND_AGENDA':
          botResponseText = await this.dashboardService.generateDailySummary();
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
          break;

        case 'REPORTS':
          botResponseText = '⚙️ *Generando Informe Institucional...*\nRecopilando datos y redactando. Esto tomará unos segundos.';
          const loadingMsg = await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
          
          try {
            const topic = analysis.parameters?.topic || analysis.parameters?.event_name || 'General';
            const { ReportGeneratorService } = require('../services/ReportGeneratorService');
            const reportService = new ReportGeneratorService();
            const reportData = await reportService.generateInstitutionalReport(topic);
            
            if (reportData) {
              await ctx.replyWithDocument({ source: reportData.pdfBuffer, filename: `Informe_${topic.replace(/\s+/g, '_')}.pdf` });
              await ctx.replyWithDocument({ source: reportData.docxBuffer, filename: `Informe_${topic.replace(/\s+/g, '_')}.docx` });
              botResponseText = '✅ *Informes generados exitosamente.*';
              await ctx.telegram.editMessageText(ctx.chat?.id, loadingMsg.message_id, undefined, botResponseText, { parse_mode: 'Markdown' });
            }
          } catch (e) {
            botResponseText = '❌ Hubo un error al compilar los informes físicos.';
            await ctx.telegram.editMessageText(ctx.chat?.id, loadingMsg.message_id, undefined, botResponseText, { parse_mode: 'Markdown' });
          }
          break;

        case 'PROJECT_TRACKING':
          botResponseText = '📌 *Módulo de Seguimiento:* He solicitado a la base de datos el estado de los proyectos atrasados. (Mock de Emprendimientos).';
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
          break;

        case 'SCHEDULE_MENTORING':
          botResponseText = `✅ *Mentoría Programada*\nHe asignado una sesión para *${analysis.parameters?.project_name || 'el proyecto'}* con *${analysis.parameters?.mentor || 'el mentor asignado'}*.`;
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
          break;

        case 'BROADCAST_CALL':
          botResponseText = '📢 *Convocatoria:* He preparado el borrador del comunicado masivo. Por favor, confírmalo en el panel web.';
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
          break;

        case 'UNKNOWN_OR_CASUAL':
        default:
          botResponseText = analysis.response_text || 'No entendí bien la solicitud.';
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
          break;
      }

      // Guardar la respuesta del bot en el historial (max 6 mensajes)
      history.push({ role: 'model', content: botResponseText });
      if (history.length > 6) {
        history.shift();
      }
      ctx.session.history = history;
    });

    this.bot.catch((err: any, ctx) => {
      console.error(`Error procesando mensaje:`, err);
      if (err.cause) {
        console.error(`Telegram bot catch cause:`, err.cause);
      }
      ctx.reply('⚠️ Error interno del sistema conversacional.').catch((e: any) => {
        console.error('Failed to send error reply to Telegram:', e);
      });
    });
  }

  public launch() {
    this.bot.launch();
    console.log('🤖 Hermes (Cerebro IA Desacoplado) iniciado.');
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}
