# ignite-sound — Agent & Contributor Guide

Discord soundboard & TTS bot for **Ignite**: Microsoft Edge TTS, Loquendo voices, custom soundboard playback, and a hardened Express 5 REST API for the Next.js dashboard.

---

## 1. Fast Verification & Gates (Mandatory)

Always verify all gates before marking any task as complete:

```powershell
npm run check       # Syntax check across all JavaScript source files
npm run lint        # ESLint strict validation (0 errors, 0 warnings)
npm run typecheck   # TypeScript check without emit (tsc --noEmit)
npm test            # Run automated tests via native node:test
npm run audit       # Dependencies audit (fails on high/critical advisories)
```

- **Register slash commands:** `npm run deploy`
- **Dependencies audit:** `npm run audit`

---

## 2. Directory Architecture

```text
src/
├── index.js                      # Root entry point & bootstrap caller
├── config.js                     # Frozen configuration Object.freeze()
├── bot.js                        # Discord client & gateway event bindings
├── setup/
│   ├── bootstrap.js              # Safe bootloader (no bare process.exit)
│   ├── preflight.js              # Validation orchestrator (< 200L)
│   ├── preflight-checks.js       # Pure token and filesystem validators
│   ├── launcher.js               # Lifecycle & graceful shutdown handlers
│   ├── setup-error.js            # Structured SetupError hierarchy
│   └── report.js                 # Formatted stderr / CLI reporter
├── api/
│   ├── server.js                 # Express 5 initialization + Helmet + Rate limit (< 100L)
│   ├── contracts.js              # Zod schemas, DTO serializers & RFC 7807
│   ├── middleware/
│   │   ├── auth.js               # timingSafeEqual Bearer check & X-User-Discord-Id
│   │   └── validate.js           # Zod validator (Snowflakes, bodies, query)
│   └── v1/
│       ├── router.js             # API v1 router (with legacy /api fallback)
│       ├── routes/               # status, voices, tts, sounds routes
│       └── ops/                  # Decoupled domain operations
├── sound/
│   ├── sound-manager.js          # Core soundboard facade (< 200L)
│   └── sound-upload.js           # Multer upload & audio file sanitizer
├── tts/
│   ├── tts-manager.js            # TTS orchestrator (< 200L)
│   ├── voice-registry.js         # Curated catalog of voices
│   ├── text-sanitizer.js         # Mention, URL & SSML sanitizer
│   └── providers/                # EdgeTTS, Loquendo providers
├── voice/
│   ├── voice-manager.js          # Sessions registry & voice state handler (< 150L)
│   ├── voice-session.js          # Guild voice state machine & queue (< 200L)
│   └── voice-lock.js             # Concurrency lock per guildId
├── core/
│   ├── store.js                  # Atomic async JsonStore (.tmp + fsync + drain)
│   ├── logger.js                 # Pino structured logger (never use console.log)
│   └── dns-fix.js                # Dual-stack IPv4/IPv6 resolver
└── commands/
    ├── _shared.js                # Shared interaction guards & helpers
    └── *.js                      # Slash commands
```

---

## 3. Strict Coding Directives

1. **Size Limit:** No file in `src/` may exceed **250 lines**. Core managers must remain **< 200 lines**.
2. **Zero Synchronous I/O in Hot Paths:** Never use `fs.readFileSync`, `fs.writeFileSync`, or `fs.unlinkSync` inside HTTP handlers, playback loops, or Discord commands. Persisted data must use the atomic async `JsonStore`.
3. **Fail-Fast Security:**
   - `API_SECRET` must be at least 32 characters in production.
   - Authentication must use `crypto.timingSafeEqual` over buffers.
   - Mutations (`POST`, `PUT`, `DELETE`) require the `X-User-Discord-Id` header (with verified multipart fallback).
4. **No `process.exit()`:** Throw `SetupError` (startup) or `ApiError` (API). Only `index.js` may terminate the process.
5. **Pino Logging:** Use `createLogger('scope')`. Never use `console.log` in `src/`.
6. **Documentation & Spec:** Any change or addition to the REST API must be reflected in `openapi.yaml`.
7. **Git Policy:** Never push changes to GitHub until explicitly requested by the user.

---

## 4. Testing & Mocks Conventions

- Unit tests use Node's native runner: `const { test, describe, it } = require('node:test')`.
- Assertions use `node:assert/strict`.
- External services (Discord client, voice connections, external TTS) must be mocked using test doubles or `test/helpers.js`. Tests must be runnable completely offline.
