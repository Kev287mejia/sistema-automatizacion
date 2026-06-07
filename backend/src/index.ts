import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { launchBot } from './integrations/telegram/bot';
import { WebhookController } from './controllers/WebhookController';
import { TelegramController } from './controllers/TelegramController';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 1. Hardening (Seguridad Institucional)
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' })); // Restringir en producción
app.use(express.json());

// Limitador de peticiones para evitar ataques DDoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 peticiones por ventana
  message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.'
});
app.use('/api/', apiLimiter);

// 2. Inicialización de Controladores
const telegramController = new TelegramController();
telegramController.initialize();
const webhookController = new WebhookController();

// 3. Rutas de API
app.use('/api/webhooks', webhookController.getRouter());

// Rutas básicas (Healthcheck)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// 4. Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Error no manejado: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Error Interno del Servidor' });
});

// 5. Iniciar Servidor y Bot
app.listen(port, async () => {
  logger.info(`✅ Servidor Express corriendo en el puerto ${port}`);
  
  // Lanzar el bot pasándole la app de express (para Webhooks en Producción)
  await launchBot(app);
});
