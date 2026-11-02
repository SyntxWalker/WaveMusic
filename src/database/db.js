const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'wavemusic.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!',
    mode_247 INTEGER DEFAULT 0,
    voice_channel_id TEXT,
    text_channel_id TEXT,
    volume INTEGER DEFAULT 100,
    updated_at INTEGER
  );
`);

const stmtGetSettings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
const stmtSetPrefix = db.prepare(`
  INSERT INTO guild_settings (guild_id, prefix, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    prefix = excluded.prefix,
    updated_at = excluded.updated_at
`);
const stmtSet247 = db.prepare(`
  INSERT INTO guild_settings (guild_id, mode_247, voice_channel_id, text_channel_id, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    mode_247 = excluded.mode_247,
    voice_channel_id = excluded.voice_channel_id,
    text_channel_id = excluded.text_channel_id,
    updated_at = excluded.updated_at
`);
const stmtSetVolume = db.prepare(`
  INSERT INTO guild_settings (guild_id, volume, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    volume = excluded.volume,
    updated_at = excluded.updated_at
`);
const stmtGetAll247 = db.prepare('SELECT * FROM guild_settings WHERE mode_247 = 1');

module.exports = {
  getSettings(guildId) {
    if (!guildId) return null;
    const row = stmtGetSettings.get(guildId);
    if (!row) {
      return {
        guild_id: guildId,
        prefix: config.defaultPrefix,
        mode_247: 0,
        voice_channel_id: null,
        text_channel_id: null,
        volume: 100
      };
    }
    return row;
  },

  getPrefix(guildId) {
    if (!guildId) return config.defaultPrefix;
    const row = stmtGetSettings.get(guildId);
    return row && row.prefix ? row.prefix : config.defaultPrefix;
  },

  setPrefix(guildId, prefix) {
    stmtSetPrefix.run(guildId, prefix, Date.now());
    return prefix;
  },

  get247(guildId) {
    const s = this.getSettings(guildId);
    return {
      enabled: Boolean(s && s.mode_247),
      voiceChannelId: s ? s.voice_channel_id : null,
      textChannelId: s ? s.text_channel_id : null
    };
  },

  set247(guildId, enabled, voiceChannelId = null, textChannelId = null) {
    stmtSet247.run(guildId, enabled ? 1 : 0, voiceChannelId, textChannelId, Date.now());
    return { enabled: Boolean(enabled), voiceChannelId, textChannelId };
  },

  getAll247() {
    return stmtGetAll247.all();
  },

  getVolume(guildId) {
    const s = this.getSettings(guildId);
    return s && typeof s.volume === 'number' ? s.volume : 100;
  },

  setVolume(guildId, volume) {
    stmtSetVolume.run(guildId, volume, Date.now());
    return volume;
  }
};
