/**
 * Capitaliza cada palabra excepto artículos/preposiciones menores en español.
 * Las palabras en ALL-CAPS (siglas como BICU, IA) se preservan intactas.
 */
export function toTitleCase(str: string): string {
  const minors = new Set(['de','del','la','las','el','los','a','y','o','en','por','con','sin','para']);
  const acronyms = new Set(['bicu', 'ia', 'mvp', 'tic', 'ux', 'ui']);
  return str
    .split(' ')
    .map((word, i) => {
      if (!word) return word;
      // Preservar/forzar siglas institucionales
      if (acronyms.has(word.toLowerCase())) return word.toUpperCase();
      // Si ya está en mayúsculas completamente, preservarlo
      if (word === word.toUpperCase() && word.length > 1 && /^[A-Z]+$/.test(word)) return word;
      // Primera palabra siempre capitalizada
      if (i === 0) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      // Artículos y preposiciones menores en minúsculas
      if (minors.has(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Normaliza y sanitiza los campos de un evento para evitar duplicados del tipo
 * en el título, limpiar valores "null"/"undefined", y garantizar que siempre
 * existan datos válidos.
 */
export function normalizeEvent(
  title: string | undefined | null,
  eventType: string | undefined | null,
  location: string | undefined | null
) {
  const type = (eventType || 'Taller').trim();
  let cleanTitle = (title || '').trim();
  
  // 1. Verificación inicial de valores nulos o vacíos
  let titleLower = cleanTitle.toLowerCase();
  if (!cleanTitle || titleLower === 'null' || titleLower === 'undefined' || titleLower === 'nulo') {
    cleanTitle = type === 'Taller' ? 'Innovación y Emprendimiento' : 'Institucional';
  }

  // 2. Eliminar prefijos duplicados (ej: "Taller de " o "Taller ") al inicio del título
  const escapedType = type.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const prefixRegex = new RegExp(`^${escapedType}(?:\\s+de\\s+|\\s+)?`, 'i');
  
  let prevTitle: string;
  do {
    prevTitle = cleanTitle;
    cleanTitle = cleanTitle.replace(prefixRegex, '').trim();
  } while (cleanTitle !== prevTitle);

  // 3. Verificación posterior por si al limpiar quedó vacío o con valores nulos
  titleLower = cleanTitle.toLowerCase();
  if (!cleanTitle || titleLower === 'null' || titleLower === 'undefined' || titleLower === 'nulo') {
    cleanTitle = type === 'Taller' ? 'Innovación y Emprendimiento' : 'Institucional';
  }

  // Capitalizar la primera letra
  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  // 4. Normalizar la ubicación
  let cleanLocation = (location || '').trim();
  const locLower = cleanLocation.toLowerCase();
  if (!cleanLocation || locLower === 'null' || locLower === 'undefined' || locLower === 'nulo') {
    cleanLocation = 'Ubicación pendiente de definir';
  } else {
    // Aplicar Title Case institucional (preserva siglas como BICU, IA)
    cleanLocation = toTitleCase(cleanLocation);
  }

  return {
    title: cleanTitle,
    location: cleanLocation,
    type
  };
}

/**
 * Retorna el título canónico para detectar duplicaciones semánticas (ej: "Introducción IA" vs "Introducción a la IA").
 */
export function getCanonicalTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(de|la|el|a|y|o|en|para|con|las|los|un|una|unos|unas)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza la descripción de audiencia a un formato institucional canónico.
 * Mapea variantes lingüísticas a etiquetas estandarizadas.
 */
export function normalizeAudience(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;

  const input = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // ── Combinaciones específicas año + carrera (deben evaluarse ANTES que los genéricos) ──
  if (/primer.*sistemas|sistemas.*1|1[er°]?\s*ano.*sistemas/.test(input)) return '1er Año de Ingeniería en Sistemas';
  if (/segundo.*sistemas|sistemas.*2|2[do°]?\s*ano.*sistemas/.test(input)) return '2do Año de Ingeniería en Sistemas';
  if (/tercer.*sistemas|sistemas.*3|3[er°]?\s*ano.*sistemas/.test(input)) return '3er Año de Ingeniería en Sistemas';
  if (/cuarto.*sistemas|sistemas.*4|4[to°]?\s*ano.*sistemas/.test(input)) return '4to Año de Ingeniería en Sistemas';
  if (/quinto.*sistemas|sistemas.*5|5[to°]?\s*ano.*sistemas/.test(input)) return '5to Año de Ingeniería en Sistemas';

  if (/primer.*administraci|1[er°]?\s*ano.*administraci/.test(input)) return '1er Año de Administración de Empresas';
  if (/segundo.*administraci|2[do°]?\s*ano.*administraci/.test(input)) return '2do Año de Administración de Empresas';
  if (/tercer.*administraci|3[er°]?\s*ano.*administraci/.test(input)) return '3er Año de Administración de Empresas';
  if (/cuarto.*administraci|4[to°]?\s*ano.*administraci/.test(input)) return '4to Año de Administración de Empresas';
  if (/quinto.*administraci|5[to°]?\s*ano.*administraci/.test(input)) return '5to Año de Administración de Empresas';

  if (/primer.*industrial|1[er°]?\s*ano.*industrial/.test(input)) return '1er Año de Ingeniería Industrial';
  if (/segundo.*industrial|2[do°]?\s*ano.*industrial/.test(input)) return '2do Año de Ingeniería Industrial';
  if (/tercer.*industrial|3[er°]?\s*ano.*industrial/.test(input)) return '3er Año de Ingeniería Industrial';
  if (/cuarto.*industrial|4[to°]?\s*ano.*industrial/.test(input)) return '4to Año de Ingeniería Industrial';
  if (/quinto.*industrial|5[to°]?\s*ano.*industrial/.test(input)) return '5to Año de Ingeniería Industrial';

  // ── Años académicos genéricos (sin carrera detectada) ──
  if (/primer|1[er°]?\s*ano|first\s*year/.test(input)) return '1er Año';
  if (/segundo|2[do°]?\s*ano|second\s*year/.test(input)) return '2do Año';
  if (/tercer|3[er°]?\s*ano|third\s*year/.test(input)) return '3er Año';
  if (/cuarto|4[to°]?\s*ano|fourth\s*year/.test(input)) return '4to Año';
  if (/quinto|5[to°]?\s*ano|fifth\s*year/.test(input)) return '5to Año';

  // ── Grupos específicos institucionales ──
  if (/emprendedor|incubado|startup/.test(input)) return 'Emprendedores Incubados';
  if (/docente|profesor|maestro|catedratico/.test(input)) return 'Docentes';
  if (/coordinador|director|administrativo/.test(input)) return 'Coordinadores y Directivos';
  if (/egresado|graduado|alumni/.test(input)) return 'Egresados';
  if (/comunidad|publico general|abierto/.test(input)) return 'Público General';

  // ── Carreras genéricas (sin año específico) ──
  if (/sistema|informatica|computacion/.test(input)) return 'Ingeniería en Sistemas';
  if (/administraci|empresa/.test(input)) return 'Administración de Empresas';
  if (/industrial/.test(input)) return 'Ingeniería Industrial';
  if (/contabilidad|contaduria/.test(input)) return 'Contaduría';
  if (/derecho|juridico/.test(input)) return 'Derecho';

  // Si nada coincide, capitalizar y devolver limpio
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}
