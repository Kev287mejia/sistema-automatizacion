import { Scenes } from 'telegraf';
import { ParticipantService } from '../../../services/ParticipantService';

// Interfaces for our session data
interface RegisterSession extends Scenes.WizardSessionData {
  participantData: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

type MyContext = Scenes.WizardContext<RegisterSession>;

const participantService = new ParticipantService();

export const registerParticipantScene = new Scenes.WizardScene<MyContext>(
  'registerParticipant',
  async (ctx) => {
    ctx.scene.session.participantData = {};
    await ctx.reply('¡Perfecto! Vamos a registrar a un nuevo participante.\n\nPor favor, dime su *Nombre* (o escribe /cancelar para abortar).', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  async (ctx) => {
    const msg = ctx.message as any;
    if (msg && msg.text === '/cancelar') {
      await ctx.reply('Registro cancelado.');
      return ctx.scene.leave();
    }
    
    if (msg && msg.text) {
      ctx.scene.session.participantData.first_name = msg.text;
      await ctx.reply('Anotado. Ahora dime su *Apellido*.', { parse_mode: 'Markdown' });
      return ctx.wizard.next();
    }
    return ctx.reply('Por favor envíame texto.');
  },
  async (ctx) => {
    const msg = ctx.message as any;
    if (msg && msg.text === '/cancelar') {
      await ctx.reply('Registro cancelado.');
      return ctx.scene.leave();
    }

    if (msg && msg.text) {
      ctx.scene.session.participantData.last_name = msg.text;
      await ctx.reply('¡Casi listo! Por último, indícame su *Correo Electrónico*.', { parse_mode: 'Markdown' });
      return ctx.wizard.next();
    }
    return ctx.reply('Por favor envíame texto.');
  },
  async (ctx) => {
    const msg = ctx.message as any;
    if (msg && msg.text === '/cancelar') {
      await ctx.reply('Registro cancelado.');
      return ctx.scene.leave();
    }

    if (msg && msg.text) {
      ctx.scene.session.participantData.email = msg.text;
      
      const { first_name, last_name, email } = ctx.scene.session.participantData;
      
      await ctx.reply(`Guardando a ${first_name} ${last_name} (${email}) en la base de datos...`);
      
      try {
        await participantService.registerParticipant({
          first_name: first_name!,
          last_name: last_name!,
          email: email!,
          telegram_id: ctx.from?.id // Asociar el ID de Telegram si es necesario
        });
        
        await ctx.reply('✅ Participante registrado exitosamente en la memoria institucional (Supabase).');
      } catch (error: any) {
        await ctx.reply(`❌ Ocurrió un error al registrar: ${error.message}`);
      }
      
      return ctx.scene.leave();
    }
    return ctx.reply('Por favor envíame texto.');
  }
);
