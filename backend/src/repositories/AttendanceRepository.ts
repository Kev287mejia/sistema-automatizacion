import { supabase } from '../integrations/database/supabase';

export interface AttendanceRecord {
  id?: string;
  participant_id: string;
  event_id: string;
  status?: 'Presente' | 'Ausente' | 'Justificado' | 'Tardanza';
  check_in_time?: string;
}

export class AttendanceRepository {
  private readonly tableName = 'attendances';

  /**
   * Crea un registro de asistencia en la base de datos.
   */
  async recordAttendance(attendance: AttendanceRecord): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([attendance])
      .select()
      .single();

    if (error) {
      // Manejo de error por llave única (evitar doble registro)
      if (error.code === '23505') {
         throw new Error('DUPLICATE_ATTENDANCE');
      }
      throw new Error(`Error al registrar asistencia: ${error.message}`);
    }

    return data as AttendanceRecord;
  }
}
