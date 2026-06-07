import ExcelJS from 'exceljs';
import { supabase } from '../integrations/database/supabase';
import { EventRepository } from '../repositories/EventRepository';

export class ExcelService {
  private eventRepo: EventRepository;

  constructor() {
    this.eventRepo = new EventRepository();
  }

  public async generateEventStatisticsExcel(eventName: string): Promise<{ buffer: Buffer, filename: string, eventTitle: string } | null> {
    const event = await this.eventRepo.findEventByName(eventName);
    if (!event) return null;

    // Obtener todas las inscripciones y cruzar con perfiles de estudiantes
    const { data: registrations, error } = await supabase
      .from('event_registrations')
      .select(`
        attendance_status,
        registered_at,
        students_profiles (
          full_name,
          student_code,
          id_number,
          gender,
          career,
          municipality,
          faculty,
          modality,
          shift
        )
      `)
      .eq('event_id', event.id);

    if (error) {
      console.error('Error fetching registrations:', error);
      return null;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Estadísticas Oficiales');

    // Estilos Institucionales (Cabecera)
    worksheet.columns = [
      { header: 'Nº', key: 'index', width: 5 },
      { header: 'Nombre Completo', key: 'fullName', width: 35 },
      { header: 'Carnet / Código', key: 'studentCode', width: 15 },
      { header: 'Cédula', key: 'idNumber', width: 20 },
      { header: 'Sexo', key: 'gender', width: 12 },
      { header: 'Carrera', key: 'career', width: 30 },
      { header: 'Facultad', key: 'faculty', width: 35 },
      { header: 'Municipio', key: 'municipality', width: 20 },
      { header: 'Modalidad', key: 'modality', width: 15 },
      { header: 'Turno', key: 'shift', width: 15 },
      { header: 'Estado Asistencia', key: 'attendance', width: 18 }
    ];

    // Formato de cabecera
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF004E98' } // Azul Institucional
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    let totalMale = 0;
    let totalFemale = 0;

    // Agregar filas
    registrations?.forEach((reg: any, index) => {
      const p = reg.students_profiles;
      if (p.gender === 'Masculino') totalMale++;
      if (p.gender === 'Femenino') totalFemale++;

      worksheet.addRow({
        index: index + 1,
        fullName: p.full_name,
        studentCode: p.student_code || 'N/A',
        idNumber: p.id_number || 'N/A',
        gender: p.gender,
        career: p.career,
        faculty: p.faculty,
        municipality: p.municipality,
        modality: p.modality,
        shift: p.shift,
        attendance: reg.attendance_status
      });
    });

    // Agregar un resumen estadístico al final
    const emptyRow = worksheet.addRow([]);
    const summaryHeader = worksheet.addRow(['', 'RESUMEN ESTADÍSTICO', '', '', '', '', '', '', '', '', '']);
    summaryHeader.font = { bold: true };
    
    worksheet.addRow(['', `Total Inscritos: ${registrations?.length || 0}`, '', '', '', '', '', '', '', '', '']);
    worksheet.addRow(['', `Masculino: ${totalMale}`, '', '', '', '', '', '', '', '', '']);
    worksheet.addRow(['', `Femenino: ${totalFemale}`, '', '', '', '', '', '', '', '', '']);

    // Crear bordes para la tabla principal
    const rowCount = (registrations?.length || 0) + 1;
    for (let i = 1; i <= rowCount; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const cleanTitle = event.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    
    return {
      buffer,
      filename: `Estadistico_${cleanTitle}.xlsx`,
      eventTitle: event.title
    };
  }
}
