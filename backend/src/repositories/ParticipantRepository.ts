import { supabase } from '../integrations/database/supabase';

// Tipo de entidad base
export interface Participant {
  id?: string;
  telegram_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  institution_role?: 'Estudiante' | 'Profesor' | 'Administrativo' | 'Externo';
  department?: string;
  student_id?: string;
  status?: 'Activo' | 'Inactivo';
  institutional_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Repositorio Desacoplado para la entidad Participants.
 * Encapsula todo el CRUD y maneja los errores de Supabase internamente.
 */
export class ParticipantRepository {
  private readonly tableName = 'participants';

  // 1. Create (Crear)
  async create(participant: Participant): Promise<Participant> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([participant])
      .select()
      .single();

    if (error) {
      throw new Error(`Error en Base de Datos (CREATE): ${error.message}`);
    }
    return data as Participant;
  }

  // 2. Read (Leer por ID)
  async findById(id: string): Promise<Participant | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // PGRST116 = Not found en Supabase
      throw new Error(`Error en Base de Datos (READ): ${error.message}`);
    }
    return data as Participant;
  }

  // Búsqueda por Email
  async findByEmail(email: string): Promise<Participant | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error en Base de Datos (findByEmail): ${error.message}`);
    }
    return data as Participant;
  }

  // 3. Update (Actualizar)
  async update(id: string, updates: Partial<Participant>): Promise<Participant> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error en Base de Datos (UPDATE): ${error.message}`);
    }
    return data as Participant;
  }

  // 4. Delete (Eliminar o Soft Delete - aquí implementamos Hard Delete como base)
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error en Base de Datos (DELETE): ${error.message}`);
    }
  }
}
