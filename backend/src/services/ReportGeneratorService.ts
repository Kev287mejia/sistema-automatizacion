import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } from 'docx';
import PDFDocument from 'pdfkit';
import { supabase } from '../integrations/database/supabase';
import { AIAnalysisService } from './AIAnalysisService';
import { StatisticsEngineService } from './StatisticsEngineService';

export class ReportGeneratorService {
  private aiService: AIAnalysisService;
  private statsEngine: StatisticsEngineService;

  constructor() {
    this.aiService = new AIAnalysisService();
    this.statsEngine = new StatisticsEngineService();
  }

  /**
   * Recolecta la data cruda, calcula estadísticos, pide narrativa y devuelve Buffers
   */
  async generateInstitutionalReport(topicOrEventName: string): Promise<{ pdfBuffer: Buffer, docxBuffer: Buffer, narrative: any } | null> {
    
    // 1. Data Collection (Notario)
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .ilike('title', `%${topicOrEventName}%`)
      .limit(1)
      .single();

    let hardData: any = { topic_requested: topicOrEventName };

    if (event) {
      // Recolectar asistencias reales incluyendo el JSONB de métricas
      const { data: attendances } = await supabase
        .from('attendances')
        .select(`
          status,
          participants (
            first_name, last_name, institution_role, department, institutional_metrics
          )
        `)
        .eq('event_id', event.id);

      // Desanidar a los participantes
      const rawParticipants = attendances?.map(a => a.participants) || [];
      
      // Pasar al motor estadístico para agrupación y porcentajes reales
      const exactMetrics = this.statsEngine.calculateDemographics(rawParticipants);

      // Pedir a Gemini que extraiga Insights de esta matriz matemática
      const aiInsights = await this.aiService.performStatisticalAnalysis([exactMetrics]);

      hardData = {
        event_details: event,
        demographics: exactMetrics,
        institutional_insights: aiInsights
      };
    } else {
      // Si es un reporte general, agrupamos a todos los participantes
      const { data: allParticipants } = await supabase.from('participants').select('institutional_metrics, institution_role');
      const exactMetrics = this.statsEngine.calculateDemographics(allParticipants || []);
      const aiInsights = await this.aiService.performStatisticalAnalysis([exactMetrics]);

      const { count: totalEvents } = await supabase.from('events').select('*', { count: 'exact', head: true });
      
      hardData = {
        context: 'Reporte General Institucional',
        total_events_created: totalEvents,
        demographics: exactMetrics,
        institutional_insights: aiInsights
      };
    }

    // 2. Narrativa Restringida por IA (Usando el Hard Data enriquecido)
    const narrative = await this.aiService.generateNarrativeForReport(hardData);

    // 3. Generación de Archivos
    const docxBuffer = await this.generateWord(narrative, topicOrEventName);
    const pdfBuffer = await this.generatePDF(narrative, topicOrEventName);

    return { pdfBuffer, docxBuffer, narrative };
  }

  private async generateWord(narrative: any, topic: string): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "INFORME INSTITUCIONAL",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: `Tema: ${topic}`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          
          new Paragraph({ text: "1. Introducción", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: narrative.introduccion, spacing: { after: 200 } }),

          new Paragraph({ text: "2. Objetivo", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: narrative.objetivo, spacing: { after: 200 } }),

          new Paragraph({ text: "3. Desarrollo y Resultados", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: narrative.desarrollo, spacing: { after: 200 } }),

          new Paragraph({ text: "4. Conclusiones", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: narrative.conclusiones, spacing: { after: 200 } }),

          new Paragraph({ text: "5. Recomendaciones Estratégicas", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: narrative.recomendaciones, spacing: { after: 200 } }),
        ],
      }],
    });

    return await Packer.toBuffer(doc);
  }

  private async generatePDF(narrative: any, topic: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Cabecera
      doc.fontSize(20).text('INFORME INSTITUCIONAL', { align: 'center' });
      doc.fontSize(14).text(`Tema: ${topic}`, { align: 'center' });
      doc.moveDown(2);

      const addSection = (title: string, content: string) => {
        doc.fontSize(16).font('Helvetica-Bold').text(title);
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(content, { align: 'justify' });
        doc.moveDown(1);
      };

      addSection('1. Introducción', narrative.introduccion);
      addSection('2. Objetivo', narrative.objetivo);
      addSection('3. Desarrollo y Resultados', narrative.desarrollo);
      addSection('4. Conclusiones', narrative.conclusiones);
      addSection('5. Recomendaciones Estratégicas', narrative.recomendaciones);

      doc.end();
    });
  }
}
