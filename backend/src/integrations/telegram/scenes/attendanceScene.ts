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
  // Paso 1: Recibir correo, buscar y registrar
  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : null;
    
    if (text?.toLowerCase() === '/cancelar') {
      await ctx.reply('Asistencia cancelada.');
      return ctx.scene.leave();
    }

    if (!text) return ctx.reply('Por favor envíame el correo electrónico del participante.');

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

      // Si existe, lo vinculamos al evento sin pedirle los 20 campos
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
        console.error('Error en asistencia:', error);
        await ctx.reply(`❌ Ocurrió un error en la base de datos.`);
      }
    }

    return ctx.scene.leave();
  }
);
