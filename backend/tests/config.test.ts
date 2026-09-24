import assert from 'node:assert/strict';
import { validateProductionConfig } from '../src/config.js';

assert.doesNotThrow(() => validateProductionConfig({ NODE_ENV: 'development' }));
assert.throws(() => validateProductionConfig({ NODE_ENV: 'production', COOKIE_SECURE: 'true' }));
assert.throws(() => validateProductionConfig({ NODE_ENV: 'production', APP_ORIGIN: 'http://example.com', COOKIE_SECURE: 'true' }));
assert.throws(() => validateProductionConfig({ NODE_ENV: 'production', APP_ORIGIN: 'https://example.com/path', COOKIE_SECURE: 'true' }));
assert.throws(() => validateProductionConfig({ NODE_ENV: 'production', APP_ORIGIN: 'https://example.com', COOKIE_SECURE: 'false' }));
assert.doesNotThrow(() => validateProductionConfig({ NODE_ENV: 'production', APP_ORIGIN: 'https://example.com', COOKIE_SECURE: 'true' }));
console.log('Production configuration validation passed');
