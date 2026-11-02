const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const CardGenerator = require('./cardGenerator');
const config = require('../config');

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
  const sec = Math.floor(seconds % 60);
  const min = Math.floor((seconds / 60) % 60);
  const hrs = Math.floor(seconds / 3600);
  const pad = (n) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(min)}:${pad(sec)}`;
  }
  return `${pad(min)}:${pad(sec)}`;
}

class MiniplayerUI {
  /**
   * Builds the message payload with automatic permission-adaptive fallbacks
   */
  static async buildMessagePayload(queue, track, currentSec = 0) {
    const channel = queue.textChannel;
    let canAttach = true;
    let canEmbed = true;

    if (channel && channel.guild) {
      const me = channel.guild.members.me;
      const perms = channel.permissionsFor(me);
      if (perms) {
        canAttach = perms.has(PermissionFlagsBits.AttachFiles);
        canEmbed = perms.has(PermissionFlagsBits.EmbedLinks);
      }
    }

    const components = this.buildComponents(queue);

    // 1. Primary: High-res Glassmorphism Canvas Image Card Only (No embed wrapper)
    if (canAttach) {
      try {
        const buffer = await CardGenerator.renderMiniplayer(queue, track, currentSec);
        const attachment = new AttachmentBuilder(buffer, { name: 'miniplayer.png' });

        return {
          content: null,
          embeds: [], // Embed removed! Card only.
          files: [attachment],
          components
        };
      } catch (err) {
        console.error('[Card Generator Fallback]:', err.message);
      }
    }

    // 2. Secondary: Rich Embed fallback if AttachFiles is missing
    if (canEmbed) {
      const progressBar = `${formatDuration(currentSec)} ──────⚪────────── ${formatDuration(track.duration)}`;
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setAuthor({ name: 'W A V E M U S I C   •   P L A Y I N G' })
        .setTitle(track.title)
        .setURL(track.url || 'https://discord.com')
        .setDescription(
          `**Artist:** ${track.author}\n\n` +
          `\`${progressBar}\`\n\n` +
          `**Volume:** ${queue.volume}%  •  **24/7:** ${queue.mode247 ? 'Enabled' : 'Disabled'}  •  **Audio:** 48kHz Opus\n\n` +
          `*💡 Tip: Grant "Attach Files" permission to WaveMusic to unlock the glassmorphism image card!*`
        );

      if (track.thumbnail) {
        embed.setThumbnail(track.thumbnail);
      }

      return {
        embeds: [embed],
        files: [],
        components
      };
    }

    // 3. Tertiary: Clean text fallback if neither AttachFiles nor EmbedLinks is allowed
    const progressBar = `${formatDuration(currentSec)} ──────⚪────────── ${formatDuration(track.duration)}`;
    return {
      content:
        `🎶 **Now Playing: ${track.title}** (${track.author})\n` +
        `\`${progressBar}\`\n` +
        `*Requested by <@${track.requestedBy?.id}> • Volume: ${queue.volume}%*\n` +
        `*(Grant "Attach Files" & "Embed Links" in this channel to view the glassmorphism Miniplayer card!)*`,
      embeds: [],
      files: [],
      components
    };
  }

  /**
   * Generates simple embedded buttons with NO colors (ButtonStyle.Secondary) and NO emojis
   */
  static buildComponents(queue) {
    const isPaused = queue.paused;
    const loopMode = queue.loopMode;
    const is247 = queue.mode247;

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('wm_play_pause')
        .setLabel(isPaused ? 'Resume' : 'Pause')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('wm_skip')
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('wm_loop')
        .setLabel(
          loopMode === 'track'
            ? 'Loop: Track'
            : loopMode === 'queue'
            ? 'Loop: Queue'
            : 'Loop: Off'
        )
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('wm_stop')
        .setLabel('Stop')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('wm_queue')
        .setLabel('Queue')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('wm_shuffle')
        .setLabel('Shuffle')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('wm_lyrics')
        .setLabel('Lyrics')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('wm_vol_down')
        .setLabel('Vol -')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('wm_vol_up')
        .setLabel('Vol +')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
  }

  static buildDisabledComponents() {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('wm_disabled_status')
          .setLabel('Playback Ended')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      )
    ];
  }
}

module.exports = MiniplayerUI;
