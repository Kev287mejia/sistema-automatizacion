import { supabase } from '../integrations/database/supabase';

export interface EntrepreneurshipLog {
  created_at: string;
}

export interface EntrepreneurshipRecord {
  id: string;
  name: string;
  stage: string;
  status: string;
  created_at: string;
  updated_at: string;
  entrepreneurship_logs?: EntrepreneurshipLog[];
}

export class EntrepreneurshipRepository {
  private readonly tableName = 'entrepreneurships';

  private async callWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
  }

  /**
   * Obtiene todos los emprendimientos activos con sus bitácoras de log (creación).
   */
  async getActiveEntrepreneurships(): Promise<EntrepreneurshipRecord[]> {
    try {
      const { data, error } = await this.callWithTimeout(
        (async () => {
          return await supabase
            .from(this.tableName)
            .select(`
              id,
              name,
              stage,
              status,
              created_at,
              updated_at,
              entrepreneurship_logs (
                created_at
              )
            `)
            .eq('status', 'Activo');
        })(),
        3000
      );

      if (error) {
        throw new Error(`Error al obtener emprendimientos activos: ${error.message}`);
      }

      return data as EntrepreneurshipRecord[];
    } catch (e: any) {
      console.error('Timeout/Error en getActiveEntrepreneurships de Supabase:', e);
      return [];
    }
  }
}
