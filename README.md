# Ignite Sound Bot (TTS, Soundboard & Trigger Engine)

Standalone module and bot dedicated exclusively to:
- **Text-to-Speech (TTS):** Voice synthesis in Discord channels using **Microsoft Edge TTS neural voices** and **Loquendo**.
- **Voice Autocomplete:** Quick search by flag, name, and accent (`/tts voice:`).
- **Built-in REST API:** HTTP endpoints to preview voices and connect with `ignite-frontend`.
- **Smooth Playback Queue:** Prevents audio collisions when multiple users send messages at the same time.

---

## 🚀 Quick Start

### 1. Environment Variables
Copy the `.env.example` file to `.env` and set your Discord credentials:

```bash
cp .env.example .env
```

Set in `.env`:
- `DISCORD_TOKEN`: Your bot token from [Discord Developer Portal](https://discord.com/developers/applications).
- `CLIENT_ID`: Your bot's application ID.
- `GUILD_ID`: (Optional) Your test server ID for instant command registration.

### 2. Register Slash Commands
```bash
npm run deploy
```

### 3. Start the Bot
```bash
npm start
```

---

## 🎙️ Available Commands

- `/tts <text> [voice] [speed]`: Synthesizes the message and plays it in your voice channel.
- `/sound <name> [volume]`: Plays a soundboard effect in your voice channel (with autocomplete).
- `/voices`: Shows the full voice catalog with flags and identifiers.
- `/stop`: Stops the current playback and clears the pending message queue.
- `/leave`: Disconnects the bot from the voice channel.

---

## 🔊 Soundboard: where sounds are stored

- **Metadata:** `data/sounds.json` (id, name, emoji, category, `file`, `playsCount`).
- **Binaries:** `data/sounds/*.mp3` (recommended max 2 MB / 10 s per effect).
- The initial catalog (12 sounds) lives in `src/sound/SoundManager.js` (`DEFAULT_SOUNDS`)
  and is written to `data/sounds.json` on first boot. Without a binary (`file: null`),
  the sound only works as a local preview in the dashboard until the `.mp3` is uploaded.

---

## 🌐 REST API for Dashboard (`ignite-frontend`)

The bot includes a lightweight HTTP server (default port `3002`):
- `GET /api/status`: Service status and uptime.
- `GET /api/voices`: Voice list in JSON format for dashboard dropdown menus.
- `POST /api/tts/preview`: Generates an MP3 audio stream to play directly in the browser (`<audio controls>`).
- `GET /api/sounds`: Soundboard catalog (`{ total, sounds }`, with `hasFile` flag).
- `GET /api/sounds/:id/preview`: `.mp3` stream for the web (404 + `code: NO_AUDIO_FILE` if it has no binary yet).
- `POST /api/sounds/play`: Plays a sound in Discord (`{ guildId, channelId, soundId, volume }`).
