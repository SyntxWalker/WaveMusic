const express = require('express');
const path = require('path');
const config = require('../config');

function createWebServer(client) {
  const app = express();

  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());

  // API: System & Bot Statistics
  app.get('/api/stats', (req, res) => {
    const activeStreams = client.music.queues.filter(q => q.currentTrack).size;
    const totalQueues = client.music.queues.size;
    const memUsageMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

    res.json({
      botName: client.user ? client.user.username : 'WaveMusic',
      botAvatar: client.user ? client.user.displayAvatarURL() : '',
      guildCount: client.guilds.cache.size,
      ping: Math.round(client.ws.ping),
      uptimeSeconds: Math.floor((client.uptime || 0) / 1000),
      activeStreams,
      totalQueues,
      memoryMB: memUsageMB,
      clientId: config.clientId
    });
  });

  // API: Live Now Playing tracks
  app.get('/api/nowplaying', (req, res) => {
    const activeList = [];
    client.music.queues.forEach((queue, guildId) => {
      if (queue.currentTrack) {
        activeList.push({
          guildName: queue.guild.name,
          title: queue.currentTrack.title,
          artist: queue.currentTrack.author,
          thumbnail: queue.currentTrack.thumbnail,
          durationFormatted: queue.currentTrack.durationFormatted,
          currentSec: queue.getCurrentPlaybackSeconds(),
          totalSec: queue.currentTrack.duration,
          paused: queue.paused,
          loopMode: queue.loopMode,
          mode247: queue.mode247
        });
      }
    });

    res.json({ activeList });
  });

  // API: Health Check (for 24/7 Hosting platforms and Keep-Alive Pings)
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: Math.floor((client.uptime || 0) / 1000) });
  });

  // Legal Pages
  app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
  });

  app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
  });

  // API: Invite Redirect
  app.get('/invite', (req, res) => {
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${config.clientId}&permissions=36768832&scope=bot%20applications.commands`;
    res.redirect(inviteUrl);
  });

  const server = app.listen(config.port, () => {
    console.log(`[Web Dashboard] Server running at http://localhost:${config.port}`);
  });

  return server;
}

module.exports = { createWebServer };
