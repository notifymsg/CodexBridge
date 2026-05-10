# @codexbridge/codex-native-api

Internal workspace package for the Codex-only localhost API facade over the
logged-in Codex app-server runtime.

Current extraction status:

- first extraction shape only
- single package, no runtime/server split yet
- internal-only release channel

Current public surface:

- `CodexNativeRuntime`
- `CodexNativeApiServer`
- `CodexNativeApiService`
- `InMemoryCodexNativeApiContinuationRegistry`

This package intentionally does not own WeChat transport, slash-command UX, or
external provider gateway policy.
