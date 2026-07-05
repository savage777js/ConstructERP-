import httpx
import json

# Login usando form-data (OAuth2PasswordRequestForm espera 'username' no 'email')
r = httpx.post(
    'http://127.0.0.1:8000/api/v1/auth/login',
    data={'username': 'admin@serconind.cl', 'password': 'admin'}
)
print('Login status:', r.status_code)
if r.status_code != 200:
    print('Login error:', r.text)
    exit()

token = r.json().get('access_token')
print('Token OK:', bool(token))

# Get workers
headers = {'Authorization': 'Bearer ' + token}
r2 = httpx.get('http://127.0.0.1:8000/api/v1/workers/', headers=headers)
print('Workers status:', r2.status_code)
data = r2.json()

if isinstance(data, list):
    print('Workers count:', len(data))
    for w in data:
        print(' -', w.get('first_name'), w.get('last_name'), '| org:', w.get('organization_id'))
else:
    print('Unexpected response:', json.dumps(data, indent=2, ensure_ascii=False))
