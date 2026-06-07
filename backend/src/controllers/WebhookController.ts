import { Express, Request, Response } from 'express';
import { Telegraf } from 'telegraf';
import { DashboardService } from '../services/DashboardService';

export class WebhookController {
  private app: Express;
  private bot: Telegraf<any>;
  private dashboardService: DashboardService;

  constructor(app: Express, bot: Telegraf<any>) {
    this.app = app;
    this.bot = bot;
    this.dashboardService = new DashboardService();
    this.initializeRoutes();
  }

  /**
   * Obtiene el Chat ID de la Directora para notificaciones proactivas (Push).
   */
  private getChatId(req: Request): string {
    // Si n8n lo envía dinámicamente en el JSON, se prioriza. Si no, usa el del .env
    const chatId = req.body?.chat_id || process.env.DIRECTOR_CHAT_ID;
    if (!chatId) {
      throw new Error('DIRECTOR_CHAT_ID no configurado en el .env ni en el payload.');
    }
    return chatId;
  }

  private initializeRoutes() {
    /**
     * 1. Recordatorios Automáticos
     * n8n envía: { "message": "Recuerda revisar X" }
     */
    this.app.post('/api/webhooks/n8n/reminders', async (req: Request, res: Response) => {
      try {
        const chatId = this.getChatId(req);
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Falta el campo message.' });

        await this.bot.telegram.sendMessage(chatId, `⏰ *Recordatorio Automático*\n\n${message}`, { parse_mode: 'Markdown' });
        res.status(200).json({ status: 'ok', sent: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * 2. Alertas de pendientes
     * n8n envía: { "alert_text": "Quedan 3 tareas de ayer" }
     */
    this.app.post('/api/webhooks/n8n/alerts', async (req: Request, res: Response) => {
      try {
        const chatId = this.getChatId(req);
        const { alert_text } = req.body;
        if (!alert_text) return res.status(400).json({ error: 'Falta el campo alert_text.' });

        await this.bot.telegram.sendMessage(chatId, `⚠️ *Alerta de Pendientes*\n\n${alert_text}`, { parse_mode: 'Markdown' });
        res.status(200).json({ status: 'ok', sent: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * 3. Seguimiento de emprendimientos
     * n8n envía: { "project_name": "EcoApp", "status": "Inactivo por 30 días" }
     */
    this.app.post('/api/webhooks/n8n/entrepreneurships', async (req: Request, res: Response) => {
      try {
        const chatId = this.getChatId(req);
        const { project_name, status } = req.body;

        await this.bot.telegram.sendMessage(chatId, `🚀 *Seguimiento de Emprendimiento*\n\n*Proyecto:* ${project_name}\n*Estado:* ${status}`, { parse_mode: 'Markdown' });
        res.status(200).json({ status: 'ok', sent: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * 4. Avisos de reuniones
     * n8n detecta una reunión inminente y avisa.
     * n8n envía: { "meeting_title": "Junta Directiva", "time_left": "15 minutos" }
     */
    this.app.post('/api/webhooks/n8n/meetings', async (req: Request, res: Response) => {
      try {
        const chatId = this.getChatId(req);
        const { meeting_title, time_left } = req.body;

        await this.bot.telegram.sendMessage(chatId, `📅 *Aviso de Reunión Inminente*\n\nTu reunión *"${meeting_title}"* comienza en ${time_left}.`, { parse_mode: 'Markdown' });
        res.status(200).json({ status: 'ok', sent: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * 5. Informes periódicos
     * n8n hace la llamada (cron) y el backend genera el reporte para enviarlo.
     */
    this.app.post('/api/webhooks/n8n/reports', async (req: Request, res: Response) => {
      try {
        const chatId = this.getChatId(req);
        // Usar la lógica que ya tenemos para compilar un reporte
        const summary = await this.dashboardService.generateDailySummary();
        
        await this.bot.telegram.sendMessage(chatId, `📊 *Informe Periódico Automático*\n\n${summary}`, { parse_mode: 'Markdown' });
        res.status(200).json({ status: 'ok', sent: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }
}
