import { Scenes, Markup } from 'telegraf';
import { supabase } from '../../database/supabase';
import { AcademicInferenceEngine } from '../../../services/AcademicInferenceEngine';

interface StudentRegSession extends Scenes.WizardSessionData {
  state: {
    eventId?: string;
    eventTitle?: string;
    studentData: {
      fullName?: string;
      idNumber?: string;
      gender?: string;
      career?: string;
      municipality?: string;
    };
  };
}

type StudentRegContext = Scenes.WizardContext<StudentRegSession>;

export const studentRegistrationScene = new Scenes.WizardScene<StudentRegContext>(
  'studentRegistrationScene',

  // Paso 1: Pedir Nombre
  async (ctx) => {
    ctx.scene.session.state.studentData = {};
    const title = ctx.scene.session.state.eventTitle || 'el evento';
    await ctx.reply(`📝 *Formulario Institucional de Inscripción*\n\nEstás iniciando tu registro para: *${title}*.\n\nPara comenzar, por favor escribe tu *Nombre Completo*:`, { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },

  // Paso 2: Recibir Nombre y pedir Cédula/Carnet
  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : null;
    if (text?.toLowerCase() === '/cancelar') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return;

    ctx.scene.session.state.studentData.fullName = text;
    await ctx.reply(`Gracias, ${text.split(' ')[0]}. Ahora, por favor ingresa tu *Número de Carnet o Cédula*:`, { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },

  // Paso 3: Recibir Cédula y pedir Sexo
  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : null;
    if (text?.toLowerCase() === '/cancelar') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return;

    ctx.scene.session.state.studentData.idNumber = text;
    await ctx.reply('Selecciona tu *Sexo biológico* para el registro estadístico oficial:', 
      Markup.keyboard([['Masculino', 'Femenino']]).oneTime().resize()
    );
    return ctx.wizard.next();
  },

  // Paso 4: Recibir Sexo y pedir Carrera
  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : null;
    if (text?.toLowerCase() === '/cancelar') { await ctx.reply('Registro cancelado.', Markup.removeKeyboard()); return ctx.scene.leave(); }
    if (!text) return;

    ctx.scene.session.state.studentData.gender = text;
    await ctx.reply('Excelente. ¿Qué *Carrera Universitaria* estudias? (Ej: Ingeniería en Sistemas)', { ...Markup.removeKeyboard(), parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },

  // Paso 5: Recibir Carrera y pedir Municipio
  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : null;
    if (text?.toLowerCase() === '/cancelar') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return;

    ctx.scene.session.state.studentData.career = text;
    await ctx.reply('Finalmente, ¿de qué *Municipio* provienes? (Ej: Bluefields, Laguna de Perlas, etc.)', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },

  // Paso 6: Recibir Municipio, inferir datos y guardar en BD
  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : null;
    if (text?.toLowerCase() === '/cancelar') { await ctx.reply('Registro cancelado.'); return ctx.scene.leave(); }
    if (!text) return;

    ctx.scene.session.state.studentData.municipality = text;
    const data = ctx.scene.session.state.studentData;
    const telegramId = ctx.chat?.id;

    await ctx.reply('⚙️ Procesando tu registro institucional y autocompletando datos académicos...');

    try {
      // 1. Inferencia Académica (Nivel 2)
      const inferred = AcademicInferenceEngine.inferAcademicData(data.career!);

      // 2. Guardar en students_profiles (Upsert por telegram_id)
      const { data: student, error: studentError } = await supabase
        .from('students_profiles')
        .upsert({
          telegram_id: telegramId,
          full_name: data.fullName,
          id_number: data.idNumber,
          gender: data.gender,
          career: data.career,
          municipality: data.municipality,
          faculty: inferred.faculty,
          modality: inferred.modality,
          shift: inferred.shift
        }, { onConflict: 'telegram_id' })
        .select()
        .single();

      if (studentError) throw studentError;

      // 3. Registrar asistencia en event_registrations
      if (ctx.scene.session.state.eventId) {
        const { error: regError } = await supabase
          .from('event_registrations')
          .insert({
            event_id: ctx.scene.session.state.eventId,
            student_id: student.id,
            attendance_status: 'Inscrito'
          });

        if (regError && regError.code !== '23505') throw regError; // Ignorar duplicate key (ya inscrito)
      }

      await ctx.reply(`✅ *Inscripción Exitosa*\n\nEstudiante: ${data.fullName}\nCarrera: ${data.career}\nFacultad Inferida: ${inferred.faculty}\n\nTu expediente ha sido registrado y fuiste añadido a la lista del evento de forma automática.`, { parse_mode: 'Markdown' });

    } catch (e: any) {
      console.error('Error registrando estudiante:', e);
      await ctx.reply('❌ Lo siento, ocurrió un error interno al intentar guardar tu registro en la base de datos.');
    }

    return ctx.scene.leave();
  }
);
