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
    const callWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      let timeoutHandle: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
    };

    try {
      const { data, error } = await callWithTimeout(
        (async () => {
          return await supabase
            .from(this.tableName)
            .select('*')
            .eq('is_completed', false)
            .order('start_time', { ascending: true });
        })(),
        3000
      );

      if (error) {
        throw new Error(`Error al obtener pendientes de agenda: ${error.message}`);
      }

      return data as AgendaItem[];
    } catch (e: any) {
      console.error('Timeout/Error en getPendingAgenda de Supabase:', e);
      return [];
    }
  }
}
