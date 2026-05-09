import pandas as pd
import io
from fpdf import FPDF
from datetime import datetime
from typing import List, Dict

class ExportService:
    @staticmethod
    def to_excel(data: List[Dict], report_name: str) -> bytes:
        if not data:
            # Fallback for empty data
            df = pd.DataFrame([{"Aviso": "No hay datos para este reporte"}])
        else:
            df = pd.DataFrame(data)
            
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Reporte')
            
            # Format
            workbook = writer.book
            worksheet = writer.sheets['Reporte']
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#D7E4BC',
                'border': 1
            })
            
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                # Auto-size columns
                column_len = max(df[value].astype(str).str.len().max(), len(value) + 2)
                worksheet.set_column(col_num, col_num, column_len)
                
        return output.getvalue()

    @staticmethod
    def to_pdf(data: List[Dict], report_title: str) -> bytes:
        pdf = FPDF(orientation='L', unit='mm', format='A4')
        pdf.add_page()
        pdf.set_font("helvetica", "B", 16)
        
        # Header
        pdf.cell(0, 10, "SERCONIND LTDA.", ln=True, align='L')
        pdf.set_font("helvetica", "I", 8)
        pdf.cell(0, 5, "Ingeniería, Montaje y Obras Civiles", ln=True, align='L')
        pdf.ln(10)
        
        # title
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, report_title.upper(), ln=True, align='C')
        pdf.set_font("helvetica", "", 8)
        pdf.cell(0, 5, f"Fecha de generación: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align='R')
        pdf.ln(5)
        
        if not data:
            pdf.cell(0, 10, "No hay datos disponibles para este reporte.", ln=True)
            return pdf.output()

        # Table logic (legacy approach for fpdf without built-in table)
        # However, fpdf2 *has* a table() method which is better.
        # Let's use the table() method if possible.
        
        columns = list(data[0].keys())
        # Convert data to list of lists for fpdf2 table
        table_data = [columns]
        for row in data:
            table_data.append([str(row[col]) for col in columns])

        pdf.set_font("helvetica", size=8)
        with pdf.table(
            borders_layout="HORIZONTAL_LINES",
            cell_fill_color=(240, 240, 240),
            cell_fill_mode="ROWS",
            line_height=6,
            text_align="CENTER"
        ) as table:
            for data_row in table_data:
                row = table.row()
                for datum in data_row:
                    row.cell(datum)

        return pdf.output()
