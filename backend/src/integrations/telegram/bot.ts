import { Telegraf, session, Scenes } from 'telegraf';
import dotenv from 'dotenv';
import { registerScene } from './scenes/registerScene';
import { attendanceScene } from './scenes/attendanceScene';
import { SessionRepository } from '../../repositories/SessionRepository';
import { logger } from '../../utils/logger';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  logger.warn('⚠️ Advertencia: TELEGRAM_BOT_TOKEN no está definido en el archivo .env');
}

export const bot = new Telegraf<Scenes.WizardContext>(token || 'dummy_token');

const stage = new Scenes.Stage<Scenes.WizardContext>([registerScene, attendanceScene]);
const sessionRepo = new SessionRepository();

const supabaseSessionStore = {
  get: async (key: string) => await sessionRepo.getSession(key),
  set: async (key: string, value: any) => await sessionRepo.saveSession(key, value),
  delete: async (key: string) => await sessionRepo.deleteSession(key)
};

bot.use(session({ store: supabaseSessionStore }));
bot.use(stage.middleware());

export const launchBot = async (app?: any) => {
  if (process.env.NODE_ENV === 'production') {
    // Modo Webhook para Producción
    const webhookDomain = process.env.WEBHOOK_DOMAIN;
    if (!webhookDomain) throw new Error('WEBHOOK_DOMAIN no está definido en .env');
    
    const webhookPath = `/telegraf/${bot.secretPathComponent()}`;
    await bot.telegram.setWebhook(`${webhookDomain}${webhookPath}`);
    
    if (app) {
      app.use(bot.webhookCallback(webhookPath));
    }
    logger.info(`🚀 Telegram Bot corriendo en Modo Webhook (Producción) en ${webhookDomain}`);
  } else {
    // Modo Polling para Desarrollo Local
    bot.launch();
    logger.info('🚀 Telegram Bot corriendo en Modo Polling (Desarrollo)');
  }
};
