import { Scenes } from 'telegraf';
import { ParticipantRepository } from '../../../repositories/ParticipantRepository';

// Definición de los datos temporales en sesión
interface RegisterSession extends Scenes.WizardSessionData {
  state: {
    fullName?: string;
    gender?: string;
    municipality?: string;
    career?: string;
    faculty?: string;
    phone?: string;
  };
}

type RegisterContext = Scenes.WizardContext<RegisterSession>;

const participantRepo = new ParticipantRepository();

// Función de ayuda para validar que el mensaje es texto
const getText = (ctx: any): string | null => {
  if (ctx.message && 'text' in ctx.message) {
    if (ctx.message.text.toLowerCase() === '/cancelar') {
      return 'CANCEL';
    }
    return ctx.message.text.trim();
  }
  return null;
};

export const registerScene = new Scenes.WizardScene<RegisterContext>(
  'registerScene',
  // Paso 1: Pedir Nombre
  async (ctx) => {
    ctx.scene.session.state = {};
    await ctx.reply('📋 *Registro de Participante*\n\nComencemos. ¿Cuál es el *nombre completo*? \n_(Puedes escribir /cancelar en cualquier momento)_', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  // Paso 2: Recibir Nombre, Pedir Sexo
  async (ctx) => {
    const text = getText(ctx);
    if (text === 'CANCEL') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return ctx.reply('Por favor envíame texto.');

    ctx.scene.session.state.fullName = text;
    await ctx.reply('Anotado. ¿Cuál es el *sexo* del participante?', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  // Paso 3: Recibir Sexo, Pedir Municipio
  async (ctx) => {
    const text = getText(ctx);
    if (text === 'CANCEL') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return ctx.reply('Por favor envíame texto.');

    ctx.scene.session.state.gender = text;
    await ctx.reply('Bien. ¿En qué *municipio* reside?', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  // Paso 4: Recibir Municipio, Pedir Carrera
  async (ctx) => {
    const text = getText(ctx);
    if (text === 'CANCEL') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return ctx.reply('Por favor envíame texto.');

    ctx.scene.session.state.municipality = text;
    await ctx.reply('Entendido. ¿Cuál es su *carrera*?', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  // Paso 5: Recibir Carrera, Pedir Facultad
  async (ctx) => {
    const text = getText(ctx);
    if (text === 'CANCEL') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return ctx.reply('Por favor envíame texto.');

    ctx.scene.session.state.career = text;
    await ctx.reply('¿A qué *facultad* pertenece?', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  // Paso 6: Recibir Facultad, Pedir Teléfono
  async (ctx) => {
    const text = getText(ctx);
    if (text === 'CANCEL') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return ctx.reply('Por favor envíame texto.');

    ctx.scene.session.state.faculty = text;
    await ctx.reply('Ya casi terminamos. Por favor, indícame su *teléfono*.', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  // Paso 7: Recibir Teléfono y Guardar en BD
  async (ctx) => {
    const text = getText(ctx);
    if (text === 'CANCEL') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return ctx.reply('Por favor envíame texto.');

    ctx.scene.session.state.phone = text;
    const data = ctx.scene.session.state;

    await ctx.reply('⏳ Procesando y guardando registro en el sistema institucional...');

    try {
      // Como el nombre viene completo, lo pondremos en first_name y dejaremos last_name vacío por simplicidad
      const nameParts = data.fullName!.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '.';

      // Generar email temporal único para no romper la restricción NOT NULL UNIQUE de SQL
      const tempEmail = `temp_${Date.now()}@institucion.edu`;

      await participantRepo.create({
        first_name: firstName,
        last_name: lastName,
        email: tempEmail,
        phone_number: data.phone,
        telegram_id: ctx.from?.id,
        // Los campos dinámicos van al JSONB
        institutional_data: {
          sexo: data.gender,
          municipio: data.municipality,
          carrera: data.career,
          facultad: data.faculty
        }
      });

      await ctx.reply('✅ *Participante guardado exitosamente en Supabase.*\n\nTodos los datos institucionales fueron vinculados correctamente.', { parse_mode: 'Markdown' });
    } catch (error: any) {
      await ctx.reply(`❌ Ocurrió un error en la base de datos:\n${error.message}`);
    }

    return ctx.scene.leave();
  }
);
