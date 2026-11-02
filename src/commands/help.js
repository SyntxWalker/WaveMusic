const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const config = require('../config');

module.exports = {
  name: 'help',
  description: 'Display all commands and features of WaveMusic',
  aliases: ['h', 'commands'],
  slashData: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all WaveMusic commands and features'),

  async executeSlash(interaction, client) {
    const prefix = db.getPrefix(interaction.guild.id);
    const embed = this.buildHelpEmbed(prefix, client);
    const row = this.buildHelpButtons();
    return interaction.reply({ embeds: [embed], components: [row] });
  },

  async executePrefix(message, args, client) {
    const prefix = db.getPrefix(message.guild.id);
    const embed = this.buildHelpEmbed(prefix, client);
    const row = this.buildHelpButtons();
    return message.reply({ embeds: [embed], components: [row] });
  },

  buildHelpEmbed(prefix, client) {
    return new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({
        name: 'W A V E M U S I C   •   C O M M A N D S',
        iconURL: client.user.displayAvatarURL()
      })
      .setTitle('WaveMusic Command Guide')
      .setDescription(
        'Minimalistic, high-fidelity music bot with 48kHz lossless streaming, glassmorphism UI, 24/7 channel locking, and zero-emoji controls.\n\n' +
        `**Server Prefix:** \`${prefix}\`  •  **Slash Commands:** \`/\` Supported`
      )
      .addFields(
        {
          name: 'Core Music Playback',
          value:
            `\`${prefix}play <song/url>\` (/play) - Play from YouTube, Spotify, or name\n` +
            `\`${prefix}search <query>\` (/search) - Search & choose from top 5 tracks\n` +
            `\`${prefix}replay\` (/replay) - Restart current song from beginning\n` +
            `\`${prefix}pause\` (/pause) - Pause current playback\n` +
            `\`${prefix}resume\` (/resume) - Resume paused track\n` +
            `\`${prefix}skip\` (/skip) - Skip current song\n` +
            `\`${prefix}stop\` (/stop) - Stop playback and clear queue`
        },
        {
          name: 'Queue & Audio Control',
          value:
            `\`${prefix}queue\` (/queue) - View paginated server queue\n` +
            `\`${prefix}nowplaying\` (/nowplaying) - Show current Miniplayer embed\n` +
            `\`${prefix}loop <off|track|queue>\` (/loop) - Set or cycle repeat mode\n` +
            `\`${prefix}volume <0-150>\` (/volume) - Adjust audio volume\n` +
            `\`${prefix}shuffle\` (/shuffle) - Randomize queue order\n` +
            `\`${prefix}clear\` (/clear) - Clear upcoming songs in queue`
        },
        {
          name: 'Features & Server Management',
          value:
            `\`${prefix}247\` (/247) - Lock WaveMusic into your VC 24/7\n` +
            `\`${prefix}lyrics [song]\` (/lyrics) - Fetch synced/plain lyrics with glass embed\n` +
            `\`${prefix}prefix <symbol>\` (/prefix) - Customize bot prefix for this server\n` +
            `\`${prefix}stats\` (/stats) - View bot latency, uptime, and audio stats`
        }
      )
      .setFooter({ text: 'Miniplayer buttons are clean text without emojis • WaveMusic Hi-Fi Engine' })
      .setTimestamp();
  },

  buildHelpButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Invite WaveMusic')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/oauth2/authorize?client_id=${config.clientId}&permissions=36768832&scope=bot%20applications.commands`),
      new ButtonBuilder()
        .setLabel('Web Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`http://localhost:${config.port}`)
    );
  }
};
