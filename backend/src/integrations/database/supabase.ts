import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Advertencia: Credenciales de Supabase no encontradas en el archivo .env. La conexión fallará.');
}

// Inicialización profesional del cliente de Supabase (aislado)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
