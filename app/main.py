"""Small image studio with server-side Foundry access and local SQLite identity."""
import base64
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')
DATA = ROOT / 'data'
OUTPUTS = DATA / 'outputs'
DATA.mkdir(exist_ok=True)
OUTPUTS.mkdir(exist_ok=True)
DB = DATA / 'studio.sqlite3'
ORIGIN = os.getenv('APP_ORIGIN', 'http://127.0.0.1:8000').rstrip('/')
COOKIE_SECURE = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
API_KEY = os.getenv('FOUNDRY_API_KEY', '')
ENDPOINT = os.getenv('FOUNDRY_ENDPOINT', '')
SESSION_AGE = 7 * 24 * 3600
rate_lock = Lock()
attempts = {}

app = FastAPI(title='Flux Secure Studio', docs_url=None, redoc_url=None, openapi_url=None)
app.mount('/static', StaticFiles(directory=ROOT / 'static'), name='static')


def connect():
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys = ON')
    return db


with connect() as db:
    db.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at INTEGER NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), prompt TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, seed INTEGER NOT NULL, filename TEXT NOT NULL, created_at TEXT NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, timestamp TEXT NOT NULL, source TEXT NOT NULL, event_type TEXT NOT NULL, user_id INTEGER, status INTEGER NOT NULL, detail TEXT NOT NULL)')


def now():
    return datetime.now(timezone.utc).isoformat()


def audit(event_type, status, user_id=None, detail=''):
    with connect() as db:
        db.execute('INSERT INTO events(timestamp,source,event_type,user_id,status,detail) VALUES(?,?,?,?,?,?)', (now(), 'flux-studio', event_type, user_id, status, detail[:180]))


