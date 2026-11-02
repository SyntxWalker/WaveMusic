require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '1565716740166385765',
  defaultPrefix: process.env.DEFAULT_PREFIX || '!',
  port: parseInt(process.env.PORT, 10) || 3000,
  colors: {
    primary: 0x8B5CF6,    // Electric Violet
    secondary: 0x6D28D9,  // Deep Violet
    accent: 0xA78BFA,     // Soft Violet
    dark: 0x0B0B12,       // Deep Black
    surface: 0x181622,    // Glass Dark
    success: 0x10B981,    // Emerald
    error: 0xEF4444,      // Crimson
    warning: 0xF59E0B     // Amber
  },
  audio: {
    sampleRate: 48000,
    channels: 2,
    defaultVolume: 100,
    bitrate: 192000
  }
};
