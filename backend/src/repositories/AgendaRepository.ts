import { supabase } from '../integrations/database/supabase';

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_completed: boolean;
}

export class AgendaRepository {
  private readonly tableName = 'director_agenda';

  /**
   * Obtiene todas las tareas o reuniones de la agenda pendientes.
   */
  async getPendingAgenda(): Promise<AgendaItem[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('is_completed', false)
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener pendientes de agenda: ${error.message}`);
    }

    return data as AgendaItem[];
  }
}
