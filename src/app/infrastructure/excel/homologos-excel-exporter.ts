import * as ExcelJS from 'exceljs';

import { HomologoCrudUiRow } from '../../models/homologos/homologo-crud.model';
import { descargarArchivo } from './excel-utils';

export class HomologosExcelExporter {
  async exportar(nombreArchivo: string, relaciones: HomologoCrudUiRow[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IMSS Bienestar BC';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Relaciones');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'Clave A', key: 'claveA', width: 20 },
      { header: 'Descripción A', key: 'descripcionA', width: 55 },
      { header: 'Clave B', key: 'claveB', width: 20 },
      { header: 'Descripción B', key: 'descripcionB', width: 55 },
      { header: 'Factor A → B', key: 'factor', width: 18 },
    ];

    relaciones.forEach(relacion => {
      const factor = Number(relacion.factor);
      sheet.addRow({
        id: relacion.id,
        claveA: relacion.clave,
        descripcionA: relacion.claveDescripcion ?? '',
        claveB: relacion.sustituto,
        descripcionB: relacion.sustitutoDescripcion ?? '',
        factor: Number.isFinite(factor) ? factor : relacion.factor,
      });
    });

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF006341' },
    };

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.eachRow(row => {
      row.eachCell(cell => {
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    descargarArchivo(buffer, nombreArchivo);
  }
}
