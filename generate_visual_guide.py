import os
import sys
from datetime import datetime

# Añadir el directorio backend al path para poder importar si es necesario
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from fpdf import FPDF
    from fpdf.enums import XPos, YPos
except ImportError:
    print("Error: fpdf2 no está instalado. Intenta correr este script en el entorno adecuado.")
    sys.exit(1)

class VisualGuidePDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font('helvetica', 'I', 8)
            self.set_text_color(128, 128, 128)
            self.cell(0, 8, 'Manual de Interfaces, Supabase y Render - ConstructERP', border='B', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='R')
            self.ln(3)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        # Page number
        self.cell(0, 10, f'Página {self.page_no()}/{{nb}}', border='T', align='C')

    def add_chapter_title(self, num, title):
        self.set_font('helvetica', 'B', 14)
        self.set_text_color(0, 51, 102) # Azul oscuro corporativo
        self.cell(0, 10, f'{num}. {title}', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='L')
        self.ln(2)

    def add_section_title(self, title):
        self.set_font('helvetica', 'B', 11)
        self.set_text_color(51, 102, 153) # Azul intermedio
        self.cell(0, 8, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='L')
        self.ln(1)

    def add_body_text(self, text):
        self.set_font('helvetica', size=10)
        self.set_text_color(50, 50, 50) # Gris oscuro
        self.multi_cell(0, 5, text)
        self.ln(3)

    def add_caption(self, text):
        self.set_font('helvetica', 'I', 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        self.ln(4)

def generate_pdf():
    pdf = VisualGuidePDF()
    pdf.alias_nb_pages()
    
    # --- PORTADA ---
    pdf.add_page()
    pdf.set_fill_color(18, 30, 49) # Fondo azul oscuro profundo
    pdf.rect(0, 0, 210, 297, 'F')
    
    pdf.set_y(60)
    pdf.set_font('helvetica', 'B', 32)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 15, 'ConstructERP', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    
    pdf.set_font('helvetica', 'B', 16)
    pdf.set_text_color(61, 220, 151) # Verde menta / Supabase green
    pdf.cell(0, 10, 'Manual Visual de Interfaces y Despliegue Cloud', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    
    pdf.ln(10)
    pdf.set_font('helvetica', 'I', 11)
    pdf.set_text_color(220, 220, 220)
    pdf.cell(0, 8, 'Análisis de Funcionalidades, Arquitectura Supabase & OnRender', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    
    pdf.set_y(210)
    pdf.set_font('helvetica', 'B', 11)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 6, 'Material de Apoyo Visual para Disertación y Defensa', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    pdf.set_font('helvetica', size=10)
    pdf.set_text_color(200, 200, 200)
    pdf.cell(0, 5, 'SERCONIND LTDA. · Plataforma de Control de Obras v2.1', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    pdf.cell(0, 5, f'Fecha: {datetime.now().strftime("%d/%m/%Y")}', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    
    # --- CAPITULO 1: ARQUITECTURA CLOUD ---
    pdf.add_page()
    pdf.set_text_color(0, 0, 0)
    pdf.add_chapter_title('1', 'Arquitectura Cloud e Infraestructura de Despliegue')
    pdf.add_body_text(
        "El despliegue productivo de ConstructERP aprovecha tecnologías de nube modernas "
        "para garantizar escalabilidad, seguridad y bajo costo de operación. El sistema se "
        "compone de dos proveedores principales de infraestructura cloud:"
    )
    
    pdf.add_section_title("1.1 Base de Datos y Almacenamiento con Supabase")
    pdf.add_body_text(
        "Supabase proporciona un motor relacional de base de datos PostgreSQL de clase empresarial, "
        "el cual es consumido por el backend FastAPI mediante SQLAlchemy ORM.\n\n"
        "Ventajas Clave de Supabase en el Proyecto:\n"
        "  - Estructuras Relacionales Robustas: Almacena de forma segura tablas de negocio relacionales "
        "(workers, projects, documents, users, organizations, audit_logs) respetando claves foráneas y "
        "restricciones de integridad.\n"
        "  - Soporte de UUIDs: Permite el uso nativo de identificadores únicos universales (UUID) para "
        "documentos y registros críticos, evitando la enumeración secuencial de IDs por atacantes.\n"
        "  - Flexibilidad JSONB: Permite guardar estructuras de datos flexibles como campos JSON "
        "(por ejemplo, los metadatos extraídos por el OCR y las respuestas estructuradas de Capataz AI)."
    )
    
    pdf.add_section_title("1.2 Servidor de Aplicaciones con OnRender (Render)")
    pdf.add_body_text(
        "OnRender aloja el backend de FastAPI y el frontend de React. Al usar contenedores de aplicaciones "
        "dinámicos, OnRender gestiona el enrutamiento HTTPS automático y el escalado web.\n\n"
        "El Desafío del Disco Efímero (Ephemeral Disk):\n"
        "En la capa de hosting gratuito o de bajo costo de Render, los contenedores son volátiles. Cada vez que "
        "el servidor se reinicia, se actualiza el código o entra en estado de suspensión por inactividad, el "
        "disco local del contenedor se borra por completo. Esto causaba que todos los archivos PDF y de imágenes "
        "de los trabajadores (contratos, licencias, facturas OCR) subidos a la carpeta 'backend/uploads/' se perdieran."
    )
    
    pdf.add_section_title("1.3 Solución Implementada: Autocuración Híbrida")
    pdf.add_body_text(
        "Para solucionar la volatilidad de Render sin contratar costosos sistemas de almacenamiento externo dedicados, "
        "se diseñó un mecanismo de Autocuración (Self-Healing) acoplado a Supabase PostgreSQL:\n"
        "  - Respaldo en Base de Datos: Al subir un archivo físico, el backend lo almacena localmente pero a la vez "
        "guarda el binario del archivo completo (como bytes BLOB) en la tabla 'document_data' de Supabase.\n"
        "  - Proceso de Autocuración: Cuando un usuario solicita descargar o ver un documento, el backend busca el "
        "archivo físico en el disco de Render. Si no existe (debido a un reinicio del contenedor), el sistema consulta "
        "los bytes de respaldo en Supabase, los escribe de nuevo al disco local de Render de forma transparente en milisegundos "
        "y finalmente sirve el archivo al cliente. De esta forma, el sistema recupera automáticamente su estado documental "
        "sin que el usuario note retrasos ni pérdidas."
    )
    
    # --- CAPITULO 2: RECORRIDO VISUAL DE INTERFACES ---
    pdf.add_page()
    pdf.add_chapter_title('2', 'Recorrido Visual y Funcional de las Interfaces')
    pdf.add_body_text(
        "A continuación se presenta un análisis detallado, pantalla por pantalla, del diseño "
        "visual e interactivo de ConstructERP, detallando las funcionalidades clave de cada interfaz."
    )
    
    # --- INTERFAZ 1: LOGIN ---
    pdf.add_section_title("2.1 Pantalla de Acceso Seguro (Login)")
    pdf.add_body_text(
        "La interfaz de inicio de sesión se diseñó con un enfoque moderno de pantalla dividida (Split Screen) "
        "que equilibra la identidad corporativa y la seguridad de acceso:\n"
        "  - Panel de Branding (Izquierdo): Integra el logotipo de la empresa, esferas decorativas difuminadas "
        "(orbs) de tonos cian y azul, y una lista visual de los módulos esenciales (Gestión, RRHH, Reportes y Seguridad).\n"
        "  - Tarjeta de Login (Derecho): Contenedor con efecto glassmorphism. Incluye entradas validadas para "
        "correo electrónico y contraseña con opción de ocultar/mostrar caracteres. El botón de ingreso presenta "
        "estados dinámicos (Hover y Carga/Spinner).\n"
        "  - Código QR de Acceso Móvil: Botón flotante que despliega un QR para escanear en celulares y probar "
        "la responsividad del sistema de inmediato."
    )
    
    # Pagina de Imagen de Login
    pdf.add_page()
    pdf.set_y(15)
    pdf.add_section_title("Vista Previa - Interfaz de Login:")
    pdf.ln(2)
    pdf.image("assets/login_page.png", x=25, w=160)
    pdf.ln(5)
    pdf.add_caption("Figura 1: Pantalla de inicio de sesión dividida con tarjeta de acceso translúcida.")
    
    # --- INTERFAZ 2: DASHBOARD ---
    pdf.add_page()
    pdf.add_section_title("2.2 Central Operativa (Dashboard de Gestión)")
    pdf.add_body_text(
        "El Dashboard es el panel principal de control y toma de decisiones. Ofrece visualización interactiva "
        "mediante la integración de la biblioteca Recharts:\n"
        "  - Tarjetas de KPIs Dinámicos: Muestran de un vistazo la dotación total, obras activas y alertas pendientes. "
        "Para roles gerenciales, revela en tiempo real los costos consolidados de sueldos y la utilidad proyectada de los proyectos.\n"
        "  - Gráfico de Barras de Dotación: Renderiza la cantidad de operarios activos distribuidos en cada faena, "
        "permitiendo a los administradores detectar rápidamente déficits de personal o sobreasignaciones.\n"
        "  - Gráfico Circular de Alertas: Segmenta de forma colorida las alertas según su gravedad (Crítica, Advertencia, Informativa).\n"
        "  - Accesos Rápidos Inteligentes: Redirigen de forma inmediata a los módulos de acuerdo a los permisos del usuario logueado."
    )
    
    # Pagina de Imagen de Dashboard
    pdf.add_page()
    pdf.set_y(15)
    pdf.add_section_title("Vista Previa - Central Operativa (Dashboard):")
    pdf.ln(2)
    pdf.image("assets/dashboard_page.png", x=25, w=160)
    pdf.ln(5)
    pdf.add_caption("Figura 2: Dashboard ejecutivo con KPIs analíticos de obra y gráficos interactivos.")

    # --- INTERFAZ 3: WORKERS ---
    pdf.add_page()
    pdf.add_section_title("2.3 Gestión de Recursos Humanos (Personal)")
    pdf.add_body_text(
        "La interfaz de personal unifica la ficha técnica de los trabajadores en faena con flujos contractuales y de vacaciones:\n"
        "  - Tabla de Trabajadores: Listado interactivo que soporta búsquedas por texto y filtrado por estado operacional.\n"
        "  - Ficha de Detalle Lateral (Drawer): Al seleccionar un trabajador, se despliega un panel lateral "
        "con su foto de perfil, RUT validado, cargo, fecha de ingreso, salario mensual exacto, balance disponible "
        "de días de vacaciones y horas extras acumuladas en el mes.\n"
        "  - Carga Masiva Excel: Integración que permite arrastrar una planilla Excel con la dotación para poblar "
        "masivamente las tablas en Supabase, evitando la digitación manual de fichas."
    )
    
    # Pagina de Imagen de Workers
    pdf.add_page()
    pdf.set_y(15)
    pdf.add_section_title("Vista Previa - Ficha de Trabajadores (RR.HH.):")
    pdf.ln(2)
    pdf.image("assets/workers_page.png", x=25, w=160)
    pdf.ln(5)
    pdf.add_caption("Figura 3: Panel de control de personal y panel lateral de ficha técnica del trabajador.")

    # --- INTERFAZ 4: OCR ---
    pdf.add_page()
    pdf.add_section_title("2.4 Módulo de Digitalización y OCR Inteligente de Facturas")
    pdf.add_body_text(
        "La interfaz de digitalización documental destaca por su diseño de Pantalla Dividida (Split Screen) "
        "que agiliza la auditoría y validación de las facturas cargadas en obra:\n"
        "  - Visor del Documento Original (Izquierda): Muestra el documento PDF o imagen de la factura "
        "cargada directamente por el usuario, permitiendo hacer zoom e inspeccionar el archivo físico.\n"
        "  - Formulario de Extracción estructurada por IA (Derecha): Presenta los campos leídos de forma autónoma "
        "por el motor de Inteligencia Artificial (RUT del emisor, Razón Social, Categoría, Monto Neto, Monto IVA y Monto Total).\n"
        "  - Interacción de Validación: Los campos extraídos son completamente editables. El usuario contrasta el "
        "documento de la izquierda contra los campos de la derecha, realiza correcciones si es necesario, y hace clic "
        "en 'Confirmar Factura' para autorizar el ingreso formal del gasto en el balance financiero del proyecto."
    )
    
    # Pagina de Imagen de OCR
    pdf.add_page()
    pdf.set_y(15)
    pdf.add_section_title("Vista Previa - Digitalización y Procesamiento OCR:")
    pdf.ln(2)
    pdf.image("assets/ocr_page.png", x=25, w=160)
    pdf.ln(5)
    pdf.add_caption("Figura 4: Interfaz de validación OCR con visor de PDF y formulario estructurado por IA.")

    # --- INTERFAZ 5: CAPATAZ AI ---
    pdf.add_page()
    pdf.add_section_title("2.5 Asistente Operativo Asistido (Capataz AI)")
    pdf.add_body_text(
        "El Capataz AI es una de las mayores innovaciones del sistema, integrando una interfaz conversacional "
        "tipo chat con herramientas autónomas conectadas en tiempo real:\n"
        "  - Puntuación de Salud (Health Score): Barra superior que calcula la salud operacional del sistema "
        "según el estado de las obras y presupuestos.\n"
        "  - Flujo de Chat Interactivo: El usuario consulta en lenguaje natural (ej: '¿Cuánto hemos gastado en "
        "la obra del Edificio Costanera?').\n"
        "  - Telemetría en Tiempo Real (SQL Tool-Calling): Al recibir la consulta, la IA selecciona de forma autónoma "
        "la herramienta de lectura local SQL, genera la consulta y la ejecuta. La interfaz presenta una tarjeta "
        "con el bloque de código SQL ejecutado, entregando transparencia total del proceso.\n"
        "  - Descarga de Reportes: Permite generar un informe ejecutivo de la conversación en formato PDF al instante."
    )
    
    # Pagina de Imagen de Capataz
    pdf.add_page()
    pdf.set_y(15)
    pdf.add_section_title("Vista Previa - Interfaz Conversacional Capataz AI:")
    pdf.ln(2)
    pdf.image("assets/capataz_page.png", x=25, w=160)
    pdf.ln(5)
    pdf.add_caption("Figura 5: Chat interactivo con visualización de código SQL de telemetría y exportador PDF.")

    # --- CAPITULO 3: GUIA PARA LA DISERTACION ---
    pdf.add_page()
    pdf.add_chapter_title('3', 'Guion y Recomendaciones para la Demostración en Vivo')
    pdf.add_body_text(
        "Para realizar una demostración exitosa ante el jurado evaluador, siga esta secuencia de pasos:\n\n"
        "Paso 1: Demostración de Acceso y Responsividad\n"
        "Comience en la pantalla de Login. Resalte el diseño dividido. Luego, haga clic en el botón flotante "
        "de 'Acceso Móvil' y pídale a un miembro de la comisión que escanee el código QR con su propio teléfono móvil "
        "para que experimente de forma inmediata cómo se adapta toda la interfaz al formato responsivo.\n\n"
        "Paso 2: Explicación del Dashboard Ejecutivo\n"
        "Inicie sesión como Administrador. Muestre los KPI de personal y finanzas. Explique los gráficos de Recharts "
        "y mencione que los datos son dinámicos y se obtienen desde la base de datos cloud de Supabase.\n\n"
        "Paso 3: Carga de Archivos y Demostración de Autocuración (Render + Supabase)\n"
        "Vaya al módulo de personal u OCR. Suba una factura de prueba y ejecute el escaneo OCR. Resalte la comodidad "
        "del visor en pantalla dividida. Para impresionar a los evaluadores, explique el desafío técnico de "
        "desplegar en servidores con disco efímero como Render y describa el algoritmo de Autocuración implemented "
        "con Supabase PostgreSQL para regenerar archivos caídos desde la base de datos de manera automatizada.\n\n"
        "Paso 4: Consulta de Datos Interactiva con Capataz AI\n"
        "Abra el chat del Capataz AI y realice una pregunta compleja sobre la base de datos (por ejemplo: '¿Cuál es el "
        "gasto total actual en la obra de vialidad?'). Muestre al jurado cómo la IA interpreta su voz/texto, ejecuta la "
        "consulta SQL de telemetría exacta de forma segura, y finalmente genera un reporte formal en PDF con un clic."
    )
    
    # Save PDF
    pdf_filename = "Manual_Visual_ConstructERP.pdf"
    pdf.output(pdf_filename)
    print(f"PDF visual generado con éxito: {pdf_filename}")

if __name__ == "__main__":
    generate_pdf()
