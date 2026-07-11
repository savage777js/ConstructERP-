import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings

# Derivar una clave Fernet válida (32 bytes url-safe base64) a partir de la SECRET_KEY
key_hash = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
FERNET_KEY = base64.urlsafe_b64encode(key_hash)
fernet = Fernet(FERNET_KEY)

def encrypt_value(val: str) -> str:
    """Encripta un valor de texto usando Fernet (AES-128 en modo CBC con HMAC)."""
    if not val:
        return val
    try:
        encrypted_bytes = fernet.encrypt(val.encode('utf-8'))
        return encrypted_bytes.decode('utf-8')
    except Exception as e:
        print(f"[ERROR] Error al encriptar: {e}")
        return val

def decrypt_value(val: str) -> str:
    """Decodifica un valor encriptado. Si falla o ya era texto plano, retorna el valor original."""
    if not val:
        return val
    try:
        decrypted_bytes = fernet.decrypt(val.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception:
        # Fallback para registros existentes no cifrados
        return val
