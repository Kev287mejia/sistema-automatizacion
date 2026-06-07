import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { bot, launchBot, setupProductionWebhook, webhookPath } from './integrations/telegram/bot';
import { WebhookController } from './controllers/WebhookController';
import { TelegramController } from './controllers/TelegramController';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas peticiones desde esta IP.'
});
app.use('/api/', apiLimiter);

// 1. Montar el Webhook pasivo para Vercel Serverless ANTES de los controladores
app.use(bot.webhookCallback(webhookPath));

// 2. Controladores
new TelegramController(bot);
new WebhookController(app, bot);

// Endpoint maestro para configurar el webhook en Producción
app.get('/api/setup-telegram', async (req: Request, res: Response) => {
  try {
    const domain = process.env.WEBHOOK_DOMAIN;
    if (!domain) return res.status(400).json({ error: 'Falta WEBHOOK_DOMAIN' });
    await setupProductionWebhook(domain);
    res.status(200).json({ message: 'Webhook anclado correctamente a Telegram', url: `${domain}${webhookPath}` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', serverless: true });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ error: 'Error Interno' });
});

// 3. Condición Serverless (Vercel no requiere app.listen)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, async () => {
    logger.info(`✅ Servidor Local en puerto ${port}`);
    await launchBot();
  });
}

// Exportación obligatoria para que Vercel atrape las peticiones HTTP
export default app;
