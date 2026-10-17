# Ignite Sound Bot (TTS, Soundboard & Voice Engine)

Standalone microservice and Discord bot dedicated exclusively to:
- **Text-to-Speech (TTS):** High-fidelity voice synthesis using **Microsoft Edge TTS Neural Voices** and **Loquendo Classic**.
- **Voice Autocomplete & Custom User Preferences:** Quick lookup by flag, name, and locale (`/tts voice:`), with per-user persistent default voice choice (`/setvoice`).
- **Soundboard Engine:** Atomic JSON store for sound metadata, categorized sound clips, audio streaming, and upload management.
- **Production REST API (v1):** OpenAPI 3.1.0 compliant HTTP API mounted at `/api/v1` (with `/api` fallback for `ignite-frontend`), RFC 7807 Problem Details error format, Constant-time Bearer authentication, and Helmet security headers.
- **Serialized Voice Mutex & Anti-collision Queue:** Strict concurrency control per guild preventing audio race conditions and memory leaks.
- **Preflight & Lifecycle System:** Automated token verification, permission checks, Node version validation, and graceful teardown (`SIGINT`/`SIGTERM`).

---

## 🚀 Quick Start

### 1. Requirements
- **Node.js:** v20.0.0 or newer (v22 LTS recommended)
- **Dependencies:** Installed with native audio codec support (`@discordjs/opus`)

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Key variables:
- `DISCORD_TOKEN`: Bot token from [Discord Developer Portal](https://discord.com/developers/applications).
- `CLIENT_ID`: Bot application ID (automatically resolved during preflight if omitted).
- `GUILD_ID`: (Optional) Server ID for instant command registration during testing.
- `API_SECRET`: Secret token for REST API endpoints (minimum 32 characters in production).
- `PORT`: HTTP REST server port (default: `3002`).

### 3. Start the Bot
```bash
npm start
```
*Note: Slash commands are automatically deployed and updated using SHA-256 hash caching on startup, or you can manually deploy them with `npm run deploy`.*

---

## 🛡️ Quality Gates & Verification

The repository enforces strict quality standards mirrored from `ignite-music`:

```bash
# Syntax verification across all project files
npm run check

# ESLint flat configuration check
npm run lint

# TypeScript strict typechecking (noEmit)
npm run typecheck

# Comprehensive unit & integration test suite (Node Test Runner)
npm test

# Security vulnerability audit
npm run audit
```

---

## 🎙️ Slash Commands

- `/tts <texto> [voz] [velocidad]`: Synthesizes speech and plays it in your voice channel.
- `/setvoice <voz>`: Permanently saves your preferred default voice for `/tts`.
- `/sound <nombre> [volumen]`: Plays an audio clip from the soundboard with autocomplete.
- `/sound-add <nombre> <archivo> [categoria] [emoji]`: Uploads a sound effect to the bot (mp3/ogg/wav/webm/m4a, max 5 MB).
- `/voices`: Displays the catalog of curated neural and classic voices.
- `/stop`: Stops playback immediately and clears the pending speech queue.
- `/leave`: Disconnects the bot from the current voice channel.

---

## 🌐 REST API (`openapi.yaml`)

The service provides a standardized REST API documented in [`openapi.yaml`](./openapi.yaml):

- **Health & Diagnostics:**
  - `GET /api/v1/health`: Basic uptime probe.
  - `GET /api/v1/status`: Detailed service snapshot, memory usage, and voice metrics.
- **Voices Catalog & Preview:**
  - `GET /api/v1/voices`: List available TTS voices with metadata.
  - `POST /api/v1/tts/preview`: Synthesizes audio stream directly for web browser playback.
  - `POST /api/v1/tts/speak`: Plays TTS in a Discord voice channel.
- **Soundboard Management:**
  - `GET /api/v1/sounds`: Returns all soundboard entries.
  - `GET /api/v1/sounds/:id/preview`: Streams audio file for browser auditioning.
  - `POST /api/v1/sounds/play`: Dispatches sound clip playback in Discord.
  - `POST /api/v1/sounds/upload`: Multipart upload for new sound clips.
  - `PUT /api/v1/sounds/:id/file`: Replaces audio asset for an existing sound entry.
  - `DELETE /api/v1/sounds/:id`: Deletes metadata and unlinks audio file atomically.

---

## 📁 Architecture Overview

```
src/
├── api/             # REST API contracts, RFC 7807 errors, middleware, v1 routes & ops
├── commands/        # Slash command definitions, guards (_shared.js), index loader
├── core/            # Pino structured logger, atomic JsonStore, DNS resolution fix
├── setup/           # Bootstrap, preflight validation, diagnostic report, launcher
├── sound/           # SoundManager & audio storage handlers
├── tts/             # Providers (Edge, Loquendo), Text Sanitizer, Voice Preferences
├── voice/           # VoiceManager, GuildVoiceSession, serialized mutex lock
├── bot.js           # Discord Gateway client & event bindings
├── config.js        # Deep-frozen configuration schema
└── deploy.js        # Command registration with SHA-256 change detection
```
