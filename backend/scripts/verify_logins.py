import httpx

TESTS = [
    ("admin@serconind.cl",             "admin"),
    ("superadmin@serconind.cl",        "admin"),
    ("gerente@serconind.cl",           "gerente"),
    ("rhh@serconind.cl",               "rrhh"),
    ("rrhh@serconind.cl",              "rrhh"),
    ("proyectos@serconind.cl",         "proyectos"),
    ("EncargadoProyecto@serconind.cl", "proyectos"),
]

print("=== Verificando logins en backend local (Supabase) ===\n")
for email, pwd in TESTS:
    r = httpx.post(
        "http://127.0.0.1:8000/api/v1/auth/login",
        data={"username": email, "password": pwd},
        timeout=10
    )
    status = "[OK]" if r.status_code == 200 else "[FAIL]"
    print(f"  {status} {email} / {pwd}  ->  HTTP {r.status_code}")
