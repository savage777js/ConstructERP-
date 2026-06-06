from fpdf import FPDF
from datetime import datetime
import io

class BasePDFService(FPDF):
    def header(self):
        # Logo placeholder
        self.set_font('helvetica', 'B', 15)
        self.cell(0, 10, 'SERCONIND LTDA.', border=False, ln=True, align='L')
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 5, 'Ingeniería, Montaje y Obras Civiles', border=False, ln=True, align='L')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Página {self.page_no()}/{{nb}}', align='C')

class ContractService:
    @staticmethod
    def generate_worker_contract(worker_data: dict) -> bytes:
        pdf = BasePDFService()
        pdf.add_page()
        pdf.set_font("helvetica", size=12)

        # Title
        pdf.set_font("helvetica", 'B', 14)
        pdf.cell(0, 10, "CONTRATO INDIVIDUAL DE TRABAJO", ln=True, align='C')
        pdf.ln(10)

        # Intro
        current_date_str = datetime.now().strftime('%d/%m/%Y')
        pdf.set_font("helvetica", size=11)
        pdf.multi_cell(0, 6, 
            f"En la ciudad de Santiago, a {current_date_str}, entre la empresa SERCONIND LTDA., "
            f"RUT 77.654.321-K, representada por don Gerente General en su calidad de Representante Legal, en adelante 'el empleador', "
            f"y don(ña) {worker_data['first_name']} {worker_data['last_name']}, RUT {worker_data['rut'] or 'Sin especificar'}, "
            f"en adelante 'el trabajador', se ha convenido el siguiente contrato de trabajo:"
        )
        pdf.ln(5)

        # Clause 1: Role
        pdf.set_font("helvetica", 'B', 11)
        pdf.cell(0, 8, "PRIMERO: NATURALEZA DE LOS SERVICIOS", ln=True)
        pdf.set_font("helvetica", size=11)
        pdf.multi_cell(0, 6, 
            f"El trabajador se obliga a desempeñar el cargo de {worker_data['role']}, "
            f"ejecutando las labores propias de dicha función y aquellas que el empleador le asigne "
            f"dentro del ámbito de sus competencias en las distintas obras que la empresa mantenga."
        )
        pdf.ln(5)

        # Clause 2: Salary
        pdf.set_font("helvetica", 'B', 11)
        pdf.cell(0, 8, "SEGUNDO: REMUNERACIÓN", ln=True)
        pdf.set_font("helvetica", size=11)
        salary_fmt = f"${worker_data['salary']:,}".replace(',', '.')
        pdf.multi_cell(0, 6, 
            f"La remuneración del trabajador será la suma de {salary_fmt} pesos mensuales, "
            f"la cual será liquidada y pagada por mes vencido en la cuenta bancaria del trabajador."
        )
        pdf.ln(5)

        # Clause 3: Start Date
        pdf.set_font("helvetica", 'B', 11)
        pdf.cell(0, 8, "TERCERO: VIGENCIA", ln=True)
        pdf.set_font("helvetica", size=11)
        # Parse timestamp safely
        try:
            h_date = datetime.fromisoformat(str(worker_data['hire_date'])).strftime('%d/%m/%Y')
        except Exception:
            h_date = str(worker_data['hire_date'])
        pdf.multi_cell(0, 6, 
            f"El presente contrato tendrá una vigencia a contar del día {h_date}. "
            f"Se entiende que el trabajador ingresa a prestar servicios en esta fecha."
        )
        pdf.ln(5)

        # Clause 4: Initiation of Activities
        pdf.set_font("helvetica", 'B', 11)
        pdf.cell(0, 8, "CUARTO: INICIACIÓN DE ACTIVIDADES", ln=True)
        pdf.set_font("helvetica", size=11)
        pdf.multi_cell(0, 6, 
            "El empleador declara expresamente y las partes toman conocimiento de que SERCONIND LTDA. "
            "se encuentra actualmente en trámites de iniciación de actividades comerciales ante el Servicio "
            "de Impuestos Internos (SII), por lo cual el presente contrato de trabajo y sus términos legales "
            "se acogen íntegramente a las normativas de constitución corporativa vigentes."
        )
        pdf.ln(15)

        # Signatures
        pdf.ln(20)
        y = pdf.get_y()
        pdf.line(20, y, 90, y)
        pdf.line(120, y, 190, y)
        pdf.set_y(y + 2)
        pdf.set_x(20)
        pdf.cell(70, 5, "Empleador", align='C')
        pdf.set_x(120)
        pdf.cell(70, 5, "Trabajador", align='C')
        pdf.set_y(y + 8)
        pdf.set_x(20)
        pdf.cell(70, 5, "SERCONIND LTDA.", align='C')
        pdf.set_x(120)
        pdf.cell(70, 5, f"{worker_data['rut']}", align='C')

        # Generate as bytes
        return pdf.output()

    @staticmethod
    def generate_contract_addendum(worker_data: dict, project_data: dict, assignment_role: str, start_date: datetime, end_date: datetime = None) -> bytes:
        pdf = BasePDFService()
        pdf.add_page()
        pdf.set_font("helvetica", size=12)

        # Title
        pdf.set_font("helvetica", 'B', 14)
        pdf.cell(0, 10, "ANEXO DE CONTRATO DE TRABAJO", ln=True, align='C')
        pdf.ln(10)

        # Intro
        current_date_str = datetime.now().strftime('%d/%m/%Y')
        pdf.set_font("helvetica", size=11)
        pdf.multi_cell(0, 6, 
            f"En la ciudad de Santiago, a {current_date_str}, entre la empresa SERCONIND LTDA., "
            f"representada por su Representante Legal, y don(ña) {worker_data['first_name']} {worker_data['last_name']}, "
            f"RUT {worker_data['rut'] or 'Sin especificar'}, de mutuo acuerdo vienen a suscribir el presente anexo al contrato de trabajo:"
        )
        pdf.ln(5)

        # Clause 1: Project Assignment
        pdf.set_font("helvetica", 'B', 11)
        pdf.cell(0, 8, "PRIMERO: DESTINACIÓN A OBRA Y NUEVAS LABORES", ln=True)
        pdf.set_font("helvetica", size=11)
        
        start_date_str = start_date.strftime('%d/%m/%Y') if isinstance(start_date, datetime) else str(start_date)
        end_date_str = f"hasta el {end_date.strftime('%d/%m/%Y')}" if end_date else "con carácter indefinido mientras dure la obra"
        
        pdf.multi_cell(0, 6, 
            f"A contar del día {start_date_str}, el trabajador es destinado a prestar servicios en la obra/proyecto "
            f"denominado '{project_data['name']}' ({project_data['code'] or 'S/C'}), ubicada en '{project_data['address'] or 'Sin dirección especificada'}'. "
            f"En dicho frente de trabajo, el trabajador desempeñará el cargo específico de '{assignment_role}'. "
            f"Esta destinación se mantendrá vigente {end_date_str}."
        )
        pdf.ln(5)

        # Clause 2: General Terms
        pdf.set_font("helvetica", 'B', 11)
        pdf.cell(0, 8, "SEGUNDO: VIGENCIA DE OTRAS CLÁUSULAS", ln=True)
        pdf.set_font("helvetica", size=11)
        pdf.multi_cell(0, 6, 
            "En todo lo no modificado por este instrumento, continuarán plenamente vigentes todas y cada una de las "
            "cláusulas y estipulaciones del contrato de trabajo original del trabajador."
        )
        pdf.ln(15)

        # Signatures
        pdf.ln(20)
        y = pdf.get_y()
        pdf.line(20, y, 90, y)
        pdf.line(120, y, 190, y)
        pdf.set_y(y + 2)
        pdf.set_x(20)
        pdf.cell(70, 5, "Empleador", align='C')
        pdf.set_x(120)
        pdf.cell(70, 5, "Trabajador", align='C')
        pdf.set_y(y + 8)
        pdf.set_x(20)
        pdf.cell(70, 5, "SERCONIND LTDA.", align='C')
        pdf.set_x(120)
        pdf.cell(70, 5, f"{worker_data['rut'] or ''}", align='C')

        # Generate as bytes
        return pdf.output()
