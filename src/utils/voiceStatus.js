const { Routes } = require('discord.js');

async function setVoiceChannelStatus(client, channelId, statusText) {
  if (!client || !channelId) return;
  try {
    const text = statusText ? String(statusText).slice(0, 100) : '';
    await client.rest.put(Routes.channelVoiceStatus(channelId), {
      body: { status: text }
    });
  } catch (err) {
    // Silently handle if bot lacks Set Status permission or if rate-limited
  }
}

module.exports = { setVoiceChannelStatus };