def password_hash(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return f'{salt.hex()}:{digest.hex()}'


def password_valid(password, stored):
    try:
        salt, expected = stored.split(':', 1)
        actual = password_hash(password, bytes.fromhex(salt)).split(':', 1)[1]
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def limit(key, maximum, window):
    stamp = time.monotonic()
    with rate_lock:
        entries = [x for x in attempts.get(key, []) if stamp - x < window]
        if len(entries) >= maximum:
            raise HTTPException(429, 'Demasiadas solicitudes. Intenta más tarde.')
        entries.append(stamp)
        attempts[key] = entries


def current_session(request, csrf=False):
    token = request.cookies.get('studio_session', '')
    if not token:
        raise HTTPException(401, 'Inicia sesión.')
    with connect() as db:
        row = db.execute('SELECT s.user_id,s.csrf,s.expires_at,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?', (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
    if not row or row['expires_at'] < int(time.time()):
        raise HTTPException(401, 'Sesión caducada.')
    if csrf and not hmac.compare_digest(request.headers.get('x-csrf-token', ''), row['csrf']):
        raise HTTPException(403, 'Token CSRF inválido.')
    return row


def set_session(response, user_id):
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    with connect() as db:
        db.execute('INSERT INTO sessions VALUES(?,?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), user_id, csrf, int(time.time()) + SESSION_AGE))
    response.set_cookie('studio_session', token, max_age=SESSION_AGE, httponly=True, secure=COOKIE_SECURE, samesite='strict', path='/')
    return csrf


@app.middleware('http')
async def security_headers(request: Request, call_next):
    if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
        origin = request.headers.get('origin')
        if origin and origin.rstrip('/') != ORIGIN:
            return JSONResponse({'detail': 'Origen no permitido.'}, status_code=403)
        length = request.headers.get('content-length')
        if length and int(length) > 15 * 1024 * 1024:
            return JSONResponse({'detail': 'Solicitud demasiado grande.'}, status_code=413)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://images.unsplash.com; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    response.headers['Cache-Control'] = 'no-store' if request.url.path.startswith('/api/') else 'public, max-age=300'
    if COOKIE_SECURE:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response


@app.get('/')
def home():
    return FileResponse(ROOT / 'static' / 'index.html')


@app.get('/health')
def health():
    return {'status': 'ok', 'foundry_configured': bool(API_KEY and ENDPOINT)}


@app.post('/api/register')
async def register(request: Request):
    limit(('register', request.client.host), 5, 3600)
    body = await request.json()
    email = str(body.get('email', '')).strip().lower()
    password = str(body.get('password', ''))
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) or len(email) > 254 or not 12 <= len(password) <= 128:
        raise HTTPException(422, 'Correo válido y contraseña de 12 a 128 caracteres requeridos.')
    try:
        with connect() as db:
            cur = db.execute('INSERT INTO users(email,password_hash,created_at) VALUES(?,?,?)', (email, password_hash(password), now()))
            user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        audit('register_rejected', 409)
        raise HTTPException(409, 'No se pudo crear la cuenta con ese correo.')
    response = JSONResponse({'email': email})
    csrf = set_session(response, user_id)
    response.body = json.dumps({'email': email, 'csrf': csrf}).encode()
    response.headers['content-length'] = str(len(response.body))
    audit('register_success', 201, user_id)
    response.status_code = 201
    return response


@app.post('/api/login')
async def login(request: Request):
    body = await request.json()
    email = str(body.get('email', '')).strip().lower()
    password = str(body.get('password', ''))
    limit(('login-ip', request.client.host), 12, 900)
    limit(('login-user', email), 6, 900)
    with connect() as db:
        user = db.execute('SELECT id,email,password_hash FROM users WHERE email=?', (email,)).fetchone()
    if not user or not password_valid(password, user['password_hash']):
        audit('login_failed', 401)
        raise HTTPException(401, 'Credenciales incorrectas.')
    response = JSONResponse({'email': email})
    csrf = set_session(response, user['id'])
    response.body = json.dumps({'email': email, 'csrf': csrf}).encode()
    response.headers['content-length'] = str(len(response.body))
    audit('login_success', 200, user['id'])
    return response


@app.get('/api/me')
def me(request: Request):
    user = current_session(request)
    return {'email': user['email'], 'csrf': user['csrf']}


@app.post('/api/logout')
def logout(request: Request):
    user = current_session(request, csrf=True)
    token = request.cookies.get('studio_session', '')
    with connect() as db:
        db.execute('DELETE FROM sessions WHERE token_hash=?', (hashlib.sha256(token.encode()).hexdigest(),))
    response = JSONResponse({'ok': True})
    response.delete_cookie('studio_session', path='/')
    audit('logout', 200, user['user_id'])
    return response


@app.get('/api/images')
def list_images(request: Request):
    user = current_session(request)
    with connect() as db:
        rows = db.execute('SELECT id,prompt,width,height,seed,created_at FROM images WHERE user_id=? ORDER BY created_at DESC LIMIT 100', (user['user_id'],)).fetchall()
    return {'images': [dict(row) for row in rows]}


@app.get('/api/images/{image_id}/file')
def image_file(image_id: str, request: Request):
    user = current_session(request)
    with connect() as db:
        row = db.execute('SELECT filename FROM images WHERE id=? AND user_id=?', (image_id, user['user_id'])).fetchone()
    if not row:
        raise HTTPException(404, 'Imagen no encontrada.')
    return FileResponse(OUTPUTS / row['filename'], media_type='image/png', headers={'Cache-Control': 'private, no-store'})


async def checked_reference(upload):
    if upload is None or not upload.filename:
        return None
    raw = await upload.read(6 * 1024 * 1024 + 1)
    if len(raw) > 6 * 1024 * 1024:
        raise HTTPException(413, 'Referencia mayor que 6 MB.')
    try:
        image = Image.open(io.BytesIO(raw))
        image.verify()
        image = Image.open(io.BytesIO(raw)).convert('RGB')
        if image.width * image.height > 16_000_000:
            raise HTTPException(413, 'Referencia demasiado grande.')
        image.thumbnail((1024, 1024))
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=90)
        return base64.b64encode(buffer.getvalue()).decode()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(422, 'Referencia inválida.')


@app.post('/api/generate')
async def generate(request: Request, prompt: str = Form(...), width: int = Form(1024), height: int = Form(1024), seed: str = Form(''), reference1: UploadFile = File(None), reference2: UploadFile = File(None)):
    user = current_session(request, csrf=True)
    limit(('generate', user['user_id']), 8, 3600)
    if not 1 <= len(prompt.strip()) <= 2000:
        raise HTTPException(422, 'Prompt de 1 a 2000 caracteres requerido.')
    if width < 256 or height < 256 or width > 2048 or height > 2048 or width % 16 or height % 16 or width * height > 4_194_304:
        raise HTTPException(422, 'Dimensiones inválidas.')
    try:
        value_seed = int(seed) if seed.strip() else secrets.randbelow(2_147_483_646) + 1
        if not 0 <= value_seed <= 2_147_483_647:
            raise ValueError()
    except ValueError:
        raise HTTPException(422, 'Seed inválida.')
    refs = [await checked_reference(reference1), await checked_reference(reference2)]
    if not API_KEY or not ENDPOINT:
        raise HTTPException(503, 'Foundry aún no está configurado.')
    payload = {'model': 'FLUX.2-pro', 'prompt': prompt.strip(), 'width': width, 'height': height, 'output_format': 'png', 'seed': value_seed, 'safety_tolerance': 0}
    for index, ref in enumerate(refs):
        if ref:
            payload['input_image' if index == 0 else 'input_image_2'] = ref
    try:
        async with httpx.AsyncClient(timeout=300) as client:
            result = await client.post(ENDPOINT, headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}, json=payload)
        result.raise_for_status()
        encoded = result.json()['data'][0]['b64_json']
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > 20 * 1024 * 1024:
            raise ValueError('large response')
        image = Image.open(io.BytesIO(raw))
        image.verify()
        image = Image.open(io.BytesIO(raw)).convert('RGB')
    except (httpx.HTTPError, KeyError, IndexError, ValueError, UnidentifiedImageError, OSError):
        audit('generation_failed', 502, user['user_id'])
        raise HTTPException(502, 'La generación falló. Intenta de nuevo.')
    image_id = secrets.token_urlsafe(18)
    filename = image_id + '.png'
    image.save(OUTPUTS / filename, format='PNG')
    with connect() as db:
        db.execute('INSERT INTO images VALUES(?,?,?,?,?,?,?,?)', (image_id, user['user_id'], prompt.strip(), width, height, value_seed, filename, now()))
    audit('generation_success', 201, user['user_id'])
    return {'id': image_id, 'seed': value_seed}
