import { supabase } from '../integrations/database/supabase';

export class SessionRepository {
  /**
   * Obtiene la sesión desde Supabase. Aplica lógica de timeout (30 min).
   */
  async getSession(sessionKey: string): Promise<any | undefined> {
    const { data, error } = await supabase
      .from('telegram_sessions')
      .select('session_data, last_active')
      .eq('session_key', sessionKey)
      .single();

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
  }

  /**
   * Guarda o actualiza la sesión en Supabase.
   */
  async saveSession(sessionKey: string, sessionData: any): Promise<void> {
    const { error } = await supabase
      .from('telegram_sessions')
      .upsert({
        session_key: sessionKey,
        session_data: sessionData,
        last_active: new Date().toISOString(),
      }, { onConflict: 'session_key' });

    if (error) {
      console.error('Error guardando sesión de Telegram en Supabase:', error);
    }
  }

  /**
   * Elimina la sesión de Supabase.
   */
  async deleteSession(sessionKey: string): Promise<void> {
    await supabase
      .from('telegram_sessions')
      .delete()
      .eq('session_key', sessionKey);
  }
}
