# 🌊 WaveMusic — Full-Stack Discord Music Bot

A full-stack, studio-grade Discord music bot built for modern Discord communities. Designed with a **standalone glassmorphic canvas image miniplayer**, **Spotify-first studio catalogue resolution**, **lossless 256kbps 48kHz Opus audio mastering**, **simple uncolored embedded controls**, **voice channel status synchronization**, **24/7 channel locking**, and a **built-in web dashboard with Terms of Service and Privacy Policy**.

---

## 🔗 Quick Bot Invite Link

Add WaveMusic to your Discord server in one click:
👉 **[Click Here to Invite WaveMusic to Your Server](https://discord.com/oauth2/authorize?client_id=1565716740166385765&permissions=36768832&scope=bot%20applications.commands)**

*Required Permissions:* Connect, Speak, Send Messages, Embed Links, Attach Files, View Channels, Set Voice Channel Status.

---

## ⚡ 1-Click Free 24/7 Cloud Deployment

Deploy WaveMusic to the cloud with one click so it stays online 24/7 without keeping your computer on:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/SyntxWalker/WaveMusic)
&nbsp;&nbsp;
[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/SyntxWalker/WaveMusic&branch=master&name=wavemusic)

*(See [DEPLOYMENT.md](DEPLOYMENT.md) for the Hugging Face Spaces 16GB RAM guide with zero credit card needed).*

---

## ✨ Features

- **🟢 Spotify-First Studio Resolution Engine:**
  - Queries the official Spotify / Studio master catalogue for every track search (e.g. `+p Billie Jean` or `+p Starboy`).
  - Fetches clean metadata, artist names, and 1000×1000 high-res original album artwork.
  - Matches official Topic/Record Label studio recordings, strictly avoiding noisy music video skits, dialogue, or fan covers.

- **🖼️ Glassmorphism Canvas Image Miniplayer (Card Only):**
  - High-resolution dynamic image card generated via `@napi-rs/canvas` without bulky embed borders.
  - Transparent frosted glass theme with the **song's original cover art** softly blurred in the ambient background.
  - Official **WaveMusic Logo**, crisp white typography, electric violet highlights (`#8B5CF6`), and deep black contrast.
  - Single-card generation on playback start with in-place button updates.

- **🎛️ Simple Embedded Buttons (No Colors, Zero Emojis):**
  - Minimalistic, tactile Discord buttons using clean neutral grey styling (`ButtonStyle.Secondary`).
  - Text-only labels without emojis: `Pause` / `Resume`, `Skip`, `Loop`, `Stop`, `Queue`, `Shuffle`, `Lyrics`, `Vol -`, `Vol +`.

- **🎙️ Automatic Voice Channel Status:**
  - Whenever a song starts playing, WaveMusic automatically sets the voice channel status:
    `🎶・<song name>`
  - Clears automatically when playback stops, finishes, or disconnects.

- **🎧 Studio-Grade 256kbps Mastered Audio Engine:**
  - Direct native Opus passthrough (`StreamType.OggOpus`) avoiding JavaScript encoding bottlenecks.
  - Studio Resampling (`aresample=48000:resampler=swr:precision=28:dither_method=triangular`).
  - Volume headroom normalization (EBU R128 true peak -1.0 dB).

- **⚙️ Prefix & Slash Command Support:**
  - Supports both **Slash Commands (`/play`)** and **Prefix Commands (`+play`, `!play`)**.
  - Mention prefix support: `@WaveMusic play <song>`.
  - Configurable server prefix via `/prefix <symbol>`.

- **🔒 24/7 Channel Lock (`/247`):**
  - Locks into your voice channel 24/7.
  - Persisted in local SQLite database (`wavemusic.db`) with automatic reconnect on bot boot.

- **📜 Legal & Compliance (Terms & Privacy):**
  - Dedicated web pages: [`/terms`](http://localhost:3000/terms) (Terms & Conditions) and [`/privacy`](http://localhost:3000/privacy) (Privacy Policy with zero-recording guarantee).

---

## 🚀 24/7 Free Forever Cloud Deployment

Want to keep WaveMusic running 24/7 without keeping your PC on? Check out our complete deployment guide:

👉 **[Read the 24/7 Cloud Deployment Guide (DEPLOYMENT.md)](DEPLOYMENT.md)**

Features turnkey deployment configs for:
1. **Hugging Face Spaces** (100% Free Forever • 16GB RAM • No Credit Card • Never Sleeps)
2. **Koyeb Eco Tier** (100% Free Forever • Dockerfile • Always On)
3. **Render.com + UptimeRobot Ping** (Free 24/7 Web Service)

---

## 📋 Command Reference

| Command | Slash Command | Description | Example |
| :--- | :--- | :--- | :--- |
| `+play <query>` | `/play <query>` | Play from Spotify, YouTube, or track name | `+play Starboy The Weeknd` |
| `+search <query>` | `/search <query>` | Search and choose from top 5 tracks | `+search Bohemian Rhapsody` |
| `+247` | `/247` | Toggle 24/7 channel locking | `+247` |
| `+lyrics [song]` | `/lyrics [song]` | View lyrics for current or queried song | `+lyrics Blinding Lights` |
| `+prefix <symbol>` | `/prefix [symbol]` | View or customize server prefix | `+prefix ?` |
| `+pause` / `+resume` | `/pause` / `/resume` | Pause / Resume playback | `+pause` |
| `+skip` | `/skip` | Skip current track | `+skip` |
| `+stop` | `/stop` | Stop playback and clear queue | `+stop` |
| `+loop [mode]` | `/loop [mode]` | Set loop mode (`off`, `track`, `queue`) | `+loop track` |
| `+queue` | `/queue` | View upcoming songs with pagination | `+queue` |
| `+volume <0-150>` | `/volume <0-150>` | Adjust player volume | `+volume 90` |
| `+shuffle` | `/shuffle` | Randomize upcoming tracks | `+shuffle` |
| `+nowplaying` | `/nowplaying` | Resend current Miniplayer card | `+nowplaying` |
| `+clear` | `/clear` | Clear upcoming songs from queue | `+clear` |
| `+stats` | `/stats` | View latency, uptime, and players | `+stats` |

---

## 🌐 Web Dashboard
- Open [http://localhost:3000](http://localhost:3000) in your browser.
- Live server count, ping, memory, terms of service, and privacy policy.
