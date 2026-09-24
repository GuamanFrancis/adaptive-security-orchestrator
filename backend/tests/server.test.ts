import http from 'node:http';
import assert from 'node:assert';
import sharp from 'sharp';
import { app } from '../src/index.js';
import { prisma } from '../src/db.js';
import { buildIdentityPack } from '../src/imageUtils.js';

let server: http.Server;
const BASE_URL = 'http://127.0.0.1:8999';

async function request(path: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}): Promise<{ status: number; headers: Headers; json: () => Promise<any>; text: () => Promise<string> }> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
  });
  return {
    status: res.status,
    headers: res.headers,
    json: () => res.json(),
    text: () => res.text(),
  };
}

async function runTests() {
  console.log('🧪 Starting TypeScript / Prisma backend test suite...');

  server = app.listen(8999, '127.0.0.1');

  try {
    // 1. Health check
    console.log('1. Testing /health...');
    const health = await request('/health');
    assert.strictEqual(health.status, 200);
    const healthJson = await health.json();
    assert.strictEqual(healthJson.status, 'ok');
    assert.strictEqual(typeof healthJson.foundry_configured, 'boolean');
    assert.strictEqual(healthJson.version, '2.5.0');
    assert.ok(health.headers.get('x-request-id'));
    const csp = health.headers.get('content-security-policy') || '';
    assert.ok(csp.includes("script-src 'self'"));
    assert.ok(!csp.includes("'unsafe-eval'"));
    const blockedOrigin = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5999' },
      body: JSON.stringify({ email: 'blocked@example.com', password: 'StrongPassword1234!' }),
    });
    assert.strictEqual(blockedOrigin.status, 403);
    const rejectedUpload = await request('/api/images/upload', { method: 'POST' });
    assert.strictEqual(rejectedUpload.status, 403);
    console.log('   ✓ /health returned ok');

    // 2. Catalog check
    console.log('2. Testing /api/catalog...');
    const catalog = await request('/api/catalog');
    assert.strictEqual(catalog.status, 200);
    assert.strictEqual(catalog.headers.get('cache-control'), 'no-store');
    const catalogJson = await catalog.json();
    assert.strictEqual(Array.isArray(catalogJson.catalog), true);
    assert.strictEqual(catalogJson.catalog.length, 24);
    assert.strictEqual(catalogJson.catalog[0].id, 'cat-01');
    console.log(`   ✓ /api/catalog returned ${catalogJson.catalog.length} 4K items`);

    // 3. User registration & validation
    console.log('3. Testing registration and authentication...');
    const testEmailA = `test-ts-${Date.now()}@example.com`;
    const testPassword = 'StrongPassword1234!';

    // Short password -> 422
    const badReg = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailA, password: 'short' }),
    });
    assert.strictEqual(badReg.status, 422);

    // Valid registration -> 201
    const regRes = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailA, password: testPassword }),
    });
    assert.strictEqual(regRes.status, 201);
    const regJson = await regRes.json();
    assert.strictEqual(regJson.email, testEmailA);
    assert.ok(regJson.csrf);

    const setCookie = regRes.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('session_id='));
    const sessionCookieA = setCookie.split(';')[0];
    const csrfA = regJson.csrf;
    console.log('   ✓ User A registered and session cookie issued');

    // Duplicate email -> 409
    const dupReg = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailA, password: testPassword }),
    });
    assert.strictEqual(dupReg.status, 409);
    console.log('   ✓ Duplicate email rejected with 409');

    // 4. Me endpoint
    console.log('4. Testing /api/me...');
    const meRes = await request('/api/me', {
      headers: { Cookie: sessionCookieA },
    });
    assert.strictEqual(meRes.status, 200);
    const meJson = await meRes.json();
    assert.strictEqual(meJson.email, testEmailA);
    console.log('   ✓ /api/me confirmed authenticated user');

    // 5. Register User B for isolation checks
    const testEmailB = `user-b-${Date.now()}@example.com`;
    const regResB = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailB, password: testPassword }),
    });
    const sessionCookieB = regResB.headers.get('set-cookie')!.split(';')[0];

    // 6. Upload photo to library
    console.log('5. Testing /api/images/upload with Sharp...');
    const testImageBuffer = await sharp({
      create: { width: 120, height: 120, channels: 3, background: { r: 100, g: 200, b: 255 } },
    }).png().toBuffer();

    const formData = new FormData();
    formData.append('file', new Blob([testImageBuffer], { type: 'image/png' }), 'test.png');
    formData.append('prompt', 'Test uploaded photo');

    const uploadRes = await fetch(`${BASE_URL}/api/images/upload`, {
      method: 'POST',
      headers: {
        Cookie: sessionCookieA,
        'x-csrf-token': csrfA,
      },
      body: formData,
    });
    assert.strictEqual(uploadRes.status, 200);
    const uploadJson = await uploadRes.json();
    assert.ok(uploadJson.id);
    const uploadedId = uploadJson.id;
    console.log(`   ✓ Image uploaded successfully (id: ${uploadedId})`);

    // User A can access the image file
    const fileResA = await request(`/api/images/${uploadedId}/file`, {
      headers: { Cookie: sessionCookieA },
    });
    assert.strictEqual(fileResA.status, 200);

    // User B cannot access User A's image file (404)
    const fileResB = await request(`/api/images/${uploadedId}/file`, {
      headers: { Cookie: sessionCookieB },
    });
    assert.strictEqual(fileResB.status, 404);
    console.log('   ✓ User isolation enforced: User B cannot access User A image');

    // Delete image by User A
    const delRes = await request(`/api/images/${uploadedId}`, {
      method: 'DELETE',
      headers: {
        Cookie: sessionCookieA,
        'x-csrf-token': csrfA,
      },
    });
    assert.strictEqual(delRes.status, 200);
    console.log('   ✓ Image deleted successfully');

    const wideImage = await sharp({ create: { width: 4500, height: 20, channels: 3, background: 'white' } }).png().toBuffer();
    const wideForm = new FormData();
    wideForm.append('file', new Blob([wideImage], { type: 'image/png' }), 'wide.png');
    const wideRes = await fetch(`${BASE_URL}/api/images/upload`, {
      method: 'POST', headers: { Cookie: sessionCookieA, 'x-csrf-token': csrfA }, body: wideForm,
    });
    assert.strictEqual(wideRes.status, 200);
    const wideJson = await wideRes.json();
    assert.strictEqual(wideJson.width, 4096);
    await request(`/api/images/${wideJson.id}`, { method: 'DELETE', headers: { Cookie: sessionCookieA, 'x-csrf-token': csrfA } });

    // 7. Identity pack composition
    console.log('6. Testing Identity Pack synthesis with Sharp...');
    const ref1 = await sharp({ create: { width: 200, height: 200, channels: 3, background: 'red' } }).jpeg().toBuffer();
    const ref2 = await sharp({ create: { width: 200, height: 200, channels: 3, background: 'blue' } }).jpeg().toBuffer();
    const pack = await buildIdentityPack([ref1, ref2], '2x3', 256, 10, '#0b1220');
    assert.ok(pack.length > 1000);
    const packMeta = await sharp(pack).metadata();
    assert.strictEqual(packMeta.format, 'jpeg');
    console.log(`   ✓ Identity pack built successfully (${packMeta.width}x${packMeta.height})`);

    console.log('\n🎉 ALL 7 TEST SUITES PASSED! Pure TypeScript + Prisma stack is 100% operational!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  if (server) server.close();
  process.exit(1);
});
