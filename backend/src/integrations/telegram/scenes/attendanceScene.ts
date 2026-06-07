import { Scenes } from 'telegraf';
import { ParticipantRepository } from '../../../repositories/ParticipantRepository';
import { AttendanceRepository } from '../../../repositories/AttendanceRepository';

interface AttendanceSession extends Scenes.WizardSessionData {
  state: {
    eventId?: string;
    eventTitle?: string;
  };
}

type AttendanceContext = Scenes.WizardContext<AttendanceSession>;

const participantRepo = new ParticipantRepository();
const attendanceRepo = new AttendanceRepository();

export const attendanceScene = new Scenes.WizardScene<AttendanceContext>(
  'attendanceScene',
  
  // Paso 1: Pedir el correo (se ejecuta al entrar a la escena)
  async (ctx) => {
    await ctx.reply(`📋 *Registro de Asistencia*\n\nEvento: *${ctx.scene.session.state.eventTitle || 'Seleccionado'}*\n\nPor favor, envíame el *correo electrónico* del participante para registrar su asistencia:`, { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },

  // Paso 2: Recibir correo, buscar en BD y registrar asistencia
  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : null;
    
    if (text?.toLowerCase() === '/cancelar') {
      await ctx.reply('Asistencia cancelada.');
      return ctx.scene.leave();
    }

    if (!text) {
      await ctx.reply('Por favor envíame el correo electrónico del participante o escribe /cancelar para salir.');
      return; // Permanece en el mismo paso esperando una entrada válida
    }

    const email = text.toLowerCase();
    const eventId = ctx.scene.session.state.eventId;
    const eventTitle = ctx.scene.session.state.eventTitle;

    await ctx.reply(`Buscando a ${email} en la base de datos institucional...`);

    try {
      const participant = await participantRepo.findByEmail(email);

      if (!participant) {
        await ctx.reply(`❌ *Participante NO encontrado.*\n\nEsa dirección de correo (${email}) no existe en nuestra base de datos.\nSi es nuevo, por favor usa el comando \`registrar participante\`.`, { parse_mode: 'Markdown' });
        return ctx.scene.leave();
      }

      // Registrar asistencia en base de datos
      await attendanceRepo.recordAttendance({
        participant_id: participant.id!,
        event_id: eventId!,
        status: 'Presente'
      });

      await ctx.reply(`✅ *Asistencia Registrada*\n\nParticipante: ${participant.first_name} ${participant.last_name}\nEvento: ${eventTitle}\n\n_Dato institucional validado correctamente._`, { parse_mode: 'Markdown' });

    } catch (error: any) {
      if (error.message === 'DUPLICATE_ATTENDANCE') {
        await ctx.reply(`⚠️ *Registro Duplicado*\n\nEste participante ya tiene marcada su asistencia para este evento.`, { parse_mode: 'Markdown' });
      } else {
        console.error('Error en escena de asistencia:', error);
        await ctx.reply(`❌ Ocurrió un error en la base de datos.`);
      }
    }

    return ctx.scene.leave();
  }
);
