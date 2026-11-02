const { Collection, EmbedBuilder } = require('discord.js');
const GuildQueue = require('./GuildQueue');
const db = require('../database/db');
const LyricsFetcher = require('../audio/lyrics');
const config = require('../config');

class MusicManager {
  constructor(client) {
    this.client = client;
    this.queues = new Collection();
  }

  get(guildId) {
    return this.queues.get(guildId);
  }

  getOrCreate(guild, textChannel) {
    let queue = this.queues.get(guild.id);
    if (!queue) {
      queue = new GuildQueue(this, guild, textChannel);
      this.queues.set(guild.id, queue);
    } else if (textChannel) {
      queue.textChannel = textChannel;
    }
    return queue;
  }

  remove(guildId) {
    this.queues.delete(guildId);
  }

  /**
   * Reconnects to all 24/7 channels stored in the database on bot ready
   */
  async restore247Connections() {
    const list = db.getAll247();
    for (const item of list) {
      try {
        const guild = this.client.guilds.cache.get(item.guild_id);
        if (!guild) continue;

        const voiceChannel = guild.channels.cache.get(item.voice_channel_id);
        const textChannel = guild.channels.cache.get(item.text_channel_id) || guild.channels.cache.find(c => c.isTextBased());
        if (voiceChannel && voiceChannel.isVoiceBased()) {
          const queue = this.getOrCreate(guild, textChannel);
          await queue.connect(voiceChannel);
          console.log(`[24/7 Auto-Join] Reconnected to ${voiceChannel.name} in guild: ${guild.name}`);
        }
      } catch (err) {
        console.error(`[24/7 Reconnect Failed for Guild ${item.guild_id}]:`, err.message);
      }
    }
  }

  /**
   * Handles button clicks from the Miniplayer UI (All simple embedded neutral buttons)
   */
  async handleButtonInteraction(interaction) {
    const customId = interaction.customId;
    if (!customId.startsWith('wm_')) return false;

    const guild = interaction.guild;
    const member = interaction.member;
    const queue = this.get(guild.id);

    // Verify member is in the same voice channel
    if (!member.voice.channel || (queue && queue.voiceChannel && member.voice.channel.id !== queue.voiceChannel.id)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('You must be in the same voice channel as WaveMusic to use player controls.')
        ],
        ephemeral: true
      });
    }

    if (!queue) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('No active playback found in this server.')
        ],
        ephemeral: true
      });
    }

    switch (customId) {
      case 'wm_play_pause': {
        if (queue.paused) {
          queue.resume();
        } else {
          queue.pause();
        }
        await interaction.deferUpdate().catch(() => {});
        await queue.updateComponentsOnly();
        break;
      }

      case 'wm_skip': {
        queue.skip();
        await interaction.deferUpdate().catch(() => {});
        break;
      }

      case 'wm_replay': {
        if (!queue.currentTrack) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')],
            ephemeral: true
          });
        }
        await interaction.deferUpdate().catch(() => {});
        await queue.replay();
        break;
      }

      case 'wm_loop': {
        queue.cycleLoop();
        await interaction.deferUpdate().catch(() => {});
        await queue.updateComponentsOnly();
        break;
      }

      case 'wm_stop': {
        queue.stop();
        await interaction.deferUpdate().catch(() => {});
        break;
      }

      case 'wm_vol_down': {
        queue.setVolume(queue.volume - 10);
        await interaction.deferUpdate().catch(() => {});
        await queue.updateComponentsOnly();
        break;
      }

      case 'wm_vol_up': {
        queue.setVolume(queue.volume + 10);
        await interaction.deferUpdate().catch(() => {});
        await queue.updateComponentsOnly();
        break;
      }

      case 'wm_shuffle': {
        if (queue.tracks.length < 2) {
          return interaction.reply({
            content: 'Need at least 2 tracks in queue to shuffle.',
            ephemeral: true
          });
        }
        queue.shuffle();
        await interaction.deferUpdate().catch(() => {});
        await queue.updateComponentsOnly();
        break;
      }

      case 'wm_queue': {
        const current = queue.currentTrack;
        const tracks = queue.tracks;
        if (!current && tracks.length === 0) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription('Queue is empty.')],
            ephemeral: true
          });
        }

        let desc = `**Now Playing:**\n[${current.title}](${current.url || '#'}) [${current.durationFormatted}] • <@${current.requestedBy?.id}>\n\n**Up Next:**\n`;
        if (tracks.length === 0) {
          desc += '*No upcoming tracks in queue.*';
        } else {
          const slice = tracks.slice(0, 10);
          desc += slice.map((t, i) => `\`${i + 1}.\` [${t.title}](${t.url || '#'}) [${t.durationFormatted}] • <@${t.requestedBy?.id}>`).join('\n');
          if (tracks.length > 10) {
            desc += `\n*... and ${tracks.length - 10} more track(s)*`;
          }
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.primary)
              .setAuthor({ name: 'W A V E M U S I C   •   Q U E U E' })
              .setTitle('Server Music Queue')
              .setDescription(desc)
          ],
          ephemeral: true
        });
        break;
      }

      case 'wm_lyrics': {
        await interaction.deferReply({ ephemeral: true });
        const track = queue.currentTrack;
        if (!track) {
          return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')]
          });
        }

        const lyricsData = await LyricsFetcher.getLyrics(track.title, track.author);
        if (!lyricsData || !lyricsData.lyrics) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.warning)
                .setDescription(`No lyrics found for **${track.title}**.`)
            ]
          });
        }

        const chunk = lyricsData.lyrics.length > 4000 ? lyricsData.lyrics.slice(0, 3950) + '\n\n*(Lyrics truncated)*' : lyricsData.lyrics;
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.primary)
              .setAuthor({ name: `Lyrics • ${lyricsData.artist}` })
              .setTitle(lyricsData.title)
              .setDescription(chunk)
              .setFooter({ text: `Source: ${lyricsData.source} • WaveMusic` })
          ]
        });
        break;
      }
    }

    return true;
  }
}

module.exports = MusicManager;
