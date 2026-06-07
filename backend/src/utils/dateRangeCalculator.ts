/**
 * Calcula el rango de fechas en UTC para un filtro dado, respetando la zona horaria del usuario (-06:00).
 */
export function getUtcDateRangeForFilter(
  filter: string,
  userOffsetHours: number = -6
): { startUtc: Date; endUtc: Date } {
  const now = new Date();
  const serverOffsetMs = now.getTimezoneOffset() * 60000;
  const userOffsetMs = userOffsetHours * 3600000;
  
  const localNow = new Date(now.getTime() + serverOffsetMs + userOffsetMs);
  let localStart = new Date(localNow);
  let localEnd = new Date(localNow);

  const normalizedFilter = filter.toLowerCase().trim();
  const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const weekdaysNormalized = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  
  let targetDayIndex = weekdays.indexOf(normalizedFilter);
  if (targetDayIndex === -1) {
    targetDayIndex = weekdaysNormalized.indexOf(normalizedFilter);
  }

  if (normalizedFilter === 'today' || normalizedFilter === 'hoy') {
    localStart.setHours(0, 0, 0, 0);
    localEnd.setHours(23, 59, 59, 999);
  } else if (normalizedFilter === 'tomorrow' || normalizedFilter === 'mañana' || normalizedFilter === 'manana') {
    localStart.setDate(localStart.getDate() + 1);
    localStart.setHours(0, 0, 0, 0);
    
    localEnd.setDate(localEnd.getDate() + 1);
    localEnd.setHours(23, 59, 59, 999);
  } else if (normalizedFilter === 'week' || normalizedFilter === 'semana' || normalizedFilter === 'esta semana') {
    localStart.setHours(0, 0, 0, 0);
    // Próximos 7 días a partir de hoy
    localEnd.setDate(localEnd.getDate() + 7);
    localEnd.setHours(23, 59, 59, 999);
  } else if (normalizedFilter === 'month' || normalizedFilter === 'este mes' || normalizedFilter === 'mes') {
    // Desde el primer día del mes actual hasta el último día del mes actual
    localStart.setDate(1);
    localStart.setHours(0, 0, 0, 0);
    
    localEnd.setMonth(localEnd.getMonth() + 1);
    localEnd.setDate(0); // Último día del mes actual
    localEnd.setHours(23, 59, 59, 999);
  } else if (targetDayIndex !== -1) {
    // Filtrar un único día de la semana específico
    let diff = targetDayIndex - localNow.getDay();
    if (diff < 0) {
      diff += 7; // Siguiente ocurrencia del día de la semana
    }
    localStart.setDate(localStart.getDate() + diff);
    localStart.setHours(0, 0, 0, 0);
    localEnd.setDate(localEnd.getDate() + diff);
    localEnd.setHours(23, 59, 59, 999);
  } else {
    // 'all' / 'pending' / cualquier otra cosa: buscar 2 años en adelante
    localStart.setHours(0, 0, 0, 0);
    localEnd.setFullYear(localEnd.getFullYear() + 2);
  }

  const startUtc = new Date(localStart.getTime() - userOffsetMs - serverOffsetMs);
  const endUtc = new Date(localEnd.getTime() - userOffsetMs - serverOffsetMs);

  return { startUtc, endUtc };
}
