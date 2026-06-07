import { Telegraf, session, Scenes } from 'telegraf';
import dotenv from 'dotenv';
import { registerScene } from './scenes/registerScene';
import { attendanceScene } from './scenes/attendanceScene';
import { studentRegistrationScene } from './scenes/studentRegistrationScene';
import { SessionRepository } from '../../repositories/SessionRepository';
import { logger } from '../../utils/logger';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  logger.warn('⚠️ Advertencia: TELEGRAM_BOT_TOKEN no está definido en el archivo .env');
}

export const bot = new Telegraf<any>(token || 'dummy_token');
bot.telegram.webhookReply = false;

const stage = new Scenes.Stage<any>([registerScene, attendanceScene, studentRegistrationScene]);
const sessionRepo = new SessionRepository();

const supabaseSessionStore = {
  get: async (key: string) => await sessionRepo.getSession(key),
  set: async (key: string, value: any) => await sessionRepo.saveSession(key, value),
  delete: async (key: string) => await sessionRepo.deleteSession(key)
};

bot.use(session({ store: supabaseSessionStore }));
bot.use(stage.middleware());

// El webhook genérico para Serverless
export const webhookPath = `/api/telegram-webhook`;

export const launchBot = async () => {
  if (process.env.NODE_ENV !== 'production') {
    bot.launch();
    logger.info('🚀 Telegram Bot corriendo en Modo Polling (Desarrollo)');
  }
};

export const setupProductionWebhook = async (domain: string) => {
  await bot.telegram.setWebhook(`${domain}${webhookPath}`);
  logger.info(`✅ Webhook configurado exitosamente apuntando a ${domain}${webhookPath}`);
};
