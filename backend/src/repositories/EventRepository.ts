import { supabase } from '../integrations/database/supabase';

export interface EventRecord {
  id?: string;
  title: string;
  description?: string;
  event_type: 'Taller' | 'Conferencia' | 'Asesoría' | 'Reunión' | 'Competencia';
  start_date: string;
  end_date: string;
  location?: string;
  status?: 'Planificado' | 'En Progreso' | 'Finalizado' | 'Cancelado';
}

export class EventRepository {
  private readonly tableName = 'events';

  /**
   * Crea un nuevo evento en Supabase.
   */
  async createEvent(event: EventRecord): Promise<EventRecord> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([event])
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear evento: ${error.message}`);
    }

    return data as EventRecord;
  }

  /**
   * Obtiene todos los eventos programados para el día actual.
   */
  async getTodayEvents(): Promise<EventRecord[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('start_date', startOfDay.toISOString())
      .lte('start_date', endOfDay.toISOString())
      .order('start_date', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener eventos de hoy: ${error.message}`);
    }

    return data as EventRecord[];
  }

  /**
   * Busca un evento por su título (aproximación).
   */
  async findEventByName(nameFragment: string): Promise<EventRecord | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .ilike('title', `%${nameFragment}%`)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error buscando evento: ${error.message}`);
    }

    return data as EventRecord;
  }
}

