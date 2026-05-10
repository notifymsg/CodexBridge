export const CODEX_NATIVE_API_PACKAGE_NAME = '@codexbridge/codex-native-api' as const;

export const CODEX_NATIVE_API_PACKAGE_PHASE = 'phase-5-first-extraction' as const;

export const CODEX_NATIVE_API_RELEASE_CHANNEL = 'internal-only' as const;

export const CODEX_NATIVE_API_OWNS = [
  'logged-in-codex-localhost-api',
  'responses-first-local-surface',
  'chat-completions-compat-surface',
  'native-runtime-readiness',
  'isolated-native-turn-execution',
  'continuation-registry',
  'native-api-side-task-routing',
  'localhost-auth-and-health',
] as const;

export const CODEX_NATIVE_API_DOES_NOT_OWN = [
  'wechat-transport',
  'telegram-transport',
  'slash-commands',
  'sendgate',
  'bridge-session-ux',
  'artifact-delivery-ui-policy',
  'external-provider-gateway-policy',
] as const;

export type CodexNativeApiOwnedResponsibility = typeof CODEX_NATIVE_API_OWNS[number];

export type CodexNativeApiExcludedResponsibility =
  typeof CODEX_NATIVE_API_DOES_NOT_OWN[number];

export * from './provider.js';
export * from './auth_state.js';
export * from './native_api_types.js';
export * from './native_api_continuation_registry.js';
export * from './native_runtime.js';
export * from './native_api_side_task_router.js';
export * from './native_api_server.js';
export * from './native_api_service.js';
