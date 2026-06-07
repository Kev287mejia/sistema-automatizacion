import { EventRepository } from '../repositories/EventRepository';
import { EventParser } from './EventParser';

export class EventService {
  private eventRepo: EventRepository;
  private parser: EventParser;

  constructor() {
    this.eventRepo = new EventRepository();
    this.parser = new EventParser();
  }

  /**
   * Intenta parsear y crear un evento a partir de un texto natural.
   */
  async processEventCreation(text: string): Promise<string> {
    const parsedData = this.parser.parseCommand(text);
    
    if (!parsedData) {
      return `❌ No logré entender la instrucción.\n\n` +
             `*Formato correcto:* \n` +
             `"Crear taller de [título] el [día] a las [hora]"\n\n` +
             `_Ejemplo: Crear taller de robótica el viernes a las 3 PM_`;
    }

    try {
      // Asumimos que los eventos duran 2 horas por defecto
      const endDate = new Date(parsedData.startDate);
      endDate.setHours(endDate.getHours() + 2);

      const newEvent = await this.eventRepo.createEvent({
        title: parsedData.title,
        event_type: parsedData.type,
        start_date: parsedData.startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'Planificado'
      });

      return `✅ *Evento Creado Exitosamente*\n\n` +
             `*Tipo:* ${parsedData.type}\n` +
             `*Título:* ${parsedData.title}\n` +
             `*Fecha y Hora:* ${parsedData.startDate.toLocaleString('es-ES')}\n\n` +
             `Se ha registrado en la base de datos institucional.`;

    } catch (error: any) {
      console.error('Error al guardar evento:', error);
      return `⚠️ Ocurrió un error al guardar el evento en Supabase.`;
    }
  }
}
