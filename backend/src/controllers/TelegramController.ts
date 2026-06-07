import { Telegraf } from 'telegraf';
import { IntentClassifier, ChatMessage } from '../services/ai/IntentClassifier';
import { ActionRouter } from '../routers/ActionRouter';

export class TelegramController {
  private bot: Telegraf<any>;
  private intentClassifier: IntentClassifier;
  private actionRouter: ActionRouter;

  constructor(botInstance: Telegraf<any>) {
    this.bot = botInstance;
    this.intentClassifier = new IntentClassifier();
    this.actionRouter = new ActionRouter();
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
                             `👉 "Buenos días"\n` +
                             `👉 "Registra asistencia del taller IA"\n` +
                             `👉 "Genera un informe del mes"`;
                             
      ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Orquestador Cognitivo Desacoplado
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) return;

      await ctx.sendChatAction('typing');

      // 1. Recuperar o inicializar Historial (Ventana de 6 mensajes)
      ctx.session = ctx.session || {};
      if (!ctx.session.history) ctx.session.history = [];
      const history: ChatMessage[] = ctx.session.history;

      // 2. Detección de Intención (NLP puro con Gemini)
      const detected = await this.intentClassifier.classify(text, history);

      // Guardar el mensaje del usuario en el historial
      history.push({ role: 'user', content: text });

      // 3. Enrutamiento de la Acción (Lógica de Negocio y Base de Datos)
      const result = await this.actionRouter.route(detected, text);

      let botResponseText = '';

      // 4. Capa de Presentación (Formateo y Envío en Telegram)
      if (result.actionType === 'scene') {
        const sceneName = result.data.sceneName;
        if (sceneName === 'attendanceScene') {
          await ctx.scene.enter('attendanceScene');
          ctx.scene.session.state = {
            eventId: result.data.eventId,
            eventTitle: result.data.eventTitle
          };
          botResponseText = `Entrando a registro de asistencia para *${result.data.eventTitle}*...`;
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
        } else if (sceneName === 'registerScene') {
          ctx.scene.enter('registerScene');
          botResponseText = 'Iniciando flujo de registro de participante...';
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
        }
      } else if (result.actionType === 'document') {
        const loadingMsg = await ctx.reply('⚙️ *Generando Informe Institucional...*\nRecopilando datos y redactando. Esto tomará unos segundos.', { parse_mode: 'Markdown' });
        try {
          const { pdfBuffer, docxBuffer, topic } = result.data;
          await ctx.replyWithDocument({ source: pdfBuffer, filename: `Informe_${topic.replace(/\s+/g, '_')}.pdf` });
          await ctx.replyWithDocument({ source: docxBuffer, filename: `Informe_${topic.replace(/\s+/g, '_')}.docx` });
          botResponseText = '✅ *Informes generados exitosamente.*';
          await ctx.telegram.editMessageText(ctx.chat?.id, loadingMsg.message_id, undefined, botResponseText, { parse_mode: 'Markdown' });
        } catch (e) {
          botResponseText = '❌ Hubo un error al compilar los informes físicos.';
          await ctx.telegram.editMessageText(ctx.chat?.id, loadingMsg.message_id, undefined, botResponseText, { parse_mode: 'Markdown' });
        }
      } else {
        // actionType === 'reply'
        if (result.intent === 'morning_summary') {
          const data = result.data;
          botResponseText = `Buenos días, Directora.\n\n`;
          botResponseText += `*Resumen del día:*\n`;
          botResponseText += `* ${data.meetingsCount} reunión${data.meetingsCount !== 1 ? 'es' : ''} programada${data.meetingsCount !== 1 ? 's' : ''}\n`;
          botResponseText += `* ${data.workshopsCount} taller${data.workshopsCount !== 1 ? 'es' : ''} de innovación\n`;
          botResponseText += `* ${data.pendingTasksCount} pendiente${data.pendingTasksCount !== 1 ? 'es' : ''} institucional${data.pendingTasksCount !== 1 ? 'es' : ''}\n\n`;
          
          botResponseText += `*Alertas:*\n`;
          if (data.alerts && data.alerts.length > 0) {
            data.alerts.forEach((alert: string) => {
              botResponseText += `* ${alert}\n`;
            });
          } else {
            botResponseText += `_Sin alertas críticas hoy._\n`;
          }
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
        } else {
          // Respuestas directas conversacionales u otras intenciones
          botResponseText = result.fallbackText || 'No se pudo procesar la solicitud.';
          await ctx.reply(botResponseText, { parse_mode: 'Markdown' });
        }
      }

      // Guardar la respuesta del bot en el historial (max 6 mensajes)
      history.push({ role: 'model', content: botResponseText });
      if (history.length > 6) {
        history.shift();
      }
      ctx.session.history = history;
    });

    this.bot.catch((err: any, ctx) => {
      console.error(`Error procesando mensaje en TelegramController:`, err);
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
