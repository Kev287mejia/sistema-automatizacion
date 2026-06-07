export interface ParsedEvent {
  type: 'Taller' | 'Conferencia' | 'Asesoría' | 'Reunión' | 'Competencia';
  title: string;
  startDate: Date;
}

export class EventParser {
  /**
   * Analiza una frase como "Crear taller de innovación digital viernes 2 PM"
   * usando expresiones regulares (sin IA).
   */
  public parseCommand(text: string): ParsedEvent | null {
    // Regex para buscar el patrón:
    // (crear|agendar) (taller|evento|reunión|conferencia|asesoría) de (.*) (lunes|martes|miércoles|jueves|viernes|sábado|domingo|hoy|mañana) (.*)
    const regex = /crear\s+(taller|evento|reuni[óo]n|conferencia|asesor[ií]a)\s+de\s+(.*?)\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo|hoy|ma[ñn]ana)\s+(\d{1,2}(?:\:\d{2})?\s*(?:AM|PM|am|pm)?)/i;
    
    const match = text.match(regex);
    if (!match) return null;

    const rawType = match[1].toLowerCase();
    const title = match[2].trim();
    const rawDay = match[3].toLowerCase();
    const rawTime = match[4].trim();

    // Normalizar Tipo
    let eventType: 'Taller' | 'Conferencia' | 'Asesoría' | 'Reunión' | 'Competencia' = 'Taller';
    if (rawType.includes('reuni')) eventType = 'Reunión';
    else if (rawType.includes('conferencia')) eventType = 'Conferencia';
    else if (rawType.includes('asesor')) eventType = 'Asesoría';

    // Calcular Fecha
    const startDate = this.calculateDate(rawDay, rawTime);

    return {
      type: eventType,
      title: title.charAt(0).toUpperCase() + title.slice(1), // Capitalize
      startDate
    };
  }

  private calculateDate(dayName: string, timeString: string): Date {
    const daysMap: { [key: string]: number } = {
      'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 'miercoles': 3,
      'jueves': 4, 'viernes': 5, 'sábado': 6, 'sabado': 6
    };

    const now = new Date();
    let targetDate = new Date(now);

    if (dayName === 'mañana' || dayName === 'manana') {
      targetDate.setDate(now.getDate() + 1);
    } else if (dayName !== 'hoy') {
      const currentDay = now.getDay();
      const targetDay = daysMap[dayName];
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7; // Próxima semana si el día ya pasó o es hoy
      targetDate.setDate(now.getDate() + diff);
    }

    // Parsear hora (ej. "2 PM", "14:00", "10 AM")
    const timeRegex = /(\d{1,2})(?:\:(\d{2}))?\s*(AM|PM|am|pm)?/i;
    const timeMatch = timeString.match(timeRegex);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);
    }

    return targetDate;
  }
}
