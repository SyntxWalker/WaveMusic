const {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const AudioExtractor = require('../audio/extractor');
const AudioStreamer = require('../audio/streamer');
const MiniplayerUI = require('../ui/miniplayer');
const SafeMessenger = require('../utils/safeMessenger');
const db = require('../database/db');
const { setVoiceChannelStatus } = require('../utils/voiceStatus');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

class GuildQueue {
  constructor(manager, guild, textChannel) {
    this.manager = manager;
    this.guild = guild;
    this.textChannel = textChannel;
    this.voiceChannel = null;

    this.connection = null;
    this.player = createAudioPlayer();
    this.resource = null;

    this.tracks = [];
    this.currentTrack = null;
    this.loopMode = 'off'; // 'off' | 'track' | 'queue'
    this.paused = false;

    // Load persisted settings from SQLite
    const settings = db.getSettings(guild.id);
    this.volume = settings ? settings.volume : 100;
    this.mode247 = Boolean(settings && settings.mode_247);

    this.miniplayerMessage = null;
    this.playbackStart = null;
    this.idleTimer = null;

    this.initPlayerEvents();
  }

  initPlayerEvents() {
    this.player.on(AudioPlayerStatus.Playing, () => {
      this.paused = false;
      this.playbackStart = Date.now();
      this.clearIdleTimer();

      // Set Voice Channel Status with song name: "🎶・song name"
      if (this.voiceChannel && this.currentTrack) {
        setVoiceChannelStatus(
          this.manager.client,
          this.voiceChannel.id,
          `🎶・${this.currentTrack.title}`
        );
      }

      // Generate and send single card ONE TIME ONLY
      this.sendMiniplayer();
    });

    this.player.on(AudioPlayerStatus.Paused, () => {
      this.paused = true;
      this.updateComponentsOnly();
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      // Clean up previous yt-dlp and ffmpeg processes
      if (this.resource) {
        if (this.resource.ytdlpProcess) {
          try { this.resource.ytdlpProcess.kill(); } catch (e) {}
        }
        if (this.resource.ffmpegProcess) {
          try { this.resource.ffmpegProcess.kill(); } catch (e) {}
        }
      }

      // Handle looping
      if (this.loopMode === 'track' && this.currentTrack) {
        this.playTrack(this.currentTrack);
        return;
      }

      if (this.loopMode === 'queue' && this.currentTrack) {
        this.tracks.push(this.currentTrack);
      }

      // Play next song in queue
      if (this.tracks.length > 0) {
        const next = this.tracks.shift();
        this.playTrack(next);
      } else {
        this.currentTrack = null;
        this.finishQueue();
      }
    });

    this.player.on('error', (err) => {
      console.error(`[AudioPlayer Error in Guild ${this.guild.id}]:`, err.message);
      this.textChannel?.send({
        content: `⚠️ Audio playback warning: ${err.message}. Transitioning to next track...`
      }).catch(() => {});
      this.skip();
    });
  }

  async connect(voiceChannel) {
    this.voiceChannel = voiceChannel;
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator
    });

    this.connection.subscribe(this.player);

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        if (!this.mode247) {
          this.destroy();
        } else {
          setTimeout(() => {
            if (this.voiceChannel) {
              this.connect(this.voiceChannel).catch(() => {});
            }
          }, 3000);
        }
      }
    });

    if (this.mode247) {
      db.set247(this.guild.id, true, voiceChannel.id, this.textChannel?.id);
    }
  }

  async enqueue(tracks, requester) {
    if (Array.isArray(tracks)) {
      this.tracks.push(...tracks);
    } else {
      this.tracks.push(tracks);
    }

    if (!this.currentTrack && this.tracks.length > 0) {
      const next = this.tracks.shift();
      await this.playTrack(next);
    }
  }

  async playTrack(track) {
    try {
      this.currentTrack = track;

      // If track has no URL yet (e.g. from Spotify album/playlist), match audio source dynamically
      if (!track.url) {
        let matchedUrl = await AudioExtractor.matchStudioAudio(track.title, track.author, track.duration);
        if (!matchedUrl) {
          const fallbackQuery = track.searchQuery || `${track.title} ${track.author || ''}`;
          const matches = await AudioExtractor.searchYouTubeOnly(fallbackQuery, 1);
          if (matches.length > 0 && matches[0].url) {
            matchedUrl = matches[0].url;
            if (!track.duration && matches[0].duration) track.duration = matches[0].duration;
          }
        }

        if (matchedUrl) {
          track.url = matchedUrl;
        } else {
          throw new Error(`Could not find audio source for "${track.title}"`);
        }
      }

      // Clean up previous streaming processes if any
      if (this.resource) {
        if (this.resource.ytdlpProcess) {
          try { this.resource.ytdlpProcess.kill(); } catch (e) {}
        }
        if (this.resource.ffmpegProcess) {
          try { this.resource.ffmpegProcess.kill(); } catch (e) {}
        }
      }

      // Stream directly via pipe: yt-dlp -> FFmpeg -> Discord Voice (Audiophile 48kHz Opus)
      this.resource = AudioStreamer.createResourceFromSource(track.url, this.volume);
      this.player.play(this.resource);
    } catch (err) {
      console.error(`[Playback Error in ${this.guild.id}]:`, err.message);
      if (this.textChannel) {
        this.textChannel.send({
          content: `❌ Failed to stream **${track.title}**: ${err.message}. Trying next track...`
        }).catch(() => {});
      }
      if (this.tracks.length > 0) {
        const next = this.tracks.shift();
        this.playTrack(next);
      } else {
        this.finishQueue();
      }
    }
  }

  getCurrentPlaybackSeconds() {
    if (!this.playbackStart || this.paused) return 0;
    return Math.floor((Date.now() - this.playbackStart) / 1000);
  }

  /**
   * Generates and sends a single standalone Miniplayer card ONE TIME ONLY
   */
  async sendMiniplayer() {
    if (!this.currentTrack || !this.textChannel) return;

    // Delete previous miniplayer message if it exists to ensure only 1 single card is present
    if (this.miniplayerMessage) {
      this.miniplayerMessage.delete().catch(() => {});
      this.miniplayerMessage = null;
    }

    try {
      // Build the single card image payload
      const payload = await MiniplayerUI.buildMessagePayload(this, this.currentTrack, 0);
      this.miniplayerMessage = await SafeMessenger.send(this.textChannel, payload);
    } catch (e) {
      console.error('[sendMiniplayer Error]:', e.message);
    }
  }

  /**
   * Updates ONLY the button components (zero file re-attachments)
   */
  async updateComponentsOnly() {
    if (!this.miniplayerMessage) return;
    try {
      await this.miniplayerMessage.edit({
        components: MiniplayerUI.buildComponents(this)
      });
    } catch (e) {}
  }

  pause() {
    if (!this.paused) {
      this.player.pause();
      this.paused = true;
      this.updateComponentsOnly();
      return true;
    }
    return false;
  }

  resume() {
    if (this.paused) {
      this.player.unpause();
      this.paused = false;
      this.updateComponentsOnly();
      return true;
    }
    return false;
  }

  skip() {
    this.player.stop();
  }

  async replay() {
    if (!this.currentTrack) return false;
    await this.playTrack(this.currentTrack);
    return true;
  }

  stop() {
    this.tracks = [];
    this.currentTrack = null;
    this.player.stop();
    this.finishQueue();
    if (!this.mode247) {
      this.destroy();
    }
  }

  setLoop(mode) {
    this.loopMode = mode;
    this.updateComponentsOnly();
    return this.loopMode;
  }

  cycleLoop() {
    if (this.loopMode === 'off') this.loopMode = 'track';
    else if (this.loopMode === 'track') this.loopMode = 'queue';
    else this.loopMode = 'off';
    this.updateComponentsOnly();
    return this.loopMode;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(150, vol));
    db.setVolume(this.guild.id, this.volume);
    this.updateComponentsOnly();
    return this.volume;
  }

  shuffle() {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
    this.updateComponentsOnly();
  }

  set247(enabled, channel = null) {
    this.mode247 = enabled;
    const vcId = channel ? channel.id : (this.voiceChannel ? this.voiceChannel.id : null);
    db.set247(this.guild.id, enabled, vcId, this.textChannel?.id);
    this.updateComponentsOnly();
    if (!enabled && this.tracks.length === 0 && !this.currentTrack) {
      this.startIdleTimer();
    } else {
      this.clearIdleTimer();
    }
    return this.mode247;
  }

  finishQueue() {
    if (this.voiceChannel) {
      setVoiceChannelStatus(this.manager.client, this.voiceChannel.id, '');
    }

    if (this.miniplayerMessage) {
      this.miniplayerMessage.edit({
        components: MiniplayerUI.buildDisabledComponents()
      }).catch(() => {});
    }

    if (!this.mode247) {
      this.startIdleTimer();
    }
  }

  startIdleTimer() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (!this.mode247 && !this.currentTrack && this.tracks.length === 0) {
        this.destroy();
      }
    }, 120000);
  }

  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  destroy() {
    this.clearIdleTimer();

    if (this.voiceChannel) {
      setVoiceChannelStatus(this.manager.client, this.voiceChannel.id, '');
    }

    this.tracks = [];
    this.currentTrack = null;

    if (this.resource) {
      if (this.resource.ytdlpProcess) {
        try { this.resource.ytdlpProcess.kill(); } catch (e) {}
      }
      if (this.resource.ffmpegProcess) {
        try { this.resource.ffmpegProcess.kill(); } catch (e) {}
      }
    }

    try {
      this.player.stop(true);
    } catch (e) {}

    try {
      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
    } catch (e) {}

    this.manager.remove(this.guild.id);
  }
}

module.exports = GuildQueue;
