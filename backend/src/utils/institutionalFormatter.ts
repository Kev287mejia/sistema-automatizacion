import { EventRecord } from '../repositories/EventRepository';
import { normalizeEvent, normalizeAudience } from './eventNormalizer';

/**
 * Utilidad centralizada de formateo institucional ejecutivo para Hermes.
 * Toda la lógica de presentación de eventos en Telegram pasa por aquí.
 * Garantiza consistencia entre EventQueryService y TelegramController.
 */

// ─────────────────────────────────────────────────────────────
// Emoji de reloj según la hora del día
// ─────────────────────────────────────────────────────────────
export function getClockEmoji(hour: number): string {
  const clocks = ['🕛','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚'];
  return clocks[hour % 12];
}

// ─────────────────────────────────────────────────────────────
// Formateo de hora en 12h con AM/PM
// ─────────────────────────────────────────────────────────────
export function formatTime(dateStr: string, userOffsetHours = -6): string {
  const utc = new Date(dateStr);
  const serverOffsetMs = utc.getTimezoneOffset() * 60000;
  const userOffsetMs = userOffsetHours * 3600000;
  const local = new Date(utc.getTime() + serverOffsetMs + userOffsetMs);

  let hours = local.getHours();
  const minutes = local.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${getClockEmoji(local.getHours())} ${hours}:${minutesStr} ${ampm}`;
}

// ─────────────────────────────────────────────────────────────
// Texto del día relativo (hoy / mañana / Lunes – etc.)
// ─────────────────────────────────────────────────────────────
export function formatRelativeDay(dateStr: string, localNow: Date, filter: string, userOffsetHours = -6): string {
  const utc = new Date(dateStr);
  const serverOffsetMs = utc.getTimezoneOffset() * 60000;
  const userOffsetMs = userOffsetHours * 3600000;
  const local = new Date(utc.getTime() + serverOffsetMs + userOffsetMs);

  const timeStr = formatTime(dateStr, userOffsetHours);

  const isSingleDay = [
    'today','hoy','tomorrow','mañana','manana',
    'domingo','lunes','martes','miércoles','miercoles','jueves','viernes','sábado','sabado'
  ].includes(filter.toLowerCase().trim());

  if (isSingleDay) return timeStr;

  const todayMidnight = new Date(localNow);
  todayMidnight.setHours(0,0,0,0);
  const evtMidnight = new Date(local);
  evtMidnight.setHours(0,0,0,0);
  const diff = Math.round((evtMidnight.getTime() - todayMidnight.getTime()) / 86400000);

  if (diff === 0) return `${timeStr.split(' ')[0]} hoy ${timeStr.split(' ').slice(1).join(' ')}`;
  if (diff === 1) return `${timeStr.split(' ')[0]} mañana ${timeStr.split(' ').slice(1).join(' ')}`;

  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  if (diff > 1 && diff < 7) return `${timeStr.split(' ')[0]} ${days[local.getDay()]} – ${timeStr.split(' ').slice(1).join(' ')}`;

  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${timeStr.split(' ')[0]} ${local.getDate()} de ${months[local.getMonth()]} – ${timeStr.split(' ').slice(1).join(' ')}`;
}

// ─────────────────────────────────────────────────────────────
// Encabezado institucional de agenda
// ─────────────────────────────────────────────────────────────
export function formatAgendaHeader(label: string): string {
  if (!label) return `📅 *Agenda Institucional*`;
  return `📅 *Agenda Institucional — ${label}*`;
}

// ─────────────────────────────────────────────────────────────
// Bloque de evento individual (formato institucional completo)
// ─────────────────────────────────────────────────────────────
export function formatEventBlock(event: EventRecord, filter: string, localNow: Date, userOffsetHours = -6): string {
  const normalized = normalizeEvent(event.title, event.event_type, event.location);
  const timeText = formatRelativeDay(event.start_date, localNow, filter, userOffsetHours);

  let block = `📘 ${normalized.title}\n`;
  block += `📍 ${normalized.location}\n`;
  block += `${timeText}\n`;

  // Audiencia objetivo (condicional)
  const audience = normalizeAudience((event as any).target_audience);
  if (audience) block += `👥 ${audience}\n`;

  // Facultad (condicional)
  const faculty = ((event as any).faculty || '').trim();
  if (faculty) block += `🏛️ ${faculty}\n`;

  return block;
}

// ─────────────────────────────────────────────────────────────
// Label legible para el filtro de fecha
// ─────────────────────────────────────────────────────────────
export function getPeriodLabel(filter: string): string {
  const f = filter.toLowerCase().trim();
  if (f === 'today' || f === 'hoy') return 'Hoy';
  if (f === 'tomorrow' || f === 'mañana' || f === 'manana') return 'Mañana';
  if (f === 'week' || f === 'semana' || f === 'esta semana') return 'esta Semana';
  if (f === 'month' || f === 'este mes' || f === 'mes') return 'este Mes';
  if (f === 'pending') return 'Pendientes';
  const weekdays = ['domingo','lunes','martes','miércoles','miercoles','jueves','viernes','sábado','sabado'];
  if (weekdays.includes(f)) return `el ${f.charAt(0).toUpperCase() + f.slice(1)}`;
  return ''; // Devuelve vacío en vez de "la Agenda"
}
