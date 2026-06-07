import { model, jsonModel } from '../integrations/ai/openrouter';

export class AIAnalysisService {
  /**
   * 1. Generación de informes institucionales
   * Analiza datos crudos (ej. arrays de participantes o eventos) y genera un reporte formal.
   */
  async generateInstitutionalReport(rawData: any): Promise<string> {
    const prompt = `
      Eres un analista ejecutivo del Área de Innovación y Emprendimiento.
      Con los siguientes datos crudos, genera un "Informe Institucional Ejecutivo" formal.
      Debe contener:
      - Introducción
      - Desarrollo (Análisis de los datos)
      - Conclusión
      Datos: ${JSON.stringify(rawData)}
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * 2. Minutas automáticas
   * Transforma notas rápidas o transcripciones en minutas ordenadas.
   */
  async generateMeetingMinutes(rawNotes: string): Promise<string> {
    const prompt = `
      Transforma las siguientes notas crudas de una reunión en una "Minuta Institucional" profesional.
      Debe incluir:
      - Asuntos Tratados
      - Acuerdos Tomados
      - Siguientes Pasos (Responsables y Fechas estimadas si aplican)
      Notas: "${rawNotes}"
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * 3. Análisis estadístico
   * Extrae patrones ocultos de métricas Jsonb o estadísticas duras.
   */
  async performStatisticalAnalysis(metricsData: any[]): Promise<string> {
    const prompt = `
      Actúa como un analista de datos Senior. 
      Analiza el siguiente arreglo estadístico del Área de Innovación.
      Detecta tendencias, modas, y métricas atípicas. Explícalo de forma clara y gerencial.
      Datos: ${JSON.stringify(metricsData)}
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * 4. Recomendaciones institucionales
   * En base a un contexto, genera estrategias.
   */
  async generateRecommendations(contextData: string): Promise<string> {
    const prompt = `
      En base al siguiente contexto del Área de Innovación y Emprendimiento,
      escribe 3 a 5 "Recomendaciones Estratégicas Institucionales" accionables.
      Contexto: "${contextData}"
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * 5. Redacción ejecutiva
   * Refina un texto informal para que suene adecuado para rectoría.
   */
  async draftExecutiveText(draft: string): Promise<string> {
    const prompt = `
      Reescribe el siguiente borrador utilizando un tono altamente formal, ejecutivo e institucional,
      ideal para ser presentado ante la junta directiva o rectoría. Evita la redundancia.
      Borrador: "${draft}"
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * 6. Redacción Narrativa Estricta para Informes
   * No inventa datos. Toma la data dura y la redacta estructuradamente.
   */
  async generateNarrativeForReport(hardData: any): Promise<{
    introduccion: string;
    objetivo: string;
    desarrollo: string;
    conclusiones: string;
    recomendaciones: string;
  }> {
    const prompt = `
      Eres el Notario Redactor del Área de Innovación y Emprendimiento.
      A continuación, recibirás datos DUROS e inmutables extraídos de la base de datos sobre un evento o periodo.
      Tu única tarea es redactar la NARRATIVA INSTITUCIONAL para el informe, basada EXCLUSIVAMENTE en esos datos.
      ESTÁ ESTRICTAMENTE PROHIBIDO INVENTAR NÚMEROS, FECHAS O NOMBRES. Si un dato no está, omítelo.
      
      Datos Duros:
      ${JSON.stringify(hardData, null, 2)}
      
      Devuelve un JSON estrictamente con esta estructura (sin marcadores \`\`\`json):
      {
        "introduccion": "...",
        "objetivo": "...",
        "desarrollo": "...",
        "conclusiones": "...",
        "recomendaciones": "..."
      }
    `;
    const result = await jsonModel.generateContent(prompt);
    const cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  }
}
