import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../app.js';

test('Fastify API Core & Validation Verification', async (t) => {
  const app = buildApp();

  await t.test('GET /ready returns 200 with ready: true', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.deepEqual(body, { ready: true });
  });

  await t.test('POST /api/v1/auth/register validates schema and returns 400 for bad input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'invalid-email',
        password: '123', // too short (< 8)
        firstName: '',
        lastName: '',
      },
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.error.details));
    assert.ok(body.error.details.length >= 1);
  });

  await t.test('POST /api/v1/auth/login validates email and password length', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'not-an-email',
        password: 'short',
      },
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('GET /api/v1/auth/me rejects unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    assert.equal(response.statusCode, 401);
    const body = JSON.parse(response.body);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  await t.test('GET /api/v1/products validates sort option', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products?sort=unknown-order',
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('GET /api/v1/products validates limit bounds (max 48)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products?limit=999',
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('GET /api/v1/admin/metrics rejects unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/metrics',
    });

    assert.equal(response.statusCode, 401);
    const body = JSON.parse(response.body);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  await t.test('GET /api/v1/admin/metrics rejects customer role with 403 Forbidden', async () => {
    const customerToken = app.jwt.sign({
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'customer@test.com',
      role: 'customer',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/metrics',
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });

    assert.equal(response.statusCode, 403);
    const body = JSON.parse(response.body);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  await t.test('POST /api/v1/admin/products/csv-validate accepts admin role and parses CSV', async () => {
    const adminToken = app.jwt.sign({
      userId: '22222222-2222-2222-2222-222222222222',
      email: 'admin@atelier.in',
      role: 'admin_super',
    });

    const csvContent = `title,categorySlug,sku,size,colorName,colorHex,priceInr,stockQuantity,fabricSpecification,hsnCode,gstRate
Heavyweight Tee,shirts,TEE-S-BLK,S,Black,#000000,1490,20,100% Cotton,61091000,12`;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/products/csv-validate',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        csvContent,
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.success, true);
    assert.equal(body.data.totalRows, 1);
    assert.equal(body.data.validRows, 1);
    assert.equal(body.data.errorRows, 0);
  });

  await app.close();
});
