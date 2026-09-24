import io
import base64
import secrets
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

from app import main


class StudioTests(unittest.TestCase):
    def setUp(self):
        with main.rate_lock:
            main.attempts.clear()
        self.temp = TemporaryDirectory()
        self.db_patch = patch.object(main, 'DB', Path(self.temp.name) / 'test.sqlite3')
        self.outputs_patch = patch.object(main, 'OUTPUTS', Path(self.temp.name) / 'outputs')
        self.db_patch.start()
        self.outputs_patch.start()
        main.OUTPUTS.mkdir()
        with main.connect() as db:
            db.executescript((main.ROOT / 'migrations' / '001_initial.sql').read_text(encoding='utf-8'))
        self.a = TestClient(main.app)
        self.b = TestClient(main.app)
        self.email_a = f'{secrets.token_hex(6)}@example.test'
        self.email_b = f'{secrets.token_hex(6)}@example.test'

    def tearDown(self):
        self.outputs_patch.stop()
        self.db_patch.stop()
        self.temp.cleanup()

    def register(self, client, email):
        response = client.post('/api/register', json={'email': email, 'password': 'a strong password 123'})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertIn('httponly', response.headers['set-cookie'].lower())
        return response.json()['csrf']

    def test_private_routes_and_login(self):
        self.assertEqual(self.a.get('/api/images').status_code, 401)
        self.assertEqual(self.a.get('/api/me').status_code, 401)
        csrf = self.register(self.a, self.email_a)
        self.assertEqual(self.a.get('/api/me').json()['email'], self.email_a)
        self.assertEqual(self.a.post('/api/logout').status_code, 403)
        self.assertEqual(self.a.post('/api/logout', headers={'x-csrf-token': csrf}).status_code, 200)
        self.assertEqual(self.a.get('/api/me').status_code, 401)
        login = self.a.post('/api/login', json={'email': self.email_a, 'password': 'a strong password 123'})
        self.assertEqual(login.status_code, 200, login.text)
        self.assertEqual(self.a.get('/api/me').status_code, 200)

    def test_user_cannot_read_another_users_image(self):
        self.register(self.a, self.email_a)
        self.register(self.b, self.email_b)
        image_id = secrets.token_urlsafe(18)
        filename = image_id + '.png'
        Image.new('RGB', (8, 8), 'red').save(main.OUTPUTS / filename)
        with main.connect() as db:
            user = db.execute('SELECT id FROM users WHERE email=?', (self.email_a,)).fetchone()
            db.execute('INSERT INTO images VALUES(?,?,?,?,?,?,?,?)', (image_id, user['id'], 'test', 8, 8, 1, filename, main.now()))
        self.assertEqual(self.a.get(f'/api/images/{image_id}/file').status_code, 200)
        self.assertEqual(self.b.get(f'/api/images/{image_id}/file').status_code, 404)
        self.assertEqual(self.b.get('/api/images').json()['images'], [])

    def test_form_validation_and_origin(self):
        csrf = self.register(self.a, self.email_a)
        self.assertEqual(self.a.post('/api/generate', data={'prompt': 'hello'}).status_code, 403)
        self.assertEqual(self.a.post('/api/generate', data={'prompt': 'hello', 'width': 257, 'height': 512}, headers={'x-csrf-token': csrf}).status_code, 422)
        self.assertEqual(self.a.post('/api/generate', data={'prompt': 'hello', 'width': 512, 'height': 512}, files={'reference1': ('bad.png', b'bad', 'image/png')}, headers={'x-csrf-token': csrf}).status_code, 422)
        self.assertEqual(self.a.post('/api/logout', headers={'x-csrf-token': csrf, 'origin': 'https://evil.example'}).status_code, 403)

    def test_public_page_and_headers(self):
        response = self.a.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('/assets/', response.text)
        self.assertEqual(self.a.get('/app/create').status_code, 200)
        self.assertIn('Content-Security-Policy', response.headers)
        self.assertIn('nosniff', response.headers['X-Content-Type-Options'])

    def test_generation_with_mock_foundry_response(self):
        csrf = self.register(self.a, self.email_a)
        buffer = io.BytesIO()
        Image.new('RGB', (32, 32), 'blue').save(buffer, format='PNG')
        encoded = base64.b64encode(buffer.getvalue()).decode()

        class FakeResult:
            def raise_for_status(self): pass
            def json(self): return {'data': [{'b64_json': encoded}]}

        class FakeClient:
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            async def post(self, url, headers, json):
                self_payload = json
                assert self_payload['model'] == 'FLUX.2-pro'
                assert self_payload['prompt'] == 'Blue moon'
                assert 'Authorization' in headers
                return FakeResult()

        with patch.object(main, 'API_KEY', 'test-only'), patch.object(main, 'ENDPOINT', 'https://foundry.invalid/providers/blackforestlabs/v1/flux-2-pro?api-version=preview'), patch.object(main.httpx, 'AsyncClient', return_value=FakeClient()):
            response = self.a.post('/api/generate', data={'prompt': 'Blue moon', 'width': 512, 'height': 512}, headers={'x-csrf-token': csrf})
        self.assertEqual(response.status_code, 200, response.text)
        image_id = response.json()['id']
        self.assertEqual(self.a.get(f'/api/images/{image_id}/file').status_code, 200)
        self.assertEqual(self.a.get('/api/images').json()['images'][0]['prompt'], 'Blue moon')

    def test_placeholder_endpoint_is_reported_as_configuration_error(self):
        csrf = self.register(self.a, self.email_a)
        with patch.object(main, 'API_KEY', 'test-only'), patch.object(main, 'ENDPOINT', 'https://YOUR-RESOURCE.cognitiveservices.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=preview'):
            response = self.a.post('/api/generate', data={'prompt': 'Blue moon', 'width': 512, 'height': 512}, headers={'x-csrf-token': csrf})
        self.assertEqual(response.status_code, 503, response.text)


if __name__ == '__main__':
    unittest.main()
