# Ignite Sound Bot (TTS, Soundboard & Trigger Engine)

Módulo y bot independiente dedicado exclusivamente a:
- **Text-to-Speech (TTS):** Síntesis de voz en canales de Discord usando **voces neuronales de Microsoft Edge TTS** y **Loquendo**.
- **Autocompletado de Voces:** Búsqueda rápida por bandera, nombre y acento (`/tts voz:`).
- **API REST Integrada:** Endpoints HTTP para previsualizar voces y conectar con `ignite-frontend`.
- **Cola de Reproducción Fluida:** Evita colisiones de audio cuando varios usuarios envían mensajes al mismo tiempo.

---

## 🚀 Inicio Rápido

### 1. Variables de Entorno
Copia el archivo `.env.example` a `.env` y configura tus credenciales de Discord:

```bash
cp .env.example .env
```

Configura en [.env](file:///c:/Users/Usuario/Documents/Proyectos/ignite/ignite-sound/.env):
- `DISCORD_TOKEN`: Token de tu bot en [Discord Developer Portal](https://discord.com/developers/applications).
- `CLIENT_ID`: ID de aplicación de tu bot.
- `GUILD_ID`: (Opcional) ID de tu servidor de pruebas para registrar comandos al instante.

### 2. Registrar Comandos Slash
```bash
npm run deploy
```

### 3. Iniciar el Bot
```bash
npm start
```

---

## 🎙️ Comandos Disponibles

- `/tts <texto> [voz] [velocidad]`: Sintetiza el mensaje y lo reproduce en tu canal de voz.
- `/voices`: Muestra el catálogo completo de voces disponibles con sus banderas e identificadores.
- `/stop`: Detiene la reproducción actual y limpia la cola de mensajes pendientes.
- `/leave`: Desconecta al bot del canal de voz.

---

## 🌐 API REST para Dashboard (`ignite-frontend`)

El bot incluye un servidor HTTP ligero (puerto por defecto `3002`):
- `GET /api/status`: Estado y tiempo activo del servicio.
- `GET /api/voices`: Lista de voces en formato JSON para menús desplegables del dashboard.
- `POST /api/tts/preview`: Genera un stream de audio MP3 para reproducir directamente en el navegador (`<audio controls>`).
