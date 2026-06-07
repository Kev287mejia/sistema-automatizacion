export class AcademicInferenceEngine {
  /**
   * Deduce Faculty, Area and Modality based on the career name.
   */
  public static inferAcademicData(career: string): { faculty: string, modality: string, shift: string } {
    const careerLower = career.toLowerCase();
    
    let faculty = 'Desconocida';
    let modality = 'Regular'; // Default
    let shift = 'Diurno';     // Default

    // Facultad de Ingeniería y Tecnología
    if (careerLower.includes('sistema') || careerLower.includes('computación') || careerLower.includes('civil') || careerLower.includes('agroindustrial')) {
      faculty = 'Facultad de Ingeniería y Tecnología';
    } 
    // Facultad de Ciencias Económicas y Administrativas
    else if (careerLower.includes('contabilidad') || careerLower.includes('administración') || careerLower.includes('turismo') || careerLower.includes('economía')) {
      faculty = 'Facultad de Ciencias Económicas y Administrativas';
    }
    // Facultad de Ciencias Jurídicas y Sociales
    else if (careerLower.includes('derecho') || careerLower.includes('sociología') || careerLower.includes('psicología')) {
      faculty = 'Facultad de Ciencias Jurídicas y Sociales';
    }
    // Facultad de Ciencias de la Educación
    else if (careerLower.includes('educación') || careerLower.includes('pedagogía') || careerLower.includes('inglés')) {
      faculty = 'Facultad de Ciencias de la Educación';
    }
    // Facultad de Recursos Naturales
    else if (careerLower.includes('biología') || careerLower.includes('recursos') || careerLower.includes('forestal')) {
      faculty = 'Facultad de Recursos Naturales y del Ambiente';
    }

    // Inferir modalidad si lo menciona el usuario
    if (careerLower.includes('sabatino') || careerLower.includes('sábado') || careerLower.includes('sabado')) {
      modality = 'Sabatino';
    } else if (careerLower.includes('dominical') || careerLower.includes('domingo')) {
      modality = 'Dominical';
    } else if (careerLower.includes('virtual')) {
      modality = 'Virtual';
    }

    return { faculty, modality, shift };
  }
}
