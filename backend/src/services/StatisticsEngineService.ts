export interface AggregatedMetrics {
  total: number;
  sexo: Record<string, { count: number; percentage: string }>;
  edad: Record<string, { count: number; percentage: string }>;
  municipio: Record<string, { count: number; percentage: string }>;
  facultad: Record<string, { count: number; percentage: string }>;
  carrera: Record<string, { count: number; percentage: string }>;
  discapacidad: Record<string, { count: number; percentage: string }>;
  rural_urbano: Record<string, { count: number; percentage: string }>;
  modalidad: Record<string, { count: number; percentage: string }>;
  etnia: Record<string, { count: number; percentage: string }>;
}

export class StatisticsEngineService {
  /**
   * Extrae, agrupa y calcula porcentajes de un arreglo de participantes en tiempo de ejecución.
   */
  public calculateDemographics(participants: any[]): AggregatedMetrics {
    const total = participants.length;
    
    const counts = {
      sexo: {} as Record<string, number>,
      edad: {} as Record<string, number>,
      municipio: {} as Record<string, number>,
      facultad: {} as Record<string, number>,
      carrera: {} as Record<string, number>,
      discapacidad: {} as Record<string, number>,
      rural_urbano: {} as Record<string, number>,
      modalidad: {} as Record<string, number>,
      etnia: {} as Record<string, number>,
    };

    // Recorrido de O(N) para sumarización
    participants.forEach(p => {
      // El participant puede venir directo o anidado en attendance
      const rawMetrics = p.institutional_metrics || {};
      
      this.incrementKey(counts.sexo, rawMetrics.sexo || 'No especificado');
      this.incrementKey(counts.edad, this.groupAge(rawMetrics.edad));
      this.incrementKey(counts.municipio, rawMetrics.municipio || 'No especificado');
      this.incrementKey(counts.facultad, rawMetrics.facultad || 'No especificado');
      this.incrementKey(counts.carrera, rawMetrics.carrera || 'No especificado');
      this.incrementKey(counts.discapacidad, rawMetrics.discapacidad || 'No especificado');
      this.incrementKey(counts.rural_urbano, rawMetrics.rural_urbano || 'No especificado');
      this.incrementKey(counts.modalidad, rawMetrics.modalidad || 'No especificado');
      this.incrementKey(counts.etnia, rawMetrics.etnia || 'No especificado');
    });

    // Conversión a porcentajes
    return {
      total,
      sexo: this.convertToPercentage(counts.sexo, total),
      edad: this.convertToPercentage(counts.edad, total),
      municipio: this.convertToPercentage(counts.municipio, total),
      facultad: this.convertToPercentage(counts.facultad, total),
      carrera: this.convertToPercentage(counts.carrera, total),
      discapacidad: this.convertToPercentage(counts.discapacidad, total),
      rural_urbano: this.convertToPercentage(counts.rural_urbano, total),
      modalidad: this.convertToPercentage(counts.modalidad, total),
      etnia: this.convertToPercentage(counts.etnia, total),
    };
  }

  private incrementKey(dict: Record<string, number>, key: string) {
    const cleanKey = key.trim() === '' ? 'No especificado' : key;
    dict[cleanKey] = (dict[cleanKey] || 0) + 1;
  }

  private convertToPercentage(dict: Record<string, number>, total: number) {
    const result: Record<string, { count: number; percentage: string }> = {};
    for (const [key, count] of Object.entries(dict)) {
      const percentage = total === 0 ? '0%' : ((count / total) * 100).toFixed(1) + '%';
      result[key] = { count, percentage };
    }
    return result;
  }

  private groupAge(ageString: string | number | undefined): string {
    if (!ageString) return 'No especificado';
    const age = Number(ageString);
    if (isNaN(age)) return 'No especificado';
    
    if (age < 18) return 'Menores de 18';
    if (age >= 18 && age <= 25) return '18 - 25 años';
    if (age >= 26 && age <= 35) return '26 - 35 años';
    if (age >= 36 && age <= 50) return '36 - 50 años';
    return 'Mayores de 50';
  }
}
