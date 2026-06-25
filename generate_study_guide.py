import os
import sys
from datetime import datetime

# Añadir el directorio backend al path para poder importar si es necesario
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from fpdf import FPDF
    from fpdf.enums import XPos, YPos
except ImportError:
    print("Error: fpdf2 no está instalado. Intenta correr este script usando el entorno virtual del backend.")
    sys.exit(1)

class StudyGuidePDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font('helvetica', 'I', 8)
            self.set_text_color(128, 128, 128)
            self.cell(0, 8, 'Manual de Exposición y Guía de Interfaces - ConstructERP', border='B', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='R')
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

    def add_code_snippet(self, code):
        self.set_font('courier', size=8)
        self.set_text_color(0, 102, 51) # Verde oscuro
        self.set_fill_color(245, 245, 245) # Gris claro
        # Reemplazar caracteres problemáticos
        code_clean = code.encode('latin1', 'replace').decode('latin1')
        self.multi_cell(0, 4, code_clean, fill=True, border=1)
        self.ln(3)

def generate_pdf():
    pdf = StudyGuidePDF()
    pdf.alias_nb_pages()
    
    # --- PORTADA ---
    pdf.add_page()
    pdf.set_fill_color(11, 23, 44) # Fondo azul oscuro sofisticado (casi negro)
    pdf.rect(0, 0, 210, 297, 'F')
    
    pdf.set_y(60)
    pdf.set_font('helvetica', 'B', 32)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 15, 'ConstructERP', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    
    pdf.set_font('helvetica', 'B', 16)
    pdf.set_text_color(0, 180, 216) # Celeste corporativo
    pdf.cell(0, 10, 'Guía de Interfaces y Manual Técnico', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    
    pdf.ln(15)
    pdf.set_font('helvetica', 'I', 11)
    pdf.set_text_color(240, 240, 240)
    pdf.cell(0, 8, 'Resumen de Arquitectura, Flujo de Interfaces (Login/Dashboard) y Capataz AI', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    
    pdf.set_y(210)
    pdf.set_font('helvetica', 'B', 11)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 6, 'Preparación Integral para Disertación y Defensa', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    pdf.set_font('helvetica', size=10)
    pdf.set_text_color(200, 200, 200)
    pdf.cell(0, 5, 'SERCONIND LTDA. - Sistema ERP Modular v2.1', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    pdf.cell(0, 5, f'Fecha de Emisión: {datetime.now().strftime("%d/%m/%Y")}', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
    
    # --- CAPITULO 1: INTRODUCCION ---
    pdf.add_page()
    pdf.set_text_color(0, 0, 0)
    pdf.add_chapter_title('1', 'Introducción y Fundamentos del Sistema')
    pdf.add_body_text(
        "ConstructERP es una plataforma web modular diseñada a medida para SERCONIND LTDA. "
        "Su arquitectura está pensada para resolver las ineficiencias de control operacional, "
        "financiero y administrativo que enfrentan las empresas constructoras modernas.\n\n"
        "El sistema separa limpiamente la lógica de negocio y presentación:\n"
        "  - Cliente (Frontend): Una Single Page Application (SPA) construida sobre React y Vite. Utiliza "
        "un diseño visual premium basado en componentes modernos, micro-animaciones en tiempo real y "
        "estilo responsivo adaptado para dispositivos móviles.\n"
        "  - Servidor (Backend): Una API RESTful de alta velocidad implementada con FastAPI (Python) "
        "junto a SQLAlchemy para mapeo objeto-relacional (ORM), integrando bases de datos SQLite y PostgreSQL.\n"
        "  - Módulos Inteligentes: Procesamiento inteligente de facturas y carpetas de personal mediante "
        "tecnología OCR, y un Asistente Operativo Asistido (Capataz AI) dotado de herramientas autónomas "
        "conectadas a la base de datos."
    )
    
    pdf.add_section_title("Resumen de Módulos Operacionales en Producción:")
    pdf.add_body_text(
        "1. Recursos Humanos (RR.HH.): Gestión completa de la dotación (fichas, balances de vacaciones, contratos PDF y carga masiva mediante Excel).\n"
        "2. Control Financiero de Obras: Monitoreo en tiempo real de presupuestos generales versus gastos devengados reales, estructurados jerárquicamente en subpresupuestos (partidas) y bitácoras/diarios de faena.\n"
        "3. Digitalización Inteligente OCR: Carga de facturas de proveedores y procesamiento automatizado para extraer datos impositivos (RUT, montos y categorías) con prevención de pérdida física de archivos por autocuración.\n"
        "4. Capataz AI: Agente inteligente con ejecución de consultas SQL de solo lectura sobre el nodo de datos local y redacción automatizada de informes de gerencia a PDF."
    )
    
    # --- CAPITULO 2: SEGURIDAD Y LOGIN ---
    pdf.add_page()
    pdf.add_chapter_title('2', 'Autenticación, Seguridad y Acceso')
    pdf.add_body_text(
        "La seguridad en el acceso a los datos de ConstructERP se divide en dos fases:\n"
        "1. Autenticación (¿Quién eres?): Implementada mediante credenciales (usuario y contraseña) a través del flujo OAuth2. Las contraseñas en la base de datos se almacenan encriptadas usando la función de derivación de claves 'bcrypt'.\n"
        "2. Autorización (¿Qué puedes hacer?): Administrada mediante Tokens JWT (JSON Web Tokens) firmados con el algoritmo HMAC-SHA256 (HS256) en el servidor. El token contiene la identidad del usuario y una fecha de expiración corta.\n\n"
        "El cliente almacena este token de forma segura en 'localStorage' al iniciar sesión y lo adjunta automáticamente en la cabecera HTTP (Authorization: Bearer <token>) de cada petición subsiguiente mediante un interceptor de peticiones en Axios."
    )
    
    pdf.add_section_title("Código Clave de Autenticación (Backend - auth.py):")
    pdf.add_code_snippet(
        "@router.post(\"/login\")\ndef login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):\n"
        "    user = db.query(User).filter(User.email == form_data.username).first()\n"
        "    if not user or not security.verify_password(form_data.password, user.hashed_password):\n"
        "        raise HTTPException(status_code=401, detail=\"Email o contraseña incorrectos\")\n"
        "    access_token = security.create_access_token(subject=user.id)\n"
        "    return {\n"
        "        \"access_token\": access_token, \n"
        "        \"token_type\": \"bearer\", \n"
        "        \"user\": {\"email\": user.email, \"role\": user.role, \"full_name\": user.full_name}\n"
        "    }"
    )
    
    pdf.add_section_title("Interceptor Axios en el Frontend (api/index.js):")
    pdf.add_code_snippet(
        "api.interceptors.request.use((config) => {\n"
        "  const token = localStorage.getItem('token');\n"
        "  if (token) {\n"
        "    config.headers.Authorization = `Bearer ${token}`;\n"
        "  }\n"
        "  return config;\n"
        "});"
    )
    
    # --- CAPITULO 3: RBAC ---
    pdf.add_page()
    pdf.add_chapter_title('3', 'Control de Acceso Basado en Roles (RBAC)')
    pdf.add_body_text(
        "Para garantizar el principio de menor privilegio, ConstructERP utiliza un sistema híbrido de "
        "Control de Acceso Basado en Roles (RBAC) que se valida tanto en el Backend (FastAPI dependencies) "
        "como en el Frontend (React Context).\n\n"
        "Los roles jerárquicos establecidos son:\n"
        "  - SUPER_ADMIN / ADMIN: Control absoluto de los recursos, usuarios, configuraciones y auditoría.\n"
        "  - HR_MANAGER: Administra el personal, contratos y vacaciones. Tiene bloqueada la sección de finanzas y proyectos.\n"
        "  - PROJECT_MANAGER: Administrador técnico de obras. Gestiona presupuestos, diarios y facturas de sus proyectos. Solo lectura de personal.\n"
        "  - MANAGEMENT: Acceso exclusivo de lectura para gerencia general. Visualiza gráficos del dashboard, informes analíticos y estado financiero, pero tiene bloqueado editar datos de personal o ejecutar el escaneo OCR."
    )
    
    pdf.add_section_title("Clase de Dependencia de Roles (Backend - dependencies.py):")
    pdf.add_code_snippet(
        "class RoleChecker:\n"
        "    def __init__(self, allowed_roles: List[UserRole]):\n"
        "        self.allowed_roles = allowed_roles\n"
        "    def __call__(self, user: User = Depends(get_current_user)):\n"
        "        if user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:\n"
        "            return True\n"
        "        if user.role not in self.allowed_roles:\n"
        "            raise HTTPException(status_code=403, detail=\"Permisos insuficientes\")\n"
        "        return True"
    )
    
    pdf.add_section_title("Validación de Permisos en Vistas (Frontend - AuthContext.jsx):")
    pdf.add_code_snippet(
        "const hasPermission = (permissionSlug) => {\n"
        "  if (['SUPER_ADMIN', 'ADMIN'].includes(role)) return true;\n"
        "  if (role === 'MANAGEMENT') {\n"
        "    if (permissionSlug.startsWith('employees:') || permissionSlug.includes('ocr')) return false;\n"
        "    return permissionSlug.startsWith('view:') || permissionSlug.startsWith('read:');\n"
        "  }\n"
        "  if (role === 'HR_MANAGER') {\n"
        "    return permissionSlug.startsWith('employees:') || permissionSlug.startsWith('notifications:');\n"
        "  }\n"
        "  if (role === 'PROJECT_MANAGER') {\n"
        "    return permissionSlug.startsWith('projects:') || permissionSlug.startsWith('ocr:') || permissionSlug.startsWith('view:');\n"
        "  }\n"
        "  return false;\n"
        "};"
    )

    # --- CAPITULO 4: GUIA DE INTERFACES DE USUARIO (NEW CHAPTER) ---
    pdf.add_page()
    pdf.add_chapter_title('4', 'Guía y Recorrido de Interfaces de Usuario (UI/UX)')
    pdf.add_body_text(
        "El diseño de ConstructERP sigue pautas de vanguardia en interfaces de usuario oscuras de alta legibilidad, "
        "evitando componentes básicos y utilizando degradados y efectos visuales 'glassmorphism' (tarjetas translúcidas "
        "con bordes de brillo sutil). Las principales vistas e interfaces del sistema se describen a continuación:"
    )
    
    pdf.add_section_title("4.1 Estructura del Layout General (Navegación)")
    pdf.add_body_text(
        "Una vez dentro del sistema, el usuario se encuentra con un marco de trabajo de tres áreas principales:\n"
        "  - Sidebar Lateral Izquierdo: Menú principal de accesos directos (Dashboard, RR.HH., Obras, OCR, Capataz AI, Admin) "
        "que se colapsa automáticamente en pantallas móviles. Muestra u oculta los botones de navegación dinámicamente "
        "de acuerdo al perfil de permisos del usuario logueado.\n"
        "  - TopHeader (Cabecera Superior): Barra flotante que presenta el título de la vista activa y un menú de usuario "
        "en la esquina derecha. Muestra las iniciales del usuario, su nombre completo, el rol jerárquico activo "
        "(e.g., 'Administrador', 'Gerente') y el botón para Cerrar Sesión de forma segura.\n"
        "  - Contenedor Principal: Área responsiva donde se cargan dinámicamente las páginas del sistema."
    )
    
    pdf.add_section_title("4.2 Pantalla de Acceso (Login) y Herramienta de Acceso Móvil")
    pdf.add_body_text(
        "La interfaz del Login está dividida simétricamente para proporcionar una experiencia de usuario memorable:\n"
        "  - Panel de Branding (Izquierdo): Muestra el logotipo corporativo de Serconind, un fondo animado oscuro con "
        "esferas flotantes de color azul/celeste difuminadas (orbs) y una lista de las 4 fortalezas operativas del software "
        "(Gestión de Obras, RR.HH., Reportes y Seguridad).\n"
        "  - Panel del Formulario (Derecho): Centra la tarjeta de acceso seguro. Contiene los campos de Correo Electrónico "
        "y Contraseña (con un botón interactivo de 'ojo' para revelar/ocultar los caracteres). Al hacer clic en enviar, el botón "
        "cambia a estado de carga (loading) mostrando un spinner dinámico y bloqueando reenvíos accidentales.\n"
        "  - Botón Flotante 'Acceso Móvil': Ubicado en la parte inferior derecha. Permite a los docentes o evaluadores de la "
        "disertación desplegar un código QR autogenerado en tiempo real. Al escanearlo con la cámara del celular, pueden "
        "acceder instantáneamente al sistema y comprobar cómo se adapta toda la interfaz responsiva a la pantalla móvil."
    )
    
    # Sig pag interfaces
    pdf.add_page()
    pdf.add_section_title("4.3 Central Operativa (Dashboard)")
    pdf.add_body_text(
        "El Dashboard es la pantalla inicial tras el acceso. Está optimizado para proporcionar telemetría inmediata:\n"
        "  - Tarjetas de Indicadores Clave (KPICards): Paneles informativos con iconos descriptivos y micro-animaciones. "
        "Muestran la dotación de trabajadores (alertando sobre contratos a punto de vencer), la cantidad de proyectos activos "
        "y el número de notificaciones críticas. Si el usuario es ADMIN o MANAGEMENT, se revelan datos financieros confidenciales "
        "como el sueldo mensual consolidado acumulado, presupuestos totales asignados y utilidades netas proyectadas.\n"
        "  - Gráfico de Dotación de Personal (Bar Chart): Gráfico de barras interactivo que muestra cuántos operarios están "
        "trabajando actualmente en cada proyecto activo.\n"
        "  - Gráfico de Alertas Operativas (Pie Chart): Gráfico circular que categoriza la gravedad de las alertas del sistema "
        "(Crítica en rojo, Advertencia en amarillo, Informativa en azul) con una leyenda explicativa abajo.\n"
        "  - Banner de Alerta Crítica: Un banner rojo parpadeante (animación pulse) que se activa si hay sueldos impagos, "
        "ofreciendo un botón de acceso rápido para solucionar la anomalía de manera urgente."
    )
    
    pdf.add_section_title("4.4 Gestión de Recursos Humanos (Workers)")
    pdf.add_body_text(
        "La interfaz de Recursos Humanos simplifica la administración del personal en obra:\n"
        "  - Tabla de Personal: Grid con búsqueda en tiempo real. Muestra el RUT, nombres, cargo, salario y estado (Activo/Inactivo).\n"
        "  - Ficha Técnica de Trabajador: Panel que se despliega al seleccionar un operario, mostrando su información "
        "personal completa y balance de días de vacaciones disponibles.\n"
        "  - Carga Masiva (Excel): Zona de arrastre de archivos para cargar listas de trabajadores de forma masiva a la DB.\n"
        "  - Flujo de Solicitud de Vacaciones: Permite crear solicitudes de días de descanso, calcular saldos restantes, "
        "aprobarlas jerárquicamente y generar un comprobante oficial PDF."
    )

    pdf.add_section_title("4.5 Control de Obras y Presupuestos (Projects & Details)")
    pdf.add_body_text(
        "La interfaz de obras permite rastrear el avance constructivo y financiero a través de cinco pestañas en el detalle del proyecto:\n"
        "  - Pestaña de Información: Presenta la ficha del proyecto con fechas estimadas de inicio y término, supervisor a cargo y estado general.\n"
        "  - Pestaña de Partidas (Presupuestos): Permite desglosar el presupuesto de la obra en subpresupuestos específicos "
        "(e.g., cimientos, obra gruesa, terminaciones) con semáforos de consumo que alertan visualmente cuando los montos asignados "
        "exceden los presupuestos globales permitidos.\n"
        "  - Pestaña de Finanzas: Relaciona todas las facturas y costos de mano de obra contra el presupuesto inicial de la obra.\n"
        "  - Pestaña de Trabajadores: Muestra la nómina asignada a esa faena en particular.\n"
        "  - Pestaña de Bitácora (History/Log): Registro cronológico detallado de todos los movimientos de la obra."
    )
    
    # Sig pag interfaces 2
    pdf.add_page()
    pdf.add_section_title("4.6 Digitalización Inteligente de Documentos (OCR)")
    pdf.add_body_text(
        "La interfaz de carpetas de personal y digitalización de documentos está diseñada para simplificar el flujo documental:\n"
        "  - Panel de Selección de Trabajadores: Un menú en la parte izquierda permite al usuario seleccionar al trabajador de la "
        "lista para abrir su carpeta digital.\n"
        "  - Formulario de Carga Directa: Permite subir contratos, licencias de conducir u otros documentos de forma digital "
        "ingresando el título y la categoría del documento.\n"
        "  - Lista de Archivos Vigentes: Presenta los documentos cargados al trabajador. Cuenta con un botón para abrir el documento "
        "original en un visor separado y otro botón para ejecutar la Lectura Inteligente OCR.\n"
        "  - Visor Dividido de OCR: Al escanear un archivo de imagen o PDF, se despliega una interfaz con los resultados estructurados "
        "extraídos por el motor de IA (como RUT del emisor, Razón Social, Monto Neto y Total). Esto permite contrastar visualmente "
        "la exactitud de los datos recopilados antes de confirmar su almacenamiento permanente."
    )
    
    pdf.add_section_title("4.7 Asistente Inteligente Capataz AI")
    pdf.add_body_text(
        "El Capataz AI es el centro de mando conversacional inteligente, integrado como un panel futurista de operaciones:\n"
        "  - Panel de Métricas de Salud Operacional: En la parte superior de la pantalla, muestra un puntaje de salud del sistema "
        "(Health Score) de 0 a 100%, calculado mediante un análisis de anomalías en obra (como sobrecostos y retrasos).\n"
        "  - Caja de Chat Fluido: Permite conversar con la IA (Gemini) usando lenguaje natural. La interfaz presenta burbujas de "
        "mensajes diferenciados con avatares del usuario y del Capataz AI, y un estado animado ('Capataz AI está analizando...') "
        "mientras se procesa la respuesta.\n"
        "  - Visualizador de Llamadas a Herramientas (Function Calling): Cuando la IA decide consultar la base de datos local "
        "para responder la pregunta del usuario (por ejemplo, buscar cuántos trabajadores hay en la obra 'Puente Biobío'), "
        "la interfaz dibuja un componente visual que detalla la consulta SQL o el endpoint consumido en tiempo real. Esto demuestra "
        "que el agente opera con datos verdaderos y actualizados.\n"
        "  - Botón de Informe Ejecutivo: Un botón destacado que solicita al Capataz AI compilar la información de la conversación "
        "y redactar un informe formal de gerencia que se descarga en formato PDF."
    )
    
    pdf.add_section_title("4.8 Panel de Administración y Registros de Auditoría")
    pdf.add_body_text(
        "El módulo de administración y control de registros de auditoría está reservado a roles con categoría de ADMIN:\n"
        "  - Gestor de Cuentas: Permite dar de alta nuevos usuarios del sistema, editar sus nombres y resetear contraseñas.\n"
        "  - Configuración del Sistema: Mapeo de roles y asignación de variables de entorno críticas.\n"
        "  - Visor de Auditoría de Base de Datos: Una consola que permite ver los cambios realizados por cada usuario sobre las tablas "
        "del sistema, detallando el usuario que hizo el cambio, la acción (CREATE, UPDATE, DELETE) y los valores previos y nuevos.\n"
        "  - Visor de Auditoría de la IA (AI Audit Logs): Permite a los supervisores auditar las conversaciones y consultas a la IA, "
        "así como los parámetros que el agente de datos utilizó al ejecutar herramientas internas del sistema."
    )

    # --- CAPITULO 5: MODULOS Y BASE DE DATOS (ORIGINAL 4) ---
    pdf.add_page()
    pdf.add_chapter_title('5', 'Módulos Avanzados y Estructuras de Datos')
    pdf.add_section_title("5.1 Ciclo del Proceso de Vacaciones:")
    pdf.add_body_text(
        "El módulo de Recursos Humanos implementa un flujo formal de vacaciones:\n"
        "1. Solicitud inicial: El empleado o el administrador ingresa una solicitud con la fecha de inicio y término. "
        "El backend verifica que el trabajador cuente con el saldo de días suficientes ('vacation_balance').\n"
        "2. Pre-aprobación y Generación de PDF: Al autorizarse, el sistema genera automáticamente un documento PDF "
        "oficial en la carpeta 'uploads/documents' que detalla los días a utilizar.\n"
        "3. Firma Digital: El trabajador descarga, firma e importa el comprobante firmado de regreso. Al guardarlo, "
        "se marca la solicitud con 'is_signed = True'.\n"
        "4. Deducción formal: Solo tras confirmarse la firma del documento, se ejecuta el descuento de días sobre el balance del empleado."
    )
    
    pdf.add_section_title("5.2 Extracción OCR y Autocuración de Archivos:")
    pdf.add_body_text(
        "El sistema procesa facturas utilizando un flujo resiliente ante pérdidas de archivos físicos (causadas frecuentemente por "
        "servidores de alojamiento efímeros como Render):\n"
        "1. Al subir un archivo, se almacena en el disco local y se gatilla un trigger de SQLAlchemy que extrae el binario del archivo "
        "y lo almacena como datos BLOB en la tabla 'document_data'.\n"
        "2. Si un usuario intenta descargar o visualizar un documento y el archivo físico no se encuentra en el disco, el middleware "
        "del backend detecta la ausencia del archivo en disco y lo regenera automáticamente leyendo los bytes de la base de datos "
        "(autocuración), asegurando un tiempo de disponibilidad del 100%."
    )
    
    pdf.add_section_title("Definición de Modelos Clave de Base de Datos (Backend - models.py):")
    pdf.add_code_snippet(
        "class Employee(Base):\n"
        "    __tablename__ = \"employees\"\n"
        "    id = Column(Integer, primary_key=True)\n"
        "    rut = Column(String, unique=True, nullable=False)\n"
        "    first_name = Column(String(50))\n"
        "    last_name = Column(String(50))\n"
        "    role = Column(String(50))\n"
        "    salary = Column(Integer, default=0)\n"
        "    vacation_balance = Column(Float, default=15.0)\n\n"
        "class Document(Base):\n"
        "    __tablename__ = \"documents\"\n"
        "    id = Column(GUID, primary_key=True)\n"
        "    employee_id = Column(Integer, ForeignKey(\"employees.id\"))\n"
        "    file_path = Column(String, nullable=False)\n"
        "    category = Column(String(50))\n"
        "    ocr_status = Column(String(20), default=\"PENDING\")\n"
        "    extracted_data = Column(JSON, default={})"
    )
    
    # --- CAPITULO 6: AUDITORIA (ORIGINAL 5) ---
    pdf.add_page()
    pdf.add_chapter_title('6', 'Auditoría General y del Agente de Inteligencia Artificial')
    pdf.add_body_text(
        "ConstructERP cuenta con dos bitácoras de auditoría independientes para asegurar la rendición de cuentas "
        "y el análisis forense de la información del negocio:\n\n"
        "1. Auditoría del Sistema (audit_logs): Registra transacciones críticas de base de datos realizadas por los usuarios. "
        "Almacena la tabla modificada, el ID de usuario que ejecutó la acción, el tipo de operación (CREATE, UPDATE, DELETE) y un "
        "desglose detallado en JSON con los valores anteriores y los valores nuevos tras la modificación.\n"
        "2. Auditoría del Agente AI (ai_audit_logs): Registra el uso de la Inteligencia Artificial de forma estricta. "
        "Almacena la consulta del usuario, el texto final emitido por la IA y un objeto JSON con las llamadas a herramientas "
        "(Function Calling) que el agente de datos utilizó (nombre de la herramienta, argumentos pasados y respuesta devuelta por la base de datos)."
    )
    
    pdf.add_section_title("Estructura de Base de Datos para Auditoría General:")
    pdf.add_code_snippet(
        "class AuditLog(Base):\n"
        "    __tablename__ = \"audit_logs\"\n"
        "    id = Column(GUID, primary_key=True)\n"
        "    user_id = Column(Integer, ForeignKey(\"users.id\"))\n"
        "    action = Column(String(20), nullable=False) # CREATE, UPDATE, DELETE\n"
        "    table_name = Column(String(50), nullable=False)\n"
        "    old_values = Column(JSON)\n"
        "    new_values = Column(JSON)\n"
        "    created_at = Column(DateTime, default=datetime.utcnow)"
    )

    pdf.add_section_title("Estructura de Base de Datos para Auditoría de IA:")
    pdf.add_code_snippet(
        "class AIAuditLog(Base):\n"
        "    __tablename__ = \"ai_audit_logs\"\n"
        "    id = Column(GUID, primary_key=True)\n"
        "    user_id = Column(Integer, ForeignKey(\"users.id\"))\n"
        "    query = Column(Text, nullable=False)\n"
        "    response = Column(Text)\n"
        "    tool_calls = Column(JSON, default=[]) # Herramientas e inputs\n"
        "    created_at = Column(DateTime, default=datetime.utcnow)"
    )
    
    # --- CAPITULO 7: CONSEJOS DISERTACION (ORIGINAL 6 EXTENDED) ---
    pdf.add_page()
    pdf.add_chapter_title('7', 'Consejos y Preparación para la Disertación')
    pdf.add_body_text(
        "Para realizar una presentación o defensa de título impecable frente al comité evaluador, enfóquese "
        "en los aspectos de ingeniería de software e innovación técnica que diferencian este desarrollo de "
        "un sistema común:\n\n"
        "1. Segregación Multi-inquilino (Multi-tenant):\n"
        "Explique cómo el sistema asegura que la información de una constructora esté completamente aislada de "
        "otra. Todas las consultas a nivel de base de datos filtran de forma implícita por 'organization_id' desde el token JWT.\n\n"
        "2. Defensa del Diseño de Seguridad (RBAC):\n"
        "Resalte que la seguridad por roles no es solo a nivel visual (ocultar botones en React, lo cual es fácilmente "
        "eludible editando el DOM o usando la consola del navegador), sino que se valida de forma infranqueable en cada "
        "endpoint del backend mediante dependencias de FastAPI (RoleChecker).\n\n"
        "3. Innovación en Resiliencia (Autocuración de Archivos):\n"
        "Mencione que para abaratar costos de infraestructura de desarrollo y soportar despliegues en servidores "
        "gratuitos de almacenamiento temporal (como Render), diseñó un sistema híbrido de respaldo binario en SQLite. "
        "Si el archivo físico de un contrato u OCR desaparece de la carpeta del servidor, el sistema lo autotura de "
        "forma imperceptible leyendo los bytes guardados en la base de datos relacional.\n\n"
        "4. Agente IA y Function Calling (Asistente Capataz AI):\n"
        "Enfatice que la IA no es un chatbot genérico (como una ventana integrada de ChatGPT), sino un Agente de Datos "
        "Autónomo. Al conversar con él, la IA interpreta la intención, decide qué herramientas de base de datos "
        "consultar (de solo lectura para evitar inyección de comandos o alteración de datos) y formula una respuesta "
        "personalizada con métricas reales e históricas de la obra.\n\n"
        "5. Auditoría de la IA:\n"
        "Resalte que para prevenir comportamientos alucinatorios o mal uso de la IA, el sistema audita de forma persistente "
        "todas las llamadas de herramientas del Agente, dando transparencia total a los directores del sistema."
    )
    
    # Save PDF
    pdf_filename = "Guia_de_Estudio_ConstructERP.pdf"
    pdf.output(pdf_filename)
    print(f"PDF generado con éxito: {pdf_filename}")

if __name__ == "__main__":
    generate_pdf()
