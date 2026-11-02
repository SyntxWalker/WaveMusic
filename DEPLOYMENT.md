# 🚀 24/7 Free Forever Cloud Deployment Guide for WaveMusic

This guide walks you through deploying **WaveMusic** to free cloud hosting platforms so the bot stays online **24/7 without needing your PC to stay on**.

---

## 🌟 Comparison of Free Hosting Platforms

| Platform | Cost | Credit Card? | RAM / CPU | Sleeps? | Recommended For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hugging Face Spaces** | **100% Free Forever** | **NO** | **16 GB RAM / 2 vCPU** | **NO (Always On)** | ⭐ **Top Pick (Easiest & Most Powerful)** |
| **Koyeb Eco Tier** | **100% Free Forever** | **NO** | 512 MB / 2 vCPU | **NO (Always On)** | Great alternative via GitHub |
| **Render.com + Ping** | **100% Free Forever** | **NO** | 512 MB / 0.5 vCPU | Sleeps after 15m unless pinged | Best if you use UptimeRobot |

---

## 🥇 Method 1: Hugging Face Spaces (Recommended • 100% Free Forever • No Card Needed)

Hugging Face Spaces provides a **free 16 GB RAM / 2 vCPU Docker container** that runs 24/7 continuously. Because WaveMusic includes an Express web dashboard and Dockerfile, it runs effortlessly on Hugging Face.

### Step 1: Create a Free Hugging Face Account
1. Go to [https://huggingface.co/join](https://huggingface.co/join) and create a free account.

### Step 2: Create a New Space
1. Click your profile avatar in the top right and select **New Space** (or visit [https://huggingface.co/new-space](https://huggingface.co/new-space)).
2. Set **Space name**: `WaveMusic`
3. Set **License**: `mit`
4. Select **Space SDK**: **Docker** (choose **Blank**).
5. Space hardware: Keep **CPU basic • 2 vCPU · 16 GB · Free**.
6. Set visibility: **Public** or **Private**.
7. Click **Create Space**.

### Step 3: Configure Bot Secrets
1. In your new Space, click on the **Settings** tab.
2. Scroll down to **Variables and secrets**.
3. Under **Secrets**, click **New secret** and add:
   - **Name:** `DISCORD_TOKEN`
   - **Value:** `<YOUR_DISCORD_BOT_TOKEN>`
4. Click **New secret** again:
   - **Name:** `CLIENT_ID`
   - **Value:** `1565716740166385765`
5. Under **Variables**, click **New variable**:
   - **Name:** `DEFAULT_PREFIX`
   - **Value:** `+`

### Step 4: Upload Your Bot Files
You can upload via Web UI or via Git:

#### Option A: Direct Web Upload (No Git required)
1. In your Space, click the **Files** tab.
2. Click **Add file** -> **Upload files**.
3. Drag and drop all project files from `e:\Projects\WaveMusic` (except `node_modules` and `.env`).
4. Click **Commit changes to main**.

#### Option B: Via Git (Terminal)
In your local command prompt or PowerShell:
```bash
cd "e:\Projects\WaveMusic"
git remote add space https://huggingface.co/spaces/<YOUR_USERNAME>/WaveMusic
git add .
git commit -m "Deploy WaveMusic 24/7"
git push space master:main
```

### Step 5: Live 24/7
Hugging Face will automatically build the Docker image (installs Node 22, Python, yt-dlp, FFmpeg) and boot the bot.
- You will see the live logs: `[WaveMusic Engine] Online as WaveMusic#5461`.
- Your public web dashboard and Terms/Privacy pages will be available at `https://huggingface.co/spaces/<YOUR_USERNAME>/WaveMusic`.
- Your bot will stay **online 24/7 forever** without your PC running!

---

## 🥈 Method 2: Koyeb Eco Free Tier (100% Free 24/7 Container)

Koyeb offers an Eco container tier with 512MB RAM and 2 vCPUs that never sleeps and is completely free forever.

### Step 1: Push Project to GitHub
1. Go to [https://github.com/new](https://github.com/new) and create a repository named `WaveMusic` (can be Private).
2. Push your local project:
   ```bash
   cd "e:\Projects\WaveMusic"
   git remote add origin https://github.com/<YOUR_GITHUB_USER>/WaveMusic.git
   git add .
   git commit -m "Deploy WaveMusic"
   git push -u origin master
   ```

### Step 2: Deploy on Koyeb
1. Sign up at [https://app.koyeb.com](https://app.koyeb.com).
2. Click **Create App**.
3. Choose **GitHub** as the deployment source and select your `WaveMusic` repository.
4. Under **Builder**, select **Dockerfile**.
5. Under **Instance type**, choose **Eco (Free)**.
6. Under **Environment variables**, click **Add Variable**:
   - `DISCORD_TOKEN` = `<YOUR_DISCORD_BOT_TOKEN>`
   - `CLIENT_ID` = `1565716740166385765`
   - `DEFAULT_PREFIX` = `+`
7. Click **Deploy**. Koyeb builds the container and keeps it running 24/7.

---

## 🥉 Method 3: Render.com + Free UptimeRobot Ping

Render provides free Docker Web Services. To keep the free tier awake 24/7 without sleeping after 15 minutes:

### Step 1: Deploy on Render
1. Push project to GitHub (see Method 2 above).
2. Sign in to [https://render.com](https://render.com).
3. Click **New +** -> **Web Service**.
4. Connect your `WaveMusic` GitHub repository.
5. In **Environment**, choose **Docker**.
6. Select the **Free** instance type.
7. Under **Environment Variables**, add:
   - `DISCORD_TOKEN` = your bot token
   - `CLIENT_ID` = `1565716740166385765`
   - `DEFAULT_PREFIX` = `+`
8. Click **Create Web Service**. Render deploys your bot and gives you a URL (e.g. `https://wavemusic-xxxx.onrender.com`).

### Step 2: Set Up 24/7 Keep-Alive Ping
1. Go to [https://uptimerobot.com](https://uptimerobot.com) (or [https://cron-job.org](https://cron-job.org)) and create a free account.
2. Click **Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `WaveMusic Bot KeepAlive`
   - **URL (or IP):** `https://wavemusic-xxxx.onrender.com/health`
   - **Monitoring Interval:** Every `5 minutes`
3. Click **Create Monitor**.
4. Every 5 minutes, UptimeRobot pings `/health`, preventing Render from ever sleeping. Your bot stays online 24/7/365!

---

## 📋 Verifying Cloud Deployment

Once deployed on any platform:
1. In Discord, verify that `WaveMusic#5461` shows the **Online (green)** status indicator.
2. Join your voice channel and type `+p Starboy` or `/play Billie Jean`.
3. Type `+247` to lock the bot in your voice channel 24/7.
4. Visit your deployment's web URL to see the live statistics, `/terms`, and `/privacy` pages!
