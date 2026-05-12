import httpx
import sys

def test_login():
    print("Iniciando diagnóstico de Login...")
    try:
        # Intentar conectar con el backend local
        response = httpx.post(
            "http://127.0.0.1:8000/api/v1/auth/login",
            data={"username": "admin@serconind.cl", "password": "admin"},
            timeout=10.0
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"Error de conexión: {e}")
        print("\nCONSEJO: Asegúrate de que uvicorn esté corriendo antes de este test.")

if __name__ == "__main__":
    test_login()
