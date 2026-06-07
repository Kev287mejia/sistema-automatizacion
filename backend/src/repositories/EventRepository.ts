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

  private async callWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
  }

  /**
   * Crea un nuevo evento en Supabase.
   */
  async createEvent(event: EventRecord): Promise<EventRecord> {
    const { data, error } = await this.callWithTimeout(
      (async () => {
        return await supabase
          .from(this.tableName)
          .insert([event])
          .select()
          .single();
      })(),
      3000
    );

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

    try {
      const { data, error } = await this.callWithTimeout(
        (async () => {
          return await supabase
            .from(this.tableName)
            .select('*')
            .gte('start_date', startOfDay.toISOString())
            .lte('start_date', endOfDay.toISOString())
            .order('start_date', { ascending: true });
        })(),
        3000
      );

      if (error) {
        throw new Error(`Error al obtener eventos de hoy: ${error.message}`);
      }

      return data as EventRecord[];
    } catch (e: any) {
      console.error('Timeout/Error en getTodayEvents de Supabase:', e);
      return [];
    }
  }

  /**
   * Busca un evento por su título (aproximación).
   */
  async findEventByName(nameFragment: string): Promise<EventRecord | null> {
    try {
      const { data, error } = await this.callWithTimeout(
        (async () => {
          return await supabase
            .from(this.tableName)
            .select('*')
            .ilike('title', `%${nameFragment}%`)
            .order('start_date', { ascending: false })
            .limit(1)
            .single();
        })(),
        3000
      );

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`Error buscando evento: ${error.message}`);
      }

      return data as EventRecord;
    } catch (e: any) {
      console.error('Timeout/Error en findEventByName de Supabase:', e);
      return null;
    }
  }

  /**
   * Obtiene eventos programados dentro de un rango de fecha específico y con filtros opcionales.
   */
  async getEventsInDateRange(startDateIso: string, endDateIso: string, statusFilter?: 'Planificado' | 'En Progreso' | 'Finalizado' | 'Cancelado'): Promise<EventRecord[]> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*')
        .gte('start_date', startDateIso)
        .lte('start_date', endDateIso);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await this.callWithTimeout(
        (async () => {
          return await query.order('start_date', { ascending: true });
        })(),
        3000
      ) as any;

      if (error) {
        throw new Error(`Error obteniendo eventos en rango: ${error.message}`);
      }

      return data as EventRecord[];
    } catch (e: any) {
      console.error('Timeout/Error en getEventsInDateRange de Supabase:', e);
      return [];
    }
  }
}

