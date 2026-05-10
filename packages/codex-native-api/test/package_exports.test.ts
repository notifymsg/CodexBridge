import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CODEX_NATIVE_API_PACKAGE_NAME,
  CODEX_NATIVE_API_PACKAGE_PHASE,
  CodexNativeApiService,
  CodexNativeApiServer,
  CodexNativeRuntime,
  InMemoryCodexNativeApiContinuationRegistry,
} from '../src/index.js';

test('package exports the first extraction metadata', () => {
  assert.equal(CODEX_NATIVE_API_PACKAGE_NAME, '@codexbridge/codex-native-api');
  assert.equal(CODEX_NATIVE_API_PACKAGE_PHASE, 'phase-5-first-extraction');
});

test('package exports the core localhost runtime surface', () => {
  const registry = new InMemoryCodexNativeApiContinuationRegistry();
  assert.equal(registry.describe().persistence, 'in_process');
  assert.equal(typeof CodexNativeRuntime, 'function');
  assert.equal(typeof CodexNativeApiServer, 'function');
  assert.equal(typeof CodexNativeApiService, 'function');
});
