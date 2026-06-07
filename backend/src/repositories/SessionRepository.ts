import { supabase } from '../integrations/database/supabase';

export class SessionRepository {
  /**
   * Obtiene la sesión desde Supabase. Aplica lógica de timeout (30 min).
   */
  async getSession(sessionKey: string): Promise<any | undefined> {
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
            .from('telegram_sessions')
            .select('session_data, last_active')
            .eq('session_key', sessionKey)
            .single();
        })(),
        3000
      );

      if (error || !data) return undefined;

      // Timeout Lógica (30 minutos)
      const lastActive = new Date(data.last_active).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - lastActive) / (1000 * 60);

      if (diffMinutes > 30) {
        // Expirado: Retornamos undefined para que Telegraf limpie la sesión
        await this.deleteSession(sessionKey);
        return undefined;
      }

      return data.session_data;
    } catch (e) {
      console.error('Error en getSession de Supabase con timeout:', e);
      return undefined;
    }
  }

  /**
   * Guarda o actualiza la sesión en Supabase.
   */
  async saveSession(sessionKey: string, sessionData: any): Promise<void> {
    const callWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      let timeoutHandle: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
    };

    try {
      const { error } = await callWithTimeout(
        (async () => {
          return await supabase
            .from('telegram_sessions')
            .upsert({
              session_key: sessionKey,
              session_data: sessionData,
              last_active: new Date().toISOString(),
            }, { onConflict: 'session_key' });
        })(),
        3000
      );

      if (error) {
        console.error('Error guardando sesión de Telegram en Supabase:', error);
      }
    } catch (e) {
      console.error('Error en saveSession de Supabase con timeout:', e);
    }
  }

  /**
   * Elimina la sesión de Supabase.
   */
  async deleteSession(sessionKey: string): Promise<void> {
    try {
      await supabase
        .from('telegram_sessions')
        .delete()
        .eq('session_key', sessionKey);
    } catch (e) {
      console.error('Error en deleteSession:', e);
    }
  }
}
